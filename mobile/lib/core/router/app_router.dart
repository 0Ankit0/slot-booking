import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/otp_verify_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/reset_password_page.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/bookings/presentation/pages/bookings_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/notifications/presentation/pages/notifications_page.dart';
import '../../features/payments/presentation/pages/payments_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/tokens_page.dart';
import '../../features/resources/presentation/pages/booking_checkout_page.dart';
import '../../features/resources/presentation/pages/resource_detail_page.dart';
import '../../features/resources/presentation/pages/resources_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../constants/app_constants.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: AppConstants.loginRoute,
    redirect: (context, state) {
      final isAuthenticated = authState.valueOrNull?.isAuthenticated ?? false;
      final isLoading = authState.isLoading;
      final location = state.matchedLocation;

      if (isLoading) return null;

      final onAuthPage = location == AppConstants.loginRoute ||
          location == AppConstants.registerRoute ||
          location == AppConstants.forgotPasswordRoute ||
          location == AppConstants.resetPasswordRoute ||
          location == AppConstants.otpVerifyRoute;

      if (!isAuthenticated && !onAuthPage) {
        return AppConstants.loginRoute;
      }
      if (isAuthenticated &&
          (location == AppConstants.loginRoute ||
              location == AppConstants.registerRoute)) {
        return AppConstants.homeRoute;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: AppConstants.loginRoute,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppConstants.registerRoute,
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: AppConstants.forgotPasswordRoute,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: AppConstants.otpVerifyRoute,
        builder: (context, state) {
          final tempToken = state.extra as String? ?? '';
          return OtpVerifyPage(tempToken: tempToken);
        },
      ),
      GoRoute(
        path: AppConstants.resetPasswordRoute,
        builder: (context, state) {
          final token = state.extra as String? ??
              state.uri.queryParameters['token'] ??
              '';
          return ResetPasswordPage(token: token);
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomePage(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppConstants.homeRoute,
                builder: (context, state) => const HomeTab(),
                routes: [
                  GoRoute(
                    path: 'resources',
                    builder: (context, state) => const ResourcesPage(),
                    routes: [
                      GoRoute(
                        path: ':resourceId',
                        builder: (context, state) => ResourceDetailPage(
                          resourceId: state.pathParameters['resourceId'] ?? '',
                        ),
                        routes: [
                          GoRoute(
                            path: 'checkout',
                            builder: (context, state) {
                              final args = state.extra;
                              if (args is BookingCheckoutPageArgs) {
                                return BookingCheckoutPage(args: args);
                              }
                              return const Scaffold(
                                body: Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(24),
                                    child: Text(
                                      'Checkout could not be restored. Please select a slot again.',
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'payments',
                    builder: (context, state) => const PaymentsPage(),
                  ),
                  GoRoute(
                    path: 'bookings',
                    builder: (context, state) => const BookingsPage(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppConstants.notificationsRoute,
                builder: (context, state) => const NotificationsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppConstants.settingsRoute,
                builder: (context, state) => const SettingsPage(),
                routes: [
                  GoRoute(
                    path: 'tokens',
                    builder: (context, state) => const TokensPage(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppConstants.profileRoute,
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
