import 'package:equatable/equatable.dart';

class Resource extends Equatable {
  final String id;
  final String providerId;
  final String tenantId;
  final String name;
  final String description;
  final String category;
  final String timezone;
  final int basePriceMinor;
  final String currency;
  final int maxGroupSize;
  final bool isActive;

  const Resource({
    required this.id,
    required this.providerId,
    required this.tenantId,
    required this.name,
    required this.description,
    required this.category,
    required this.timezone,
    required this.basePriceMinor,
    required this.currency,
    required this.maxGroupSize,
    required this.isActive,
  });

  factory Resource.fromJson(Map<String, dynamic> json) {
    return Resource(
      id: json['id']?.toString() ?? '',
      providerId: json['provider_id']?.toString() ?? '',
      tenantId: json['tenant_id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? 'general',
      timezone: json['timezone'] as String? ?? 'UTC',
      basePriceMinor: (json['base_price_minor'] as num?)?.toInt() ?? 0,
      currency: (json['currency'] as String? ?? 'USD').toUpperCase(),
      maxGroupSize: (json['max_group_size'] as num?)?.toInt() ?? 1,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  String get shortDescription {
    final trimmed = description.trim();
    if (trimmed.isEmpty) {
      return 'Browse availability, compare pricing, and reserve a time that works.';
    }
    if (trimmed.length <= 120) {
      return trimmed;
    }
    return '${trimmed.substring(0, 117)}...';
  }

  @override
  List<Object?> get props => [
        id,
        providerId,
        tenantId,
        name,
        description,
        category,
        timezone,
        basePriceMinor,
        currency,
        maxGroupSize,
        isActive,
      ];
}

class ResourceListResponse extends Equatable {
  final List<Resource> items;
  final String? nextCursor;

  const ResourceListResponse({required this.items, this.nextCursor});

  factory ResourceListResponse.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return ResourceListResponse(
      items: rawItems
          .map((item) => Resource.fromJson(item as Map<String, dynamic>))
          .toList(),
      nextCursor: json['next_cursor']?.toString(),
    );
  }

  @override
  List<Object?> get props => [items, nextCursor];
}

class MarketplaceProvider extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String description;
  final String status;

  const MarketplaceProvider({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.description,
    required this.status,
  });

  factory MarketplaceProvider.fromJson(Map<String, dynamic> json) {
    return MarketplaceProvider(
      id: json['id']?.toString() ?? '',
      tenantId: json['tenant_id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status']?.toString() ?? 'pending',
    );
  }

  @override
  List<Object?> get props => [id, tenantId, name, description, status];
}

class ProviderListResponse extends Equatable {
  final List<MarketplaceProvider> items;
  final String? nextCursor;

  const ProviderListResponse({required this.items, this.nextCursor});

  factory ProviderListResponse.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return ProviderListResponse(
      items: rawItems
          .map(
            (item) =>
                MarketplaceProvider.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      nextCursor: json['next_cursor']?.toString(),
    );
  }

  @override
  List<Object?> get props => [items, nextCursor];
}

class ResourceSlot extends Equatable {
  final String id;
  final String resourceId;
  final String tenantId;
  final DateTime startsAt;
  final DateTime endsAt;
  final String status;
  final DateTime? holdExpiresAt;

  const ResourceSlot({
    required this.id,
    required this.resourceId,
    required this.tenantId,
    required this.startsAt,
    required this.endsAt,
    required this.status,
    this.holdExpiresAt,
  });

  factory ResourceSlot.fromJson(Map<String, dynamic> json) {
    return ResourceSlot(
      id: json['id']?.toString() ?? '',
      resourceId: json['resource_id']?.toString() ?? '',
      tenantId: json['tenant_id']?.toString() ?? '',
      startsAt: DateTime.tryParse(json['starts_at'] as String? ?? '') ??
          DateTime.now(),
      endsAt:
          DateTime.tryParse(json['ends_at'] as String? ?? '') ?? DateTime.now(),
      status: json['status']?.toString() ?? 'open',
      holdExpiresAt:
          DateTime.tryParse(json['hold_expires_at'] as String? ?? ''),
    );
  }

  bool get isOpen => status == 'open';
  bool get isHeld => status == 'held';
  bool get isBooked => status == 'booked';
  int get durationMinutes => endsAt.difference(startsAt).inMinutes;

  @override
  List<Object?> get props => [
        id,
        resourceId,
        tenantId,
        startsAt,
        endsAt,
        status,
        holdExpiresAt,
      ];
}

class ResourceSlotQuery extends Equatable {
  final String resourceId;
  final DateTime fromTs;
  final DateTime toTs;

  const ResourceSlotQuery({
    required this.resourceId,
    required this.fromTs,
    required this.toTs,
  });

  @override
  List<Object?> get props => [resourceId, fromTs, toTs];
}
