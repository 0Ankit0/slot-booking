'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  CreditCard,
  Loader2,
  Ticket,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaymentProviders } from '@/hooks/use-finances';
import {
  useCancelBooking,
  useCheckoutBooking,
  useMyBookings,
  useProviders,
  useResources,
} from '@/hooks/use-bookings';
import {
  PAYMENT_PROVIDER_LABELS,
  formatCurrency,
  formatDateLabel,
  getBookingStatusMeta,
  getPaymentStatusMeta,
} from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth-store';
import type { PaymentProvider } from '@/types/payments';

export default function BookingsPage() {
  const tenant = useAuthStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isFetching } = useMyBookings({ tenant_id: tenant?.id, limit: 100 });
  const resourcesQuery = useResources({ tenant_id: tenant?.id, include_inactive: true, limit: 100 });
  const providersQuery = useProviders({ tenant_id: tenant?.id, limit: 100 });
  const paymentProvidersQuery = usePaymentProviders();
  const cancelMutation = useCancelBooking();
  const checkoutMutation = useCheckoutBooking();
  const [defaultCheckoutProvider, setDefaultCheckoutProvider] = useState<PaymentProvider | ''>('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCheckoutProvider || !paymentProvidersQuery.data?.length) return;
    setDefaultCheckoutProvider(paymentProvidersQuery.data[0]);
  }, [defaultCheckoutProvider, paymentProvidersQuery.data]);

  const resourcesById = useMemo(
    () => new Map((resourcesQuery.data?.items ?? []).map((resource) => [resource.id, resource])),
    [resourcesQuery.data?.items]
  );
  const providersById = useMemo(
    () => new Map((providersQuery.data?.items ?? []).map((provider) => [provider.id, provider])),
    [providersQuery.data?.items]
  );

  const bookings = useMemo(() => data?.items ?? [], [data]);
  const pendingPaymentCount = bookings.filter((booking) => booking.payment_status === 'pending' || booking.payment_status === 'failed').length;
  const confirmedCount = bookings.filter((booking) => booking.status === 'confirmed').length;

  const handleCheckout = async (bookingId: string) => {
    if (!defaultCheckoutProvider) return;

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

    setActionError(null);

    try {
      const response = await checkoutMutation.mutateAsync({
        bookingId,
        payload: {
          provider: defaultCheckoutProvider,
          return_url: `${window.location.origin}/payment-callback`,
          website_url: window.location.origin,
          customer_name: fullName || user?.username || undefined,
          customer_email: user?.email ?? undefined,
          customer_phone: user?.phone ?? undefined,
        },
      });

      if (response.payment_url) {
        window.location.assign(response.payment_url);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
        setActionError(error.response.data.detail);
      } else {
        setActionError('Could not continue to checkout for this booking.');
      }
    }
  };

  return (
    <div className="space-y-8">
      <section className="brand-shell relative overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,20,36,0.18)] sm:px-8">
        <div className="night-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">Booking history</p>
              <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Every reservation, payment handoff, and status in one place.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
                Review bookings created from the marketplace, finish pending payments, or cancel slots that no longer fit the plan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/resources">
                <Button className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]">
                  Browse new resources
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Total bookings</p>
              <p className="mt-2 text-3xl font-semibold text-white">{bookings.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Pending payment</p>
              <p className="mt-2 text-3xl font-semibold text-white">{pendingPaymentCount}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Confirmed</p>
              <p className="mt-2 text-3xl font-semibold text-white">{confirmedCount}</p>
            </div>
          </div>
        </div>
      </section>

      {!defaultCheckoutProvider ? (
        <div className="rounded-[28px] border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
          No payment provider is currently configured for redirects. You can still review bookings, but checkout buttons stay disabled until a provider is available.
        </div>
      ) : (
        <div className="rounded-[28px] border border-[rgba(15,20,36,0.08)] bg-white/85 px-5 py-4 text-sm text-gray-600">
          Checkout actions will redirect through <span className="font-medium text-gray-900">{PAYMENT_PROVIDER_LABELS[defaultCheckoutProvider]}</span>.
        </div>
      )}

      {actionError ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[200px] animate-pulse rounded-[28px] bg-white/80" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-[rgba(15,20,36,0.14)] bg-white/80 px-6 py-16 text-center">
          <Ticket className="mx-auto h-8 w-8 text-[var(--brand-copper)]" />
          <h2 className="mt-4 font-display text-3xl text-gray-900">No bookings yet.</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            Head to the resources page to discover live availability and create your first booking.
          </p>
          <Link href="/resources" className="mt-6 inline-flex">
            <Button>Browse resources</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const bookingStatus = getBookingStatusMeta(booking.status);
            const paymentStatus = getPaymentStatusMeta(booking.payment_status);
            const resource = resourcesById.get(booking.resource_id);
            const provider = providersById.get(booking.provider_id);
            const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
            const canCheckout = (booking.payment_status === 'pending' || booking.payment_status === 'failed') && Boolean(defaultCheckoutProvider);

            return (
              <article
                key={booking.id}
                className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,232,0.92))] p-6 shadow-[0_18px_44px_rgba(15,20,36,0.05)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-3xl text-gray-900">{resource?.name ?? `Booking ${booking.id}`}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${bookingStatus.chipClass}`}>
                        {bookingStatus.label}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatus.chipClass}`}>
                        {paymentStatus.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      {provider?.name ?? 'Provider'} · Booking reference {booking.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={!canCheckout || checkoutMutation.isPending}
                      onClick={() => handleCheckout(booking.id)}
                    >
                      {checkoutMutation.isPending && checkoutMutation.variables?.bookingId === booking.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Checkout
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      disabled={!canCancel || cancelMutation.isPending}
                      onClick={() =>
                        cancelMutation.mutate(booking.id, {
                          onError: (error) => {
                            if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
                              setActionError(error.response.data.detail);
                              return;
                            }
                            setActionError('Could not cancel this booking.');
                          },
                          onSuccess: () => setActionError(null),
                        })
                      }
                    >
                      {cancelMutation.isPending && cancelMutation.variables === booking.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Amount</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">{formatCurrency(booking.amount_minor, booking.currency)}</p>
                  </div>
                  <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Created</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">{formatDateLabel(booking.created_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Resource</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">{resource?.timezone ?? 'Timezone unavailable'}</p>
                  </div>
                  <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Checkout rail</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      {defaultCheckoutProvider ? PAYMENT_PROVIDER_LABELS[defaultCheckoutProvider] : 'Not configured'}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isFetching && !isLoading ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,20,36,0.08)] bg-white/80 px-4 py-2 text-xs text-gray-500">
          <CalendarClock className="h-3.5 w-3.5 text-[var(--accent)]" />
          Refreshing booking history…
        </div>
      ) : null}
    </div>
  );
}
