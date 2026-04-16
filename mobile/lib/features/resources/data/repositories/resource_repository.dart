import '../../../../core/error/error_handler.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/dio_client.dart';
import '../models/resource.dart';

class ResourceRepository {
  final DioClient _dioClient;

  ResourceRepository(this._dioClient);

  Future<ResourceListResponse> getResources({
    String? tenantId,
    String? providerId,
    String? cursor,
    int limit = 40,
    String? query,
    String? category,
    bool includeInactive = false,
  }) async {
    try {
      final response = await _dioClient.dio.get(
        ApiEndpoints.resources,
        queryParameters: {
          if (tenantId != null && tenantId.isNotEmpty) 'tenant_id': tenantId,
          if (providerId != null && providerId.isNotEmpty)
            'provider_id': providerId,
          if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
          if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
          if (category != null && category.trim().isNotEmpty)
            'category': category.trim(),
          'limit': limit,
          if (includeInactive) 'include_inactive': true,
        },
      );
      return ResourceListResponse.fromJson(
          response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<Resource> getResource(String resourceId) async {
    try {
      final response = await _dioClient.dio.get(
        ApiEndpoints.resourceDetail(resourceId),
      );
      return Resource.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<ProviderListResponse> getProviders({
    String? tenantId,
    String? query,
    String? status,
    String? cursor,
    int limit = 100,
  }) async {
    try {
      final response = await _dioClient.dio.get(
        ApiEndpoints.marketplaceProviders,
        queryParameters: {
          if (tenantId != null && tenantId.isNotEmpty) 'tenant_id': tenantId,
          if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
          if (status != null && status.trim().isNotEmpty)
            'status': status.trim(),
          if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
          'limit': limit,
        },
      );
      return ProviderListResponse.fromJson(
          response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<MarketplaceProvider> getProvider(String providerId) async {
    try {
      final response = await _dioClient.dio.get(
        ApiEndpoints.marketplaceProviderDetail(providerId),
      );
      return MarketplaceProvider.fromJson(
          response.data as Map<String, dynamic>);
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<List<ResourceSlot>> getSlots({
    required String resourceId,
    required DateTime fromTs,
    required DateTime toTs,
  }) async {
    try {
      final response = await _dioClient.dio.get(
        ApiEndpoints.slots,
        queryParameters: {
          'resource_id': resourceId,
          'from_ts': fromTs.toUtc().toIso8601String(),
          'to_ts': toTs.toUtc().toIso8601String(),
        },
      );
      final items = response.data as List<dynamic>? ?? const [];
      return items
          .map((item) => ResourceSlot.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<DateTime?> holdSlot(String slotId) async {
    try {
      final response = await _dioClient.dio.post(ApiEndpoints.holdSlot(slotId));
      final payload = response.data as Map<String, dynamic>;
      return DateTime.tryParse(payload['hold_expires_at'] as String? ?? '');
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }

  Future<bool> releaseSlot(String slotId) async {
    try {
      final response = await _dioClient.dio.post(
        ApiEndpoints.releaseSlot(slotId),
      );
      final payload = response.data as Map<String, dynamic>;
      return payload['released'] as bool? ?? false;
    } catch (e) {
      throw ErrorHandler.handle(e);
    }
  }
}
