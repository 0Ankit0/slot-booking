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
      id: json['id']?.toString() ?? '',
      tenantId: json['tenant_id']?.toString() ?? '',
      providerId: json['provider_id']?.toString() ?? '',
      resourceId: json['resource_id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      status: json['status'] as String? ?? 'pending',
      paymentStatus: json['payment_status'] as String? ?? 'pending',
      refundStatus: json['refund_status'] as String? ?? 'none',
      amountMinor: (json['amount_minor'] as num?)?.toInt() ?? 0,
      currency: (json['currency'] as String? ?? 'USD').toUpperCase(),
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
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
      nextCursor: json['next_cursor']?.toString(),
    );
  }
}

class BookingCreateRequest {
  final String tenantId;
  final String providerId;
  final String resourceId;
  final String slotId;
  final int amountMinor;
  final String currency;
  final String notes;

  const BookingCreateRequest({
    required this.tenantId,
    required this.providerId,
    required this.resourceId,
    required this.slotId,
    required this.amountMinor,
    required this.currency,
    this.notes = '',
  });

  Map<String, dynamic> toJson() => {
        'tenant_id': tenantId,
        'provider_id': providerId,
        'resource_id': resourceId,
        'slot_id': slotId,
        'amount_minor': amountMinor,
        'currency': currency,
        'notes': notes,
      };
}

class BookingQuoteRequest {
  final String tenantId;
  final String resourceId;
  final int amountMinor;
  final String? promoCode;
  final int groupSize;

  const BookingQuoteRequest({
    required this.tenantId,
    required this.resourceId,
    required this.amountMinor,
    this.promoCode,
    this.groupSize = 1,
  });

  Map<String, dynamic> toJson() => {
        'tenant_id': tenantId,
        'resource_id': resourceId,
        'amount_minor': amountMinor,
        if (promoCode != null && promoCode!.trim().isNotEmpty)
          'promo_code': promoCode!.trim(),
        'group_size': groupSize,
      };
}

class BookingQuoteResponse {
  final int baseAmountMinor;
  final int promoDiscountMinor;
  final int groupSurchargeMinor;
  final int finalAmountMinor;

  const BookingQuoteResponse({
    required this.baseAmountMinor,
    required this.promoDiscountMinor,
    required this.groupSurchargeMinor,
    required this.finalAmountMinor,
  });

  factory BookingQuoteResponse.fromJson(Map<String, dynamic> json) {
    return BookingQuoteResponse(
      baseAmountMinor: (json['base_amount_minor'] as num?)?.toInt() ?? 0,
      promoDiscountMinor: (json['promo_discount_minor'] as num?)?.toInt() ?? 0,
      groupSurchargeMinor:
          (json['group_surcharge_minor'] as num?)?.toInt() ?? 0,
      finalAmountMinor: (json['final_amount_minor'] as num?)?.toInt() ?? 0,
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
      bookingId: json['booking_id']?.toString() ?? '',
      status: json['status'] as String? ?? 'pending',
      refundStatus: json['refund_status'] as String? ?? 'none',
      requestId: json['request_id']?.toString() ?? '',
    );
  }
}
