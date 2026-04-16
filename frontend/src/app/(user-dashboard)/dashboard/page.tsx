'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Compass,
  Key,
  Shield,
  Ticket,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyBookings, useResources } from '@/hooks/use-bookings';
import { useNotifications } from '@/hooks/use-notifications';
import { useTokens } from '@/hooks/use-tokens';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const { data: notificationData, isLoading: loadingNotifications } = useNotifications({ limit: 5 });
  const { data: tokenData } = useTokens({ limit: 1 });
  const { data: resourcesData } = useResources({ tenant_id: tenant?.id, limit: 100 });
  const { data: bookingsData } = useMyBookings({ tenant_id: tenant?.id, limit: 100 });

  const recentNotifications = notificationData?.items ?? [];
  const unreadCount = notificationData?.unread_count ?? 0;
  const activeSessions = tokenData?.total ?? 0;
  const liveResources = (resourcesData?.items ?? []).length;
  const activeBookings = (bookingsData?.items ?? []).filter(
    (booking) => booking.status === 'pending' || booking.status === 'confirmed'
  ).length;

  const stats = [
    {
      name: 'Live resources',
      value: String(liveResources),
      icon: Compass,
      href: '/resources',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      name: 'Active bookings',
      value: String(activeBookings),
      icon: Ticket,
      href: '/bookings',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      name: 'Unread notifications',
      value: String(unreadCount),
      icon: Bell,
      href: '/notifications',
      color: 'text-orange-600 bg-orange-50',
    },
    {
      name: 'Active sessions',
      value: String(activeSessions),
      icon: Key,
      href: '/tokens',
      color: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="brand-shell relative overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,20,36,0.18)] sm:px-8">
        <div className="night-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">Customer workspace</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">
            Welcome back{user?.first_name ? `, ${user.first_name}` : user?.username ? `, ${user.username}` : ''}.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            {tenant ? `You are exploring ${tenant.name}. ` : 'You are browsing all accessible inventory. '}
            Start with live resources, compare quotes, and jump into checkout the moment the right slot appears.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-copper)] px-5 py-3 text-sm font-semibold text-[var(--brand-night)] transition hover:translate-y-[-1px]"
            >
              Browse resources
              <Compass className="h-4 w-4" />
            </Link>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open bookings
              <Ticket className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="cursor-pointer rounded-[28px] border-[rgba(15,20,36,0.08)] bg-white/90 transition hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(15,20,36,0.08)]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.name}</p>
                    <p className="mt-1 text-3xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-[30px] border-[rgba(15,20,36,0.08)] bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Compass className="h-5 w-5 text-[var(--accent)]" />
              Marketplace launch points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  href: '/resources',
                  icon: Compass,
                  label: 'Browse resources',
                  desc: 'Start with live discovery',
                  color: 'text-blue-600',
                },
                {
                  href: '/bookings',
                  icon: Ticket,
                  label: 'My bookings',
                  desc: `${activeBookings} active reservations`,
                  color: 'text-purple-600',
                },
                {
                  href: '/notifications',
                  icon: Bell,
                  label: 'Notifications',
                  desc: `${unreadCount} unread alerts`,
                  color: 'text-orange-600',
                },
                {
                  href: '/profile',
                  icon: Shield,
                  label: 'Security settings',
                  desc: 'Manage 2FA and identity',
                  color: 'text-green-600',
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col gap-2 rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,242,232,0.94))] p-4 transition hover:border-[rgba(20,108,107,0.18)] hover:shadow-[0_12px_30px_rgba(15,20,36,0.06)]"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-[rgba(15,20,36,0.08)] bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Bell className="h-5 w-5 text-[var(--accent)]" />
              Recent notifications
            </CardTitle>
            <Link href="/notifications" className="text-sm text-[var(--accent)] hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[rgba(15,20,36,0.14)] px-4 py-10 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 rounded-[22px] border px-4 py-3 ${
                      notification.is_read
                        ? 'border-[rgba(15,20,36,0.08)] bg-white'
                        : 'border-[rgba(20,108,107,0.18)] bg-[rgba(20,108,107,0.06)]'
                    }`}
                  >
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.is_read ? 'bg-gray-300' : 'bg-[var(--accent)]'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{notification.body}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!user?.is_confirmed ? (
        <Card className="rounded-[28px] border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Email not verified</p>
                <p className="mt-1 text-xs text-yellow-700">
                  Verify your email to unlock a smoother booking and notification flow.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!user?.otp_enabled ? (
        <Card className="rounded-[28px] border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Two-factor authentication is disabled</p>
                  <p className="mt-1 text-xs text-orange-700">
                    Add an extra layer of security before running more bookings through the marketplace.
                  </p>
                </div>
              </div>
              <Link href="/profile" className="text-sm font-medium text-orange-700 underline hover:text-orange-900">
                Enable 2FA
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
