'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  LayoutDashboard,
  Radar,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { OrgSwitcher } from './org-switcher';
import { BRAND_MARK, BRAND_NAME } from '@/lib/brand';

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Providers', href: '/admin/providers', icon: Building2 },
  { name: 'Resources', href: '/admin/resources', icon: CalendarRange },
  { name: 'Logs', href: '/admin/logs', icon: Radar },
  { name: 'Security Review', href: '/admin/security-review', icon: ShieldAlert },
  { name: 'Manage Users', href: '/admin/users', icon: Users },
  { name: 'Booking Analytics', href: '/admin/bookings', icon: CalendarRange },
  { name: 'Roles & Permissions', href: '/admin/rbac', icon: Shield },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r border-[rgba(15,20,36,0.08)] bg-[rgba(252,250,245,0.96)] backdrop-blur-xl">
      <div className="relative overflow-hidden border-b border-[rgba(15,20,36,0.08)] px-5 py-5">
        <div className="schedule-grid pointer-events-none absolute inset-0 opacity-60" />
        <Link href="/admin/dashboard" className="relative flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-night)] font-display text-lg text-[var(--brand-copper)]">
            {BRAND_MARK}
          </span>
          <div>
            <p className="font-display text-2xl leading-none text-gray-900">{BRAND_NAME}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">Admin control room</p>
          </div>
        </Link>
      </div>

      <OrgSwitcher />

      <nav className="flex h-[calc(100%-7.5rem)] flex-col gap-1 overflow-y-auto p-4 pt-0">
        <div className="mb-2 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          Administration
        </div>

        {adminNavigation.map((item) => {
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

        <div className="mt-4 border-t border-[rgba(15,20,36,0.08)] pt-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Workspace
          </Link>
        </div>
      </nav>
    </aside>
  );
}
