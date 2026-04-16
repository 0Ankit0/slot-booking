enum PaymentProvider {
  khalti,
  esewa,
  stripe,
  paypal;

  static PaymentProvider fromString(String v) {
    return PaymentProvider.values.firstWhere(
      (e) => e.name == v.toLowerCase(),
      orElse: () => PaymentProvider.khalti,
    );
  }

  String get displayName {
    switch (this) {
      case PaymentProvider.khalti:
        return 'Khalti';
      case PaymentProvider.esewa:
        return 'eSewa';
      case PaymentProvider.stripe:
        return 'Stripe';
      case PaymentProvider.paypal:
        return 'PayPal';
    }
  }
}

enum PaymentStatus {
  pending,
  initiated,
  completed,
  failed,
  refunded,
  cancelled;

  static PaymentStatus fromString(String v) {
    return PaymentStatus.values.firstWhere(
      (e) => e.name == v.toLowerCase(),
      orElse: () => PaymentStatus.pending,
    );
  }
}

String _requiredStringField(Map<String, dynamic> json, String fieldName) {
  final value = json[fieldName];
  if (value == null) {
    throw FormatException('Missing required field: $fieldName');
  }

  final stringValue = value.toString();
  if (stringValue.isEmpty) {
    throw FormatException('Missing required field: $fieldName');
  }
  return stringValue;
}

class InitiatePaymentRequest {
  final PaymentProvider provider;
  final int amount;
  final String purchaseOrderId;
  final String purchaseOrderName;
  final String returnUrl;
  final String websiteUrl;
  final String? bookingId;
  final String? tenantId;
  final String? providerId;
  final String? customerName;
  final String? customerEmail;
  final String? customerPhone;

  const InitiatePaymentRequest({
    required this.provider,
    required this.amount,
    required this.purchaseOrderId,
    required this.purchaseOrderName,
    required this.returnUrl,
    required this.websiteUrl,
    this.bookingId,
    this.tenantId,
    this.providerId,
    this.customerName,
    this.customerEmail,
    this.customerPhone,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'provider': provider.name,
      'amount': amount,
      'purchase_order_id': purchaseOrderId,
      'purchase_order_name': purchaseOrderName,
      'return_url': returnUrl,
      'website_url': websiteUrl,
    };
    if (bookingId != null) map['booking_id'] = bookingId;
    if (tenantId != null) map['tenant_id'] = tenantId;
    if (providerId != null) map['provider_id'] = providerId;
    if (customerName != null) map['customer_name'] = customerName;
    if (customerEmail != null) map['customer_email'] = customerEmail;
    if (customerPhone != null) map['customer_phone'] = customerPhone;
    return map;
  }
}

class InitiatePaymentResponse {
  final String transactionId;
  final PaymentProvider provider;
  final PaymentStatus status;
  final String? paymentUrl;
  final String? providerPidx;
  final Map<String, dynamic>? extra;

  const InitiatePaymentResponse({
    required this.transactionId,
    required this.provider,
    required this.status,
    this.paymentUrl,
    this.providerPidx,
    this.extra,
  });

  factory InitiatePaymentResponse.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? extra;
    if (json['extra'] is Map) {
      extra = Map<String, dynamic>.from(json['extra'] as Map);
      final formFields = extra['form_fields'];
      if (formFields is Map) {
        extra['form_fields'] = Map<String, dynamic>.from(formFields);
      }
    }

    return InitiatePaymentResponse(
      transactionId: _requiredStringField(json, 'transaction_id'),
      provider:
          PaymentProvider.fromString(json['provider'] as String? ?? 'khalti'),
      status: PaymentStatus.fromString(json['status'] as String? ?? 'pending'),
      paymentUrl: json['payment_url'] as String?,
      providerPidx: json['provider_pidx']?.toString(),
      extra: extra,
    );
  }
}

class VerifyPaymentRequest {
  final PaymentProvider provider;
  final String? pidx;
  final String? oid;
  final String? refId;
  final String? data;
  final String? transactionId;

  const VerifyPaymentRequest({
    required this.provider,
    this.pidx,
    this.oid,
    this.refId,
    this.data,
    this.transactionId,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'provider': provider.name};
    if (pidx != null) map['pidx'] = pidx;
    if (oid != null) map['oid'] = oid;
    if (refId != null) map['refId'] = refId;
    if (data != null) map['data'] = data;
    if (transactionId != null) map['transaction_id'] = transactionId;
    return map;
  }
}

class VerifyPaymentResponse {
  final String transactionId;
  final PaymentProvider provider;
  final PaymentStatus status;
  final int? amount;
  final String? providerTransactionId;
  final Map<String, dynamic>? extra;

  const VerifyPaymentResponse({
    required this.transactionId,
    required this.provider,
    required this.status,
    this.amount,
    this.providerTransactionId,
    this.extra,
  });

  factory VerifyPaymentResponse.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? extra;
    if (json['extra'] is Map) {
      extra = Map<String, dynamic>.from(json['extra'] as Map);
    }

    return VerifyPaymentResponse(
      transactionId: _requiredStringField(json, 'transaction_id'),
      provider:
          PaymentProvider.fromString(json['provider'] as String? ?? 'khalti'),
      status: PaymentStatus.fromString(json['status'] as String? ?? 'pending'),
      amount: (json['amount'] as num?)?.toInt(),
      providerTransactionId: json['provider_transaction_id']?.toString(),
      extra: extra,
    );
  }
}

class PaymentTransaction {
  final String id;
  final PaymentProvider provider;
  final PaymentStatus status;
  final int amount;
  final String currency;
  final String purchaseOrderId;
  final String purchaseOrderName;
  final String? bookingId;
  final String? tenantId;
  final String? providerId;
  final String? providerTransactionId;
  final String? providerPidx;
  final String returnUrl;
  final String websiteUrl;
  final String? failureReason;

  const PaymentTransaction({
    required this.id,
    required this.provider,
    required this.status,
    required this.amount,
    required this.currency,
    required this.purchaseOrderId,
    required this.purchaseOrderName,
    this.bookingId,
    this.tenantId,
    this.providerId,
    this.providerTransactionId,
    this.providerPidx,
    required this.returnUrl,
    required this.websiteUrl,
    this.failureReason,
  });

  factory PaymentTransaction.fromJson(Map<String, dynamic> json) {
    return PaymentTransaction(
      id: _requiredStringField(json, 'id'),
      provider:
          PaymentProvider.fromString(json['provider'] as String? ?? 'khalti'),
      status: PaymentStatus.fromString(json['status'] as String? ?? 'pending'),
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      currency: (json['currency'] as String? ?? 'NPR').toUpperCase(),
      purchaseOrderId: json['purchase_order_id'] as String? ?? '',
      purchaseOrderName: json['purchase_order_name'] as String? ?? '',
      bookingId: json['booking_id']?.toString(),
      tenantId: json['tenant_id']?.toString(),
      providerId: json['provider_id']?.toString(),
      providerTransactionId: json['provider_transaction_id']?.toString(),
      providerPidx: json['provider_pidx']?.toString(),
      returnUrl: json['return_url'] as String? ?? '',
      websiteUrl: json['website_url'] as String? ?? '',
      failureReason: json['failure_reason'] as String?,
    );
  }
}
