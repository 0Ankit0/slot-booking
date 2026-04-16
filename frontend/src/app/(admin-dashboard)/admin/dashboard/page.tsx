'use client';

import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  Key,
  Shield,
  ShieldAlert,
  Store,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBookingAnalyticsSummary, useProviders, useResources } from '@/hooks/use-bookings';
import { useObservabilitySummary } from '@/hooks/use-observability';
import { useRoles } from '@/hooks/use-rbac';
import { useTokens } from '@/hooks/use-tokens';
import { useListUsers } from '@/hooks/use-users';
import { formatCurrency } from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth-store';

export default function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const { data: usersData } = useListUsers({ limit: 100 });
  const { data: rolesData } = useRoles({ limit: 100 });
  const { data: tokenData } = useTokens({ limit: 1 });
  const { data: observabilitySummary } = useObservabilitySummary();
  const { data: providersData } = useProviders({ tenant_id: tenant?.id, limit: 100 });
  const { data: resourcesData } = useResources({ tenant_id: tenant?.id, include_inactive: true, limit: 100 });
  const { data: analyticsSummary } = useBookingAnalyticsSummary({ tenant_id: tenant?.id });

  const users = usersData?.items ?? [];
  const totalUsers = usersData?.total ?? users.length;
  const superusers = users.filter((member) => member.is_superuser).length;
  const unverifiedUsers = users.filter((member) => !member.is_confirmed).length;
  const totalRoles = rolesData?.total ?? rolesData?.items.length ?? 0;
  const activeSessions = tokenData?.total ?? 0;

  const stats = [
    { label: 'Users', value: String(totalUsers), href: '/admin/users', icon: Users, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Providers', value: String((providersData?.items ?? []).length), href: '/admin/providers', icon: Store, tone: 'text-purple-600 bg-purple-50' },
    { label: 'Resources', value: String((resourcesData?.items ?? []).length), href: '/admin/resources', icon: CalendarRange, tone: 'text-green-600 bg-green-50' },
    { label: 'Open incidents', value: String(observabilitySummary?.open_incidents ?? 0), href: '/admin/security-review', icon: ShieldAlert, tone: 'text-red-600 bg-red-50' },
  ];

  const quickActions = [
    {
      href: '/admin/providers',
      icon: Store,
      label: 'Manage providers',
      desc: 'Approve hosts and curate inventory supply.',
      color: 'text-purple-600',
    },
    {
      href: '/admin/resources',
      icon: CalendarRange,
      label: 'Manage resources',
      desc: 'Price listings, edit descriptions, and toggle live visibility.',
      color: 'text-green-600',
    },
    {
      href: '/admin/users',
      icon: Users,
      label: 'Manage users',
      desc: 'Review accounts and access levels.',
      color: 'text-blue-600',
    },
    {
      href: '/admin/bookings',
      icon: Activity,
      label: 'Booking analytics',
      desc: 'Track marketplace performance and revenue.',
      color: 'text-orange-600',
    },
    {
      href: '/admin/security-review',
      icon: ShieldAlert,
      label: 'Security review',
      desc: 'Investigate suspicious activity quickly.',
      color: 'text-red-600',
    },
    {
      href: '/admin/rbac',
      icon: Shield,
      label: 'Roles & permissions',
      desc: `${totalRoles} roles currently configured.`,
      color: 'text-indigo-600',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="brand-shell relative overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,20,36,0.18)] sm:px-8">
        <div className="night-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">Admin control room</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">
            Welcome back{user?.first_name ? `, ${user.first_name}` : user?.username ? `, ${user.username}` : ''}.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            {tenant ? `You are scoped to ${tenant.name}. ` : 'You are looking across the full admin surface. '}
            Keep supply healthy, understand booking performance, and tighten operations without leaving the dashboard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/12"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-[30px] border-[rgba(15,20,36,0.08)] bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Activity className="h-5 w-5 text-[var(--accent)]" />
              Marketplace actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {quickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col gap-2 rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,232,0.92))] p-4 transition hover:border-[rgba(20,108,107,0.18)] hover:shadow-[0_14px_34px_rgba(15,20,36,0.06)]"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs leading-6 text-gray-500">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-[rgba(15,20,36,0.08)] bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Store className="h-5 w-5 text-[var(--accent)]" />
              Operations pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-white p-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Active sessions</p>
                  <p className="text-xs text-gray-500">Monitor token usage across the platform.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{activeSessions}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-white p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Roles configured</p>
                  <p className="text-xs text-gray-500">Tune access before opening new workflows.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{totalRoles}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-white p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Superusers</p>
                  <p className="text-xs text-gray-500">Keep elevated access intentionally small.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">{superusers}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-white p-4">
              <div className="flex items-center gap-3">
                <CalendarRange className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gross booking revenue</p>
                  <p className="text-xs text-gray-500">Tenant-aware booking summary from analytics.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(analyticsSummary?.gross_revenue_minor ?? 0, 'USD')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {unverifiedUsers > 0 ? (
        <Card className="rounded-[28px] border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Accounts need attention</p>
                <p className="mt-1 text-xs text-yellow-700">
                  {unverifiedUsers} user account{unverifiedUsers === 1 ? '' : 's'} still need email verification.
                </p>
              </div>
              <Link href="/admin/users" className="text-sm font-medium text-yellow-700 underline hover:text-yellow-900">
                Review users
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
