import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers/dio_provider.dart';
import '../../data/models/resource.dart';
import '../../data/repositories/resource_repository.dart';

final resourceRepositoryProvider = Provider<ResourceRepository>((ref) {
  return ResourceRepository(ref.watch(dioClientProvider));
});

final resourceSearchQueryProvider =
    StateProvider.autoDispose<String>((ref) => '');

final resourceCategoryFilterProvider = StateProvider.autoDispose<String?>(
  (ref) => null,
);

final resourceCatalogProvider =
    FutureProvider.autoDispose<ResourceListResponse>((
  ref,
) {
  final query = ref.watch(resourceSearchQueryProvider).trim();
  final category = ref.watch(resourceCategoryFilterProvider);
  return ref.watch(resourceRepositoryProvider).getResources(
        limit: 40,
        query: query.isEmpty ? null : query,
        category: category,
      );
});

final featuredResourcesProvider = FutureProvider.autoDispose<List<Resource>>((
  ref,
) async {
  final response =
      await ref.watch(resourceRepositoryProvider).getResources(limit: 4);
  return response.items;
});

final marketplaceProvidersProvider =
    FutureProvider.autoDispose<Map<String, MarketplaceProvider>>((ref) async {
  final response = await ref.watch(resourceRepositoryProvider).getProviders(
        limit: 100,
        status: 'approved',
      );
  if (response.items.isNotEmpty) {
    return {for (final item in response.items) item.id: item};
  }

  final fallbackResponse =
      await ref.watch(resourceRepositoryProvider).getProviders(
            limit: 100,
          );
  return {for (final item in fallbackResponse.items) item.id: item};
});

final marketplaceProviderProvider =
    FutureProvider.family.autoDispose<MarketplaceProvider, String>((
  ref,
  providerId,
) async {
  try {
    final providers = await ref.watch(marketplaceProvidersProvider.future);
    final provider = providers[providerId];
    if (provider != null) {
      return provider;
    }
  } catch (_) {
    // Fallback to the direct endpoint when the shared provider list is unavailable.
  }
  return ref.watch(resourceRepositoryProvider).getProvider(providerId);
});

final resourceDetailProvider =
    FutureProvider.family.autoDispose<Resource, String>((
  ref,
  resourceId,
) {
  return ref.watch(resourceRepositoryProvider).getResource(resourceId);
});

final resourceSlotsProvider =
    FutureProvider.family.autoDispose<List<ResourceSlot>, ResourceSlotQuery>((
  ref,
  query,
) {
  return ref.watch(resourceRepositoryProvider).getSlots(
        resourceId: query.resourceId,
        fromTs: query.fromTs,
        toTs: query.toTs,
      );
});
