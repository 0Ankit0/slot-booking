import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers/dio_provider.dart';
import '../../data/models/booking.dart';
import '../../data/repositories/booking_repository.dart';

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  return BookingRepository(ref.watch(dioClientProvider));
});

final myBookingsProvider = FutureProvider<BookingListResponse>((ref) {
  return ref.watch(bookingRepositoryProvider).getMyBookings();
});
