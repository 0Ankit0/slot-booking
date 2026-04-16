import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_constants.dart';
import '../../data/models/resource.dart';
import '../providers/resource_provider.dart';
import '../widgets/resource_formatters.dart';
import 'booking_checkout_page.dart';

class ResourceDetailPage extends ConsumerStatefulWidget {
  final String resourceId;

  const ResourceDetailPage({super.key, required this.resourceId});

  @override
  ConsumerState<ResourceDetailPage> createState() => _ResourceDetailPageState();
}

class _ResourceDetailPageState extends ConsumerState<ResourceDetailPage> {
  late DateTime _selectedDay;
  String? _selectedSlotId;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateUtils.dateOnly(DateTime.now());
  }

  ResourceSlotQuery _slotQueryFor(Resource resource) {
    final dayStart = DateTime(
      _selectedDay.year,
      _selectedDay.month,
      _selectedDay.day,
    );
    return ResourceSlotQuery(
      resourceId: resource.id,
      fromTs: dayStart,
      toTs: dayStart.add(const Duration(days: 1)),
    );
  }

  Future<void> _refresh(Resource resource) async {
    ref.invalidate(resourceDetailProvider(widget.resourceId));
    ref.invalidate(resourceSlotsProvider(_slotQueryFor(resource)));
    ref.invalidate(marketplaceProviderProvider(resource.providerId));
    try {
      await ref.read(resourceDetailProvider(widget.resourceId).future);
    } catch (_) {
      // The provider renders any resulting error state.
    }
  }

  @override
  Widget build(BuildContext context) {
    final resourceAsync = ref.watch(resourceDetailProvider(widget.resourceId));

    return resourceAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator.adaptive()),
      ),
      error: (error, _) => Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 40),
                const SizedBox(height: 12),
                const Text(
                  'We could not load this resource.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => ref.invalidate(
                    resourceDetailProvider(widget.resourceId),
                  ),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
      data: (resource) {
        final providerAsync = ref.watch(
          marketplaceProviderProvider(resource.providerId),
        );
        final slotQuery = _slotQueryFor(resource);
        final slotsAsync = ref.watch(resourceSlotsProvider(slotQuery));
        ResourceSlot? selectedSlot;
        final slots = slotsAsync.valueOrNull;
        if (slots != null) {
          for (final slot in slots) {
            if (slot.id == _selectedSlotId) {
              selectedSlot = slot;
              break;
            }
          }
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(resource.name),
          ),
          body: RefreshIndicator(
            onRefresh: () => _refresh(resource),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                _ResourceSummaryCard(
                  resource: resource,
                  providerName: providerAsync.valueOrNull?.name,
                ),
                const SizedBox(height: 20),
                Text(
                  'Pick a day',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Choose a date first, then select one of the live slots below.',
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 92,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: 7,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final day = DateUtils.dateOnly(
                        DateTime.now().add(Duration(days: index)),
                      );
                      final isSelected = day == _selectedDay;
                      final colorScheme = Theme.of(context).colorScheme;
                      return InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () {
                          setState(() {
                            _selectedDay = day;
                            _selectedSlotId = null;
                          });
                        },
                        child: Ink(
                          width: 88,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? colorScheme.primaryContainer
                                : colorScheme.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: isSelected
                                  ? colorScheme.primary
                                  : colorScheme.outlineVariant,
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                formatDayShort(day),
                                style: Theme.of(context)
                                    .textTheme
                                    .labelLarge
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                DateFormat('d').format(day),
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              Text(formatMonthDay(day)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Available slots',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Showing ${DateFormat('EEEE, MMM d').format(_selectedDay)} in your local time.',
                ),
                const SizedBox(height: 12),
                slotsAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(child: CircularProgressIndicator.adaptive()),
                  ),
                  error: (error, _) => Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Slot availability is unavailable right now.',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Text(error.toString()),
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            onPressed: () => ref.invalidate(
                              resourceSlotsProvider(slotQuery),
                            ),
                            icon: const Icon(Icons.refresh),
                            label: const Text('Reload slots'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  data: (slots) {
                    if (slots.isEmpty) {
                      return const _NoSlotsState();
                    }
                    return Column(
                      children: slots
                          .map(
                            (slot) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _SlotCard(
                                slot: slot,
                                selected: _selectedSlotId == slot.id,
                                onTap: slot.isOpen
                                    ? () => setState(
                                        () => _selectedSlotId = slot.id)
                                    : null,
                              ),
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
                if (selectedSlot != null) ...[
                  const SizedBox(height: 8),
                  Card(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Selected slot',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Text(formatSlotRange(selectedSlot)),
                          const SizedBox(height: 4),
                          Text(
                            '${selectedSlot.durationMinutes} min · ${formatCurrencyMinor(resource.basePriceMinor, resource.currency)}',
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: () => context.push(
                                '${AppConstants.resourcesRoute}/${resource.id}/checkout',
                                extra: BookingCheckoutPageArgs(
                                  resource: resource,
                                  slot: selectedSlot!,
                                ),
                              ),
                              icon: const Icon(Icons.arrow_forward),
                              label: const Text('Continue to checkout'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ResourceSummaryCard extends StatelessWidget {
  final Resource resource;
  final String? providerName;

  const _ResourceSummaryCard({required this.resource, this.providerName});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: colorScheme.primaryContainer,
                  child: Icon(
                    resourceCategoryIcon(resource.category),
                    color: colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        resource.name,
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        providerName == null
                            ? 'Provider ${resource.providerId}'
                            : 'Hosted by $providerName',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(resource.description.trim().isEmpty
                ? 'This listing is ready to book right away. Choose a day below to see the currently generated slots.'
                : resource.description.trim()),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _DetailPill(
                  icon: Icons.sell_outlined,
                  label: _titleCase(resource.category),
                ),
                _DetailPill(
                  icon: Icons.payments_outlined,
                  label: formatCurrencyMinor(
                    resource.basePriceMinor,
                    resource.currency,
                  ),
                ),
                _DetailPill(
                  icon: Icons.groups_outlined,
                  label: 'Up to ${resource.maxGroupSize}',
                ),
                _DetailPill(
                  icon: Icons.language_outlined,
                  label: resource.timezone,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _DetailPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
    );
  }
}

class _SlotCard extends StatelessWidget {
  final ResourceSlot slot;
  final bool selected;
  final VoidCallback? onTap;

  const _SlotCard({
    required this.slot,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final accentColor = selected
        ? colorScheme.primary
        : slot.isOpen
            ? Colors.green
            : colorScheme.outline;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 4,
                height: 60,
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      formatSlotRange(slot),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text('${slot.durationMinutes} minute session'),
                    if (slot.holdExpiresAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Hold expires ${DateFormat('h:mm a').format(slot.holdExpiresAt!.toLocal())}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected
                          ? colorScheme.primaryContainer
                          : colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      slotStatusLabel(slot),
                      style: TextStyle(
                        color: selected ? colorScheme.primary : null,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Icon(
                    selected
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    color: selected ? colorScheme.primary : colorScheme.outline,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NoSlotsState extends StatelessWidget {
  const _NoSlotsState();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              Icons.event_busy_outlined,
              size: 44,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              'No slots available for this day',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Try another day to keep exploring the upcoming availability window.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

String _titleCase(String value) {
  if (value.trim().isEmpty) {
    return 'General';
  }
  return value
      .split(RegExp(r'[\s_-]+'))
      .where((part) => part.isNotEmpty)
      .map(
        (part) => '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}',
      )
      .join(' ');
}
