import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../notifications/presentation/providers/notification_provider.dart';
import '../../../resources/presentation/providers/resource_provider.dart';
import '../../../resources/presentation/widgets/resource_formatters.dart';

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(featuredResourcesProvider);
    ref.invalidate(marketplaceProvidersProvider);
    try {
      await ref.read(featuredResourcesProvider.future);
    } catch (_) {
      // The provider state renders any loading error.
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featuredAsync = ref.watch(featuredResourcesProvider);
    final providerNames = ref.watch(marketplaceProvidersProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Marketplace')),
      body: RefreshIndicator(
        onRefresh: () => _refresh(ref),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            _HeroCard(
              onExplore: () => context.go(AppConstants.resourcesRoute),
              onBookings: () => context.go(AppConstants.bookingsRoute),
            ),
            const SizedBox(height: 24),
            Text(
              'Quick access',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _QuickAccessCard(
              icon: Icons.travel_explore,
              title: 'Browse resources',
              subtitle: 'Search listings and jump into live slot selection',
              color: Colors.deepPurple,
              onTap: () => context.go(AppConstants.resourcesRoute),
            ),
            const SizedBox(height: 8),
            _QuickAccessCard(
              icon: Icons.calendar_month,
              title: 'Bookings',
              subtitle: 'Review upcoming plans and cancel if needed',
              color: Colors.orange,
              onTap: () => context.go(AppConstants.bookingsRoute),
            ),
            const SizedBox(height: 8),
            _QuickAccessCard(
              icon: Icons.payment,
              title: 'Payments',
              subtitle: 'Khalti · eSewa · sandbox checkout and history',
              color: Colors.indigo,
              onTap: () => context.go(AppConstants.paymentsRoute),
            ),
            const SizedBox(height: 8),
            _QuickAccessCard(
              icon: Icons.devices,
              title: 'Active sessions',
              subtitle: 'View and revoke active tokens',
              color: Colors.teal,
              onTap: () => context.go(AppConstants.tokensRoute),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Featured resources',
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                TextButton(
                  onPressed: () => context.go(AppConstants.resourcesRoute),
                  child: const Text('See all'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            featuredAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator.adaptive()),
              ),
              error: (error, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'We could not load featured resources.',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(error.toString()),
                    ],
                  ),
                ),
              ),
              data: (resources) {
                if (resources.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(18),
                      child: Text(
                        'No resources are published yet. Once listings are live, they will appear here automatically.',
                      ),
                    ),
                  );
                }
                return SizedBox(
                  height: 250,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: resources.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final resource = resources[index];
                      final providerName =
                          providerNames?[resource.providerId]?.name;
                      return _FeaturedResourceCard(
                        name: resource.name,
                        category: resource.category,
                        description: resource.shortDescription,
                        providerName: providerName,
                        priceLabel: formatCurrencyMinor(
                          resource.basePriceMinor,
                          resource.currency,
                        ),
                        onTap: () => context.push(
                          '${AppConstants.resourcesRoute}/${resource.id}',
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final VoidCallback onExplore;
  final VoidCallback onBookings;

  const _HeroCard({required this.onExplore, required this.onBookings});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            colorScheme.primaryContainer,
            colorScheme.secondaryContainer
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Book faster with the in-app marketplace',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Discover new resources, compare pricing, and move from slot selection to payment without leaving the app.',
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: onExplore,
                icon: const Icon(Icons.search),
                label: const Text('Explore resources'),
              ),
              OutlinedButton.icon(
                onPressed: onBookings,
                icon: const Icon(Icons.receipt_long_outlined),
                label: const Text('My bookings'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeaturedResourceCard extends StatelessWidget {
  final String name;
  final String category;
  final String description;
  final String? providerName;
  final String priceLabel;
  final VoidCallback onTap;

  const _FeaturedResourceCard({
    required this.name,
    required this.category,
    required this.description,
    required this.providerName,
    required this.priceLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SizedBox(
      width: 280,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: colorScheme.primaryContainer,
                  child: Icon(
                    resourceCategoryIcon(category),
                    color: colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  providerName == null ? _titleCase(category) : providerName!,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                Text(
                  description,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(priceLabel),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _QuickAccessCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.12),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          subtitle,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class HomePage extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const HomePage({super.key, required this.navigationShell});

  static const _destinations = [
    NavigationDestination(
      icon: Icon(Icons.home_outlined),
      selectedIcon: Icon(Icons.home),
      label: 'Home',
    ),
    NavigationDestination(
      icon: Icon(Icons.notifications_outlined),
      selectedIcon: Icon(Icons.notifications),
      label: 'Notifications',
    ),
    NavigationDestination(
      icon: Icon(Icons.settings_outlined),
      selectedIcon: Icon(Icons.settings),
      label: 'Settings',
    ),
    NavigationDestination(
      icon: Icon(Icons.person_outline),
      selectedIcon: Icon(Icons.person),
      label: 'Profile',
    ),
  ];

  void _onDestinationSelected(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadAsync = ref.watch(unreadCountProvider);
    final unreadCount = unreadAsync.valueOrNull ?? 0;

    final destinations = [
      _destinations[0],
      NavigationDestination(
        icon: Badge(
          isLabelVisible: unreadCount > 0,
          label: Text(unreadCount > 99 ? '99+' : '$unreadCount'),
          child: const Icon(Icons.notifications_outlined),
        ),
        selectedIcon: Badge(
          isLabelVisible: unreadCount > 0,
          label: Text(unreadCount > 99 ? '99+' : '$unreadCount'),
          child: const Icon(Icons.notifications),
        ),
        label: 'Notifications',
      ),
      _destinations[2],
      _destinations[3],
    ];

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: _onDestinationSelected,
        destinations: destinations,
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
