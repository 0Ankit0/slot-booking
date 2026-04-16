'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Building2,
  Compass,
  CreditCard,
  Home,
  Key,
  Map,
  Settings,
  Sparkles,
  User,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import { OrgSwitcher } from './org-switcher';
import { useSystemCapabilities } from '@/hooks/use-system';
import { useAuthStore } from '@/store/auth-store';
import { BRAND_MARK, BRAND_NAME } from '@/lib/brand';

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Resources', href: '/resources', icon: Compass },
  { name: 'Bookings', href: '/bookings', icon: CalendarClock },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Tenants', href: '/tenants', icon: Building2, feature: 'multitenancy' },
  { name: 'Payments', href: '/finances', icon: CreditCard, feature: 'finance' },
  { name: 'Notifications', href: '/notifications', icon: Bell, feature: 'notifications' },
  { name: 'Maps', href: '/maps', icon: Map, feature: 'maps' },
  { name: 'Active Sessions', href: '/tokens', icon: Key, feature: 'auth' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: capabilities } = useSystemCapabilities();
  const user = useAuthStore((state) => state.user);

  const visibleNavigation = mainNavigation.filter(
    (item) => !item.feature || capabilities?.modules[item.feature] !== false
  );
  const showAdminSwitch = Boolean(user?.is_superuser);

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r border-[rgba(15,20,36,0.08)] bg-[rgba(252,250,245,0.96)] backdrop-blur-xl">
      <div className="relative overflow-hidden border-b border-[rgba(15,20,36,0.08)] px-5 py-5">
        <div className="schedule-grid pointer-events-none absolute inset-0 opacity-60" />
        <Link href="/dashboard" className="relative flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-night)] font-display text-lg text-[var(--brand-copper)]">
            {BRAND_MARK}
          </span>
          <div>
            <p className="font-display text-2xl leading-none text-gray-900">{BRAND_NAME}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
              Discovery workspace
            </p>
          </div>
        </Link>
      </div>

      <OrgSwitcher />

      <nav className="flex h-[calc(100%-7.5rem)] flex-col gap-1 overflow-y-auto p-4 pt-0">
        <div className="mb-2 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          Workspace
        </div>

        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-[rgba(20,108,107,0.1)] text-[var(--accent)] shadow-[0_14px_30px_rgba(20,108,107,0.08)]'
                  : 'text-gray-700 hover:bg-[rgba(255,255,255,0.9)]'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        <div className="mt-4 rounded-[24px] border border-[rgba(197,138,73,0.2)] bg-[rgba(197,138,73,0.08)] p-4 text-sm text-gray-700">
          <div className="flex items-center gap-2 text-[var(--brand-night)]">
            <Sparkles className="h-4 w-4 text-[var(--brand-copper)]" />
            Marketplace tip
          </div>
          <p className="mt-2 leading-6 text-gray-600">
            Browse Resources to move from discovery to quote and checkout in one polished flow.
          </p>
        </div>

        {showAdminSwitch ? (
          <div className="mt-4 border-t border-[rgba(15,20,36,0.08)] pt-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-white"
            >
              <ArrowRight className="h-5 w-5" />
              Open Admin Panel
            </Link>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
