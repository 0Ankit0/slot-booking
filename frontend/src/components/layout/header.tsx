'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, User, LogOut, Settings, ChevronRight, CheckCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/use-notifications';
import { LanguageSwitcher } from './language-switcher';
import { ThemeSelector } from '@/components/theme/theme-selector';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export function Header() {
  const { logout } = useAuth();
  const { user, tenant } = useAuthStore();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(userRef, () => setUserOpen(false));

  const { data: notifData } = useNotifications({ limit: 6 });
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const notifications = notifData?.items ?? [];
  const unreadCount = notifData?.unread_count ?? 0;

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutDialog(false);
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-10 h-16 border-b border-[rgba(15,20,36,0.08)] bg-[rgba(252,250,245,0.88)] backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-2">
          {tenant && (
            <span className="inline-flex items-center rounded-full border border-[rgba(20,108,107,0.12)] bg-[rgba(20,108,107,0.08)] px-3 py-1 text-sm text-gray-700">
              Organization: <span className="ml-1 font-medium text-gray-900">{tenant.name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ThemeSelector />
          <LanguageSwitcher />

          {/* ── Notifications dropdown ── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen((o) => !o); setUserOpen(false); }}
              className="relative rounded-xl p-2 text-gray-500 transition hover:bg-white hover:text-gray-700"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-[rgba(252,250,245,0.98)] shadow-[0_24px_60px_rgba(15,20,36,0.16)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAll.mutate()}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                      >
                        <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={() => markOne.mutate(n.id)}
                            className="text-[10px] text-blue-500 hover:text-blue-700 flex-shrink-0 mt-1"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border-t border-gray-100 transition-colors"
                >
                  View all notifications <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* ── User dropdown ── */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => { setUserOpen((o) => !o); setNotifOpen(false); }}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(197,138,73,0.16)]">
                <User className="h-4 w-4 text-[var(--brand-night)]" />
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user?.first_name || user?.username || user?.email || 'User'}
              </span>
            </button>

            {userOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-[rgba(252,250,245,0.98)] shadow-[0_24px_60px_rgba(15,20,36,0.16)]">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.first_name && user?.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    Settings
                  </Link>
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={() => { setUserOpen(false); setShowLogoutDialog(true); }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        title="Sign out?"
        description="You will be signed out of your account and redirected to the login page."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutDialog(false)}
        isLoading={isLoggingOut}
      />
    </header>
  );
}
