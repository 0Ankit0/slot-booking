import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/booking.dart';
import '../providers/booking_provider.dart';

class BookingsPage extends ConsumerWidget {
  const BookingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(myBookingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Bookings')),
      body: bookingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Failed to load bookings: $error')),
        data: (response) {
          if (response.items.isEmpty) {
            return const Center(child: Text('No bookings yet.'));
          }
          return ListView.separated(
            itemCount: response.items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final booking = response.items[index];
              return _BookingTile(booking: booking);
            },
          );
        },
      ),
    );
  }
}

class _BookingTile extends ConsumerWidget {
  final Booking booking;

  const _BookingTile({required this.booking});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canCancel = booking.status == 'pending' || booking.status == 'confirmed';

    return ListTile(
      title: Text('Booking ${booking.id}'),
      subtitle: Text(
        '${booking.currency} ${(booking.amountMinor / 100).toStringAsFixed(2)} • '
        '${booking.status} • ${booking.paymentStatus}',
      ),
      trailing: canCancel
          ? TextButton(
              onPressed: () async {
                await ref.read(bookingRepositoryProvider).cancelBooking(booking.id);
                ref.invalidate(myBookingsProvider);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Cancellation requested')),
                  );
                }
              },
              child: const Text('Cancel'),
            )
          : null,
    );
  }
}
