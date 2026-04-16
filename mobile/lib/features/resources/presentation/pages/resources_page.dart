import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../data/models/resource.dart';
import '../providers/resource_provider.dart';
import '../widgets/resource_formatters.dart';

class ResourcesPage extends ConsumerStatefulWidget {
  const ResourcesPage({super.key});

  @override
  ConsumerState<ResourcesPage> createState() => _ResourcesPageState();
}

class _ResourcesPageState extends ConsumerState<ResourcesPage> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(
      text: ref.read(resourceSearchQueryProvider),
    )..addListener(_handleSearchTextChanged);
  }

  @override
  void dispose() {
    _searchController
      ..removeListener(_handleSearchTextChanged)
      ..dispose();
    super.dispose();
  }

  void _handleSearchTextChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _applySearch() {
    ref.read(resourceSearchQueryProvider.notifier).state =
        _searchController.text.trim();
  }

  Future<void> _refreshResources() async {
    ref.invalidate(resourceCatalogProvider);
    ref.invalidate(marketplaceProvidersProvider);
    try {
      await ref.read(resourceCatalogProvider.future);
    } catch (_) {
      // Surface the error through the existing provider state.
    }
  }

  @override
  Widget build(BuildContext context) {
    final resourcesAsync = ref.watch(resourceCatalogProvider);
    final selectedCategory = ref.watch(resourceCategoryFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover resources'),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshResources,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            _DiscoveryHero(
              onBrowseAll: () {
                _searchController.clear();
                ref.read(resourceSearchQueryProvider.notifier).state = '';
                ref.read(resourceCategoryFilterProvider.notifier).state = null;
              },
            ),
            const SizedBox(height: 20),
            _SearchCard(
              controller: _searchController,
              onApply: _applySearch,
              onClear: () {
                _searchController.clear();
                ref.read(resourceSearchQueryProvider.notifier).state = '';
              },
            ),
            const SizedBox(height: 20),
            resourcesAsync.when(
              loading: () => const _LoadingState(),
              error: (error, _) => _ErrorState(
                message: 'We could not load the marketplace right now.',
                onRetry: () => ref.invalidate(resourceCatalogProvider),
                details: error.toString(),
              ),
              data: (response) {
                final categories = response.items
                    .map((resource) => resource.category.trim())
                    .where((category) => category.isNotEmpty)
                    .toSet()
                    .toList()
                  ..sort();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionHeading(
                      title: 'Browse listings',
                      subtitle:
                          '${response.items.length} live resource${response.items.length == 1 ? '' : 's'} ready to book.',
                    ),
                    if (categories.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            ChoiceChip(
                              label: const Text('All'),
                              selected: selectedCategory == null,
                              onSelected: (_) => ref
                                  .read(resourceCategoryFilterProvider.notifier)
                                  .state = null,
                            ),
                            const SizedBox(width: 8),
                            ...categories.map(
                              (category) => Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text(_titleCase(category)),
                                  selected: selectedCategory == category,
                                  onSelected: (_) => ref
                                      .read(resourceCategoryFilterProvider
                                          .notifier)
                                      .state = category,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    if (response.items.isEmpty)
                      _EmptyResults(
                        onClearFilters: () {
                          _searchController.clear();
                          ref.read(resourceSearchQueryProvider.notifier).state =
                              '';
                          ref
                              .read(resourceCategoryFilterProvider.notifier)
                              .state = null;
                        },
                      )
                    else
                      ...response.items.map(
                        (resource) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _ResourceCard(resource: resource),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _DiscoveryHero extends StatelessWidget {
  final VoidCallback onBrowseAll;

  const _DiscoveryHero({required this.onBrowseAll});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [colorScheme.primaryContainer, colorScheme.surfaceContainer],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: colorScheme.surface.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'Marketplace',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Find the next bookable space in a few taps.',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Search by category, compare pricing, then jump into live slot selection and checkout.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onBrowseAll,
            icon: const Icon(Icons.travel_explore),
            label: const Text('Browse all resources'),
          ),
        ],
      ),
    );
  }
}

class _SearchCard extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onApply;
  final VoidCallback onClear;

  const _SearchCard({
    required this.controller,
    required this.onApply,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Search the marketplace',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => onApply(),
              decoration: InputDecoration(
                hintText: 'Try “meeting room”, “studio”, or “court”',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: controller.text.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'Clear search',
                        onPressed: onClear,
                        icon: const Icon(Icons.close),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onApply,
                icon: const Icon(Icons.tune),
                label: const Text('Apply filters'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        3,
        (_) => const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                      height: 12,
                      width: 180,
                      child: ColoredBox(color: Colors.black12)),
                  SizedBox(height: 12),
                  SizedBox(
                      height: 12,
                      width: double.infinity,
                      child: ColoredBox(color: Colors.black12)),
                  SizedBox(height: 8),
                  SizedBox(
                      height: 12,
                      width: 220,
                      child: ColoredBox(color: Colors.black12)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final String details;
  final VoidCallback onRetry;

  const _ErrorState({
    required this.message,
    required this.details,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.wifi_tethering_error_rounded, size: 32),
            const SizedBox(height: 12),
            Text(
              message,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            Text(details),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyResults extends StatelessWidget {
  final VoidCallback onClearFilters;

  const _EmptyResults({required this.onClearFilters});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              Icons.search_off_rounded,
              size: 48,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              'No matching resources found',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Try a broader keyword or clear your filters to explore everything available.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onClearFilters,
              icon: const Icon(Icons.restart_alt),
              label: const Text('Clear filters'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  final String title;
  final String subtitle;

  const _SectionHeading({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 4),
        Text(subtitle),
      ],
    );
  }
}

class _ResourceCard extends ConsumerWidget {
  final Resource resource;

  const _ResourceCard({required this.resource});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final providerMap = ref.watch(marketplaceProvidersProvider).valueOrNull;
    final providerName = providerMap?[resource.providerId]?.name;
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () =>
            context.push('${AppConstants.resourcesRoute}/${resource.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 24,
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
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          providerName == null
                              ? 'Hosted on provider ${resource.providerId}'
                              : 'Hosted by $providerName',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: colorScheme.outline),
                ],
              ),
              const SizedBox(height: 14),
              Text(resource.shortDescription),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MetaChip(
                    icon: Icons.sell_outlined,
                    label: _titleCase(resource.category),
                  ),
                  _MetaChip(
                    icon: Icons.payments_outlined,
                    label: formatCurrencyMinor(
                      resource.basePriceMinor,
                      resource.currency,
                    ),
                  ),
                  _MetaChip(
                    icon: Icons.groups_outlined,
                    label: 'Up to ${resource.maxGroupSize}',
                  ),
                  _MetaChip(
                    icon: Icons.schedule_outlined,
                    label: resource.timezone,
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

class _MetaChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MetaChip({required this.icon, required this.label});

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
