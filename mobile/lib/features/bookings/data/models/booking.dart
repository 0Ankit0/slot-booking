class Booking {
  final String id;
  final String tenantId;
  final String providerId;
  final String resourceId;
  final String userId;
  final String status;
  final String paymentStatus;
  final String refundStatus;
  final int amountMinor;
  final String currency;
  final DateTime createdAt;

  Booking({
    required this.id,
    required this.tenantId,
    required this.providerId,
    required this.resourceId,
    required this.userId,
    required this.status,
    required this.paymentStatus,
    required this.refundStatus,
    required this.amountMinor,
    required this.currency,
    required this.createdAt,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as String? ?? '',
      tenantId: json['tenant_id'] as String? ?? '',
      providerId: json['provider_id'] as String? ?? '',
      resourceId: json['resource_id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      paymentStatus: json['payment_status'] as String? ?? 'pending',
      refundStatus: json['refund_status'] as String? ?? 'none',
      amountMinor: (json['amount_minor'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class BookingListResponse {
  final List<Booking> items;
  final String? nextCursor;

  BookingListResponse({required this.items, this.nextCursor});

  factory BookingListResponse.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return BookingListResponse(
      items: rawItems
          .map((item) => Booking.fromJson(item as Map<String, dynamic>))
          .toList(),
      nextCursor: json['next_cursor'] as String?,
    );
  }
}

class BookingCancelResponse {
  final String bookingId;
  final String status;
  final String refundStatus;
  final String requestId;

  BookingCancelResponse({
    required this.bookingId,
    required this.status,
    required this.refundStatus,
    required this.requestId,
  });

  factory BookingCancelResponse.fromJson(Map<String, dynamic> json) {
    return BookingCancelResponse(
      bookingId: json['booking_id'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      refundStatus: json['refund_status'] as String? ?? 'none',
      requestId: json['request_id'] as String? ?? '',
    );
  }
}
