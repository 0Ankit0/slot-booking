import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/analytics/analytics_events.dart';
import '../../../../core/analytics/analytics_provider.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../shared/widgets/error_snackbar.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../bookings/data/models/booking.dart';
import '../../../bookings/presentation/providers/booking_provider.dart';
import '../../../payments/data/models/payment.dart';
import '../../../payments/presentation/pages/payment_utils.dart';
import '../../../payments/presentation/pages/payment_webview_page.dart';
import '../../../payments/presentation/providers/payment_provider.dart';
import '../../data/models/resource.dart';
import '../providers/resource_provider.dart';
import '../widgets/resource_formatters.dart';

class BookingCheckoutPageArgs {
  final Resource resource;
  final ResourceSlot slot;

  const BookingCheckoutPageArgs({required this.resource, required this.slot});
}

class BookingCheckoutPage extends ConsumerStatefulWidget {
  final BookingCheckoutPageArgs args;

  const BookingCheckoutPage({super.key, required this.args});

  @override
  ConsumerState<BookingCheckoutPage> createState() =>
      _BookingCheckoutPageState();
}

class _BookingCheckoutPageState extends ConsumerState<BookingCheckoutPage> {
  late final Future<BookingQuoteResponse> _quoteFuture;
  PaymentProvider? _selectedProvider;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _quoteFuture = ref.read(bookingRepositoryProvider).quoteBooking(
          BookingQuoteRequest(
            tenantId: widget.args.resource.tenantId,
            resourceId: widget.args.resource.id,
            amountMinor: widget.args.resource.basePriceMinor,
          ),
        );
  }

  String? _providerAvailabilityReason(
    PaymentProvider provider,
    BookingQuoteResponse quote,
  ) {
    final currency = widget.args.resource.currency.toUpperCase();
    if ((provider == PaymentProvider.khalti ||
            provider == PaymentProvider.esewa) &&
        currency != 'NPR') {
      return '${provider.displayName} supports NPR checkout only.';
    }
    if (provider == PaymentProvider.khalti && quote.finalAmountMinor < 1000) {
      return 'Khalti requires at least NPR 10.00.';
    }
    if (provider == PaymentProvider.esewa &&
        quote.finalAmountMinor % 100 != 0) {
      return 'eSewa requires a whole NPR amount.';
    }
    return null;
  }

  PaymentProvider? _firstCompatibleProvider(
    Iterable<PaymentProvider> providers,
    BookingQuoteResponse quote,
  ) {
    for (final provider in providers) {
      if (_providerAvailabilityReason(provider, quote) == null) {
        return provider;
      }
    }
    return null;
  }

  void _selectDefaultProvider(
    Iterable<PaymentProvider> providers,
    BookingQuoteResponse quote,
  ) {
    if (_selectedProvider != null) {
      return;
    }
    final defaultProvider = _firstCompatibleProvider(providers, quote);
    if (defaultProvider == null) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _selectedProvider != null) {
        return;
      }
      setState(() => _selectedProvider = defaultProvider);
    });
  }

  int _providerAmount(PaymentProvider provider, BookingQuoteResponse quote) {
    switch (provider) {
      case PaymentProvider.esewa:
        return (quote.finalAmountMinor / 100).round();
      case PaymentProvider.khalti:
      case PaymentProvider.stripe:
      case PaymentProvider.paypal:
        return quote.finalAmountMinor;
    }
  }

  Future<void> _releaseSlotSafely(String slotId) async {
    try {
      await ref.read(resourceRepositoryProvider).releaseSlot(slotId);
    } catch (_) {
      // Best-effort cleanup only.
    }
  }

  Future<void> _cancelBookingSafely(String bookingId) async {
    try {
      await ref.read(bookingRepositoryProvider).cancelBooking(bookingId);
      ref.invalidate(myBookingsProvider);
    } catch (_) {
      // Best-effort cleanup only.
    }
  }

  Future<PaymentResult?> _openPaymentFlow(
    InitiatePaymentResponse response,
  ) async {
    if (kIsWeb) {
      await _handleWebPayment(response);
      return null;
    }

    return Navigator.of(context).push<PaymentResult>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => UncontrolledProviderScope(
          container: ProviderScope.containerOf(context),
          child: PaymentWebViewPage(
            provider: response.provider,
            paymentUrl: response.paymentUrl,
            esewaFormAction: response.extra?['form_action'] as String?,
            esewaFormFields: response.extra?['form_fields'] is Map
                ? Map<String, dynamic>.from(
                    response.extra?['form_fields'] as Map)
                : null,
          ),
        ),
      ),
    );
  }

  Future<void> _handleWebPayment(InitiatePaymentResponse response) async {
    if (response.provider == PaymentProvider.esewa) {
      final formAction = response.extra?['form_action'] as String?;
      final formFields =
          response.extra?['form_fields'] as Map<String, dynamic>?;
      if (formAction == null || formFields == null) {
        throw Exception('eSewa checkout is missing its form payload.');
      }
      await submitEsewaFormWeb(formAction, formFields);
      return;
    }

    final url = response.paymentUrl;
    if (url == null || url.isEmpty) {
      throw Exception('The payment provider did not return a checkout URL.');
    }
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  Future<void> _startCheckout(BookingQuoteResponse quote) async {
    final provider = _selectedProvider;
    if (provider == null) {
      showErrorSnackbar(context, 'Choose a payment provider to continue.');
      return;
    }

    final availabilityReason = _providerAvailabilityReason(provider, quote);
    if (availabilityReason != null) {
      showErrorSnackbar(context, availabilityReason);
      return;
    }

    setState(() => _submitting = true);

    final user = ref.read(authNotifierProvider).valueOrNull?.user;
    final resourceRepository = ref.read(resourceRepositoryProvider);
    final bookingRepository = ref.read(bookingRepositoryProvider);
    final paymentRepository = ref.read(paymentRepositoryProvider);

    Booking? createdBooking;
    var slotHeld = false;

    try {
      await resourceRepository.holdSlot(widget.args.slot.id);
      slotHeld = true;

      createdBooking = await bookingRepository.createBooking(
        BookingCreateRequest(
          tenantId: widget.args.resource.tenantId,
          providerId: widget.args.resource.providerId,
          resourceId: widget.args.resource.id,
          slotId: widget.args.slot.id,
          amountMinor: quote.finalAmountMinor,
          currency: widget.args.resource.currency,
          notes:
              'mobile_checkout | slot=${widget.args.slot.id} | starts_at=${widget.args.slot.startsAt.toUtc().toIso8601String()}',
        ),
        idempotencyKey:
            'mobile-booking-${widget.args.slot.id}-${DateTime.now().microsecondsSinceEpoch}',
        requestId: 'mobile-request-${DateTime.now().millisecondsSinceEpoch}',
      );
      slotHeld = false;
      ref.invalidate(myBookingsProvider);

      final paymentResponse = await paymentRepository.initiatePayment(
        InitiatePaymentRequest(
          provider: provider,
          amount: _providerAmount(provider, quote),
          purchaseOrderId: 'booking:${createdBooking.id}',
          purchaseOrderName: widget.args.resource.name,
          bookingId: createdBooking.id,
          tenantId: widget.args.resource.tenantId,
          providerId: widget.args.resource.providerId,
          returnUrl: 'http://localhost:3000/payment-callback',
          websiteUrl: 'http://localhost:3000',
          customerName: user?.displayName,
          customerEmail: user?.email,
          customerPhone: user?.phone,
        ),
      );

      ref.read(analyticsServiceProvider).capture(
        PaymentAnalyticsEvents.paymentInitiated,
        {
          'provider': provider.name,
          'amount_minor': quote.finalAmountMinor,
          'booking_id': createdBooking.id,
          'resource_id': widget.args.resource.id,
        },
      );

      if (!mounted) {
        return;
      }

      final paymentResult = await _openPaymentFlow(paymentResponse);
      if (!mounted) {
        return;
      }

      if (kIsWeb) {
        showSuccessSnackbar(
          context,
          'Checkout opened in a new tab. Finish payment there, then refresh your bookings.',
        );
        context.go(AppConstants.bookingsRoute);
        return;
      }

      if (paymentResult?.success == true) {
        ref.read(analyticsServiceProvider).capture(
          PaymentAnalyticsEvents.paymentCompleted,
          {
            'provider': provider.name,
            'booking_id': createdBooking.id,
            'resource_id': widget.args.resource.id,
          },
        );
        ref.invalidate(myBookingsProvider);
        ref.invalidate(transactionsProvider);
        showSuccessSnackbar(
          context,
          'Payment completed. Your booking is ready to go.',
        );
        context.go(AppConstants.bookingsRoute);
        return;
      }

      await _cancelBookingSafely(createdBooking.id);
      ref.read(analyticsServiceProvider).capture(
        PaymentAnalyticsEvents.paymentFailed,
        {
          'provider': provider.name,
          'booking_id': createdBooking.id,
          'resource_id': widget.args.resource.id,
        },
      );
      if (!mounted) {
        return;
      }
      showErrorSnackbar(
        context,
        paymentResult?.message ??
            'Payment was not completed. Your booking has been released.',
      );
    } catch (e) {
      if (createdBooking != null) {
        await _cancelBookingSafely(createdBooking.id);
      } else if (slotHeld) {
        await _releaseSlotSafely(widget.args.slot.id);
      }
      if (!mounted) {
        return;
      }
      showErrorSnackbar(context, e.toString());
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final providerName = ref
        .watch(marketplaceProviderProvider(widget.args.resource.providerId))
        .valueOrNull
        ?.name;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
      ),
      body: FutureBuilder<BookingQuoteResponse>(
        future: _quoteFuture,
        builder: (context, quoteSnapshot) {
          final quote = quoteSnapshot.data;
          final paymentProvidersAsync = ref.watch(paymentProvidersProvider);
          final providerList = paymentProvidersAsync.valueOrNull
                  ?.map(PaymentProvider.fromString)
                  .toList() ??
              const <PaymentProvider>[];

          if (quote != null && providerList.isNotEmpty) {
            _selectDefaultProvider(providerList, quote);
          }

          return ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.args.resource.name,
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                      const SizedBox(height: 6),
                      Text(providerName == null
                          ? 'Provider ${widget.args.resource.providerId}'
                          : 'Hosted by $providerName'),
                      const SizedBox(height: 16),
                      _CheckoutRow(
                        icon: Icons.event_available_outlined,
                        label: 'Slot',
                        value: formatSlotRange(widget.args.slot),
                      ),
                      const SizedBox(height: 12),
                      _CheckoutRow(
                        icon: Icons.schedule_outlined,
                        label: 'Duration',
                        value: '${widget.args.slot.durationMinutes} minutes',
                      ),
                      const SizedBox(height: 12),
                      _CheckoutRow(
                        icon: Icons.language_outlined,
                        label: 'Timezone',
                        value: widget.args.resource.timezone,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Booking total',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 10),
              if (quoteSnapshot.connectionState == ConnectionState.waiting)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator.adaptive()),
                  ),
                )
              else if (quoteSnapshot.hasError)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'We could not calculate your quote.',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        Text(quoteSnapshot.error.toString()),
                      ],
                    ),
                  ),
                )
              else if (quote != null)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: [
                        _QuoteLine(
                          label: 'Base price',
                          value: formatCurrencyMinor(
                            quote.baseAmountMinor,
                            widget.args.resource.currency,
                          ),
                        ),
                        if (quote.groupSurchargeMinor > 0) ...[
                          const SizedBox(height: 10),
                          _QuoteLine(
                            label: 'Group surcharge',
                            value: formatCurrencyMinor(
                              quote.groupSurchargeMinor,
                              widget.args.resource.currency,
                            ),
                          ),
                        ],
                        if (quote.promoDiscountMinor > 0) ...[
                          const SizedBox(height: 10),
                          _QuoteLine(
                            label: 'Promo discount',
                            value:
                                '-${formatCurrencyMinor(quote.promoDiscountMinor, widget.args.resource.currency)}',
                          ),
                        ],
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14),
                          child: Divider(height: 1),
                        ),
                        _QuoteLine(
                          label: 'Due now',
                          value: formatCurrencyMinor(
                            quote.finalAmountMinor,
                            widget.args.resource.currency,
                          ),
                          emphasized: true,
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 18),
              Text(
                'Choose a payment method',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 10),
              paymentProvidersAsync.when(
                loading: () => const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator.adaptive()),
                  ),
                ),
                error: (error, _) => Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text('Failed to load payment methods: $error'),
                  ),
                ),
                data: (providers) {
                  if (quote == null) {
                    return const SizedBox.shrink();
                  }

                  final parsedProviders =
                      providers.map(PaymentProvider.fromString).toList();
                  final compatibleProviders = parsedProviders
                      .where((provider) =>
                          _providerAvailabilityReason(provider, quote) == null)
                      .toList();

                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: parsedProviders.map((provider) {
                              final reason =
                                  _providerAvailabilityReason(provider, quote);
                              return ChoiceChip(
                                label: Text(provider.displayName),
                                selected: _selectedProvider == provider,
                                onSelected: reason == null
                                    ? (_) => setState(
                                        () => _selectedProvider = provider)
                                    : null,
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 12),
                          if (compatibleProviders.isEmpty)
                            const Text(
                              'No enabled payment methods can process this booking amount yet.',
                            )
                          else if (_selectedProvider != null)
                            Text(
                              'You are checking out with ${_selectedProvider!.displayName}.',
                            ),
                          const SizedBox(height: 12),
                          ...parsedProviders.map((provider) {
                            final reason =
                                _providerAvailabilityReason(provider, quote);
                            if (reason == null) {
                              return const SizedBox.shrink();
                            }
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text(
                                '• ${provider.displayName}: $reason',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 18),
              Card(
                color: Theme.of(context).colorScheme.surfaceContainerLow,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Before you pay',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Your slot is held briefly while we create the booking and launch the provider checkout. If payment is cancelled or fails, the slot is automatically released.',
                      ),
                      const SizedBox(height: 16),
                      LoadingButton(
                        isLoading: _submitting,
                        onPressed:
                            quote == null ? null : () => _startCheckout(quote),
                        icon: Icons.lock_clock_outlined,
                        label: quote == null
                            ? 'Preparing quote…'
                            : 'Reserve & pay ${formatCurrencyMinor(quote.finalAmountMinor, widget.args.resource.currency)}',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CheckoutRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _CheckoutRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 2),
              Text(value),
            ],
          ),
        ),
      ],
    );
  }
}

class _QuoteLine extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasized;

  const _QuoteLine({
    required this.label,
    required this.value,
    this.emphasized = false,
  });

  @override
  Widget build(BuildContext context) {
    final style = emphasized
        ? Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            )
        : Theme.of(context).textTheme.bodyLarge;
    return Row(
      children: [
        Expanded(child: Text(label, style: style)),
        Text(value, style: style),
      ],
    );
  }
}
