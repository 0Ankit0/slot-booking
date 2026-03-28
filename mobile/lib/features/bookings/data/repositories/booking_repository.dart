import 'package:dio/dio.dart';

import '../../../../core/error/error_handler.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/dio_client.dart';
import '../models/booking.dart';

class BookingRepository {
  final DioClient _dioClient;

  BookingRepository(this._dioClient);

  Future<BookingListResponse> getMyBookings({String? tenantId, String? cursor, int limit = 20}) async {
    try {
      final response = await _dioClient.dio.get(
        ApiEndpoints.bookings,
        queryParameters: {
          if (tenantId != null && tenantId.isNotEmpty) 'tenant_id': tenantId,
          if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
          'limit': limit,
        },
      );
      return BookingListResponse.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<BookingCancelResponse> cancelBooking(String bookingId) async {
    try {
      final response = await _dioClient.dio.post(
        ApiEndpoints.cancelBooking(bookingId),
        options: Options(
          headers: {
            'X-Request-Id': DateTime.now().millisecondsSinceEpoch.toString(),
          },
        ),
      );
      return BookingCancelResponse.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
