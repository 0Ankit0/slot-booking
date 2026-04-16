'use client';

import axios from 'axios';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { BookingQuoteCard } from '@/components/booking/booking-quote-card';
import { SlotHoldTimer } from '@/components/booking/slot-hold-timer';
import { SlotBrowser } from '@/components/booking/slot-browser';
import { Button } from '@/components/ui/button';
import {
  useBookingQuote,
  useCheckoutBooking,
  useCreateBooking,
  useHoldSlot,
  useProvider,
  useReleaseSlot,
  useResource,
  useSlots,
} from '@/hooks/use-bookings';
import { usePaymentProviders } from '@/hooks/use-finances';
import {
  formatCurrency,
  formatDateLabel,
  formatTimeRange,
  getCategoryLabel,
} from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth-store';
import type { PaymentProvider } from '@/types/payments';

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }

  return fallback;
}

export default function ResourceDetailPage() {
  const params = useParams<{ resourceId: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [windowStart, setWindowStart] = useState(() => toDateInputValue(new Date()));
  const [windowDays, setWindowDays] = useState(7);
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [groupSize, setGroupSize] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [notes, setNotes] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<PaymentProvider | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deferredPromoCode = useDeferredValue(promoCode);
  const resourceId = Array.isArray(params.resourceId) ? params.resourceId[0] : params.resourceId;

  const resourceQuery = useResource(resourceId);
  const providerQuery = useProvider(resourceQuery.data?.provider_id);
  const paymentProvidersQuery = usePaymentProviders();
  const createBooking = useCreateBooking();
  const checkoutBooking = useCheckoutBooking();
  const holdSlot = useHoldSlot();
  const releaseSlot = useReleaseSlot();

  const slotRange = useMemo(() => {
    const start = new Date(`${windowStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + windowDays - 1);
    end.setHours(23, 59, 59, 999);

    return {
      from_ts: start.toISOString(),
      to_ts: end.toISOString(),
    };
  }, [windowDays, windowStart]);

  const slotsQuery = useSlots({
    resource_id: resourceId,
    from_ts: slotRange.from_ts,
    to_ts: slotRange.to_ts,
  });

  const resource = resourceQuery.data;
  const maxGroupSize = resource?.max_group_size ?? 1;
  const safeGroupSize = Math.min(Math.max(groupSize, 1), maxGroupSize);
  const selectedSlot = useMemo(
    () => (slotsQuery.data ?? []).find((slot) => slot.id === selectedSlotId),
    [selectedSlotId, slotsQuery.data]
  );

  useEffect(() => {
    if (!resource) return;
    setGroupSize((current) => Math.min(Math.max(current, 1), resource.max_group_size));
  }, [resource]);

  useEffect(() => {
    if (!(slotsQuery.data ?? []).length) {
      setSelectedSlotId(undefined);
      setHoldExpiresAt(null);
      return;
    }

    const stillAvailable = (slotsQuery.data ?? []).some((slot) => slot.id === selectedSlotId);
    if (!stillAvailable) {
      const firstOpenSlot = (slotsQuery.data ?? []).find((slot) => slot.status === 'open');
      setSelectedSlotId(firstOpenSlot?.id);
      setHoldExpiresAt(firstOpenSlot?.hold_expires_at ?? null);
    }
  }, [selectedSlotId, slotsQuery.data]);

  useEffect(() => {
    if (selectedPaymentProvider || !paymentProvidersQuery.data?.length) return;
    setSelectedPaymentProvider(paymentProvidersQuery.data[0]);
  }, [paymentProvidersQuery.data, selectedPaymentProvider]);

  useEffect(() => {
    return () => {
      if (selectedSlotId && holdExpiresAt) {
        releaseSlot.mutate(selectedSlotId);
      }
    };
  }, [holdExpiresAt, releaseSlot, selectedSlotId]);

  const quoteQuery = useBookingQuote(
    resource && selectedSlot
      ? {
          tenant_id: resource.tenant_id,
          resource_id: resource.id,
          amount_minor: resource.base_price_minor,
          promo_code: deferredPromoCode.trim() || undefined,
          group_size: safeGroupSize,
        }
      : undefined
  );

  const handleSelectSlot = async (slotId: string) => {
    const slot = (slotsQuery.data ?? []).find((item) => item.id === slotId);
    if (!slot || slot.status !== 'open') {
      return;
    }

    if (slot.id === selectedSlotId && holdExpiresAt) {
      return;
    }

    setErrorMessage(null);

    try {
      if (selectedSlotId && holdExpiresAt) {
        await releaseSlot.mutateAsync(selectedSlotId);
      }

      const hold = await holdSlot.mutateAsync(slot.id);
      setSelectedSlotId(slot.id);
      setHoldExpiresAt(hold.hold_expires_at ?? slot.hold_expires_at ?? null);
      void slotsQuery.refetch();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'We could not secure that slot. Try another time or refresh the availability window.')
      );
      void slotsQuery.refetch();
    }
  };

  const handleReserve = async (mode: 'checkout' | 'booking') => {
    if (!resource || !selectedSlot) return;

    setErrorMessage(null);

    try {
      const booking = await createBooking.mutateAsync({
        tenant_id: resource.tenant_id,
        provider_id: resource.provider_id,
        resource_id: resource.id,
        slot_id: selectedSlot.id,
        amount_minor: quoteQuery.data?.final_amount_minor ?? resource.base_price_minor,
        currency: resource.currency,
        notes: notes.trim() || undefined,
      });

      if (mode === 'checkout' && selectedPaymentProvider) {
        const checkout = await checkoutBooking.mutateAsync({
          bookingId: booking.id,
          payload: {
            provider: selectedPaymentProvider,
            return_url: `${window.location.origin}/payment-callback?provider=${selectedPaymentProvider}&next=/bookings`,
            website_url: window.location.origin,
            customer_name:
              [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || undefined,
            customer_email: user?.email ?? undefined,
            customer_phone: user?.phone ?? undefined,
          },
        });

        if (checkout.payment_url) {
          window.location.assign(checkout.payment_url);
          return;
        }
      }

      router.push('/bookings');
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          mode === 'checkout'
            ? 'We could not move this booking into checkout. Try again or create it without redirect.'
            : 'We could not save the booking. Please try another slot or refresh the page.'
        )
      );
    }
  };

  if (resourceQuery.isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-20 animate-pulse rounded-[32px] bg-white/80" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[560px] animate-pulse rounded-[32px] bg-white/80" />
          <div className="h-[560px] animate-pulse rounded-[32px] bg-[rgba(15,20,36,0.9)]" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="rounded-[36px] border border-dashed border-[rgba(15,20,36,0.14)] bg-white/80 px-6 py-16 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-[var(--brand-copper)]" />
        <h1 className="mt-4 font-display text-4xl text-gray-900">This resource is not available right now.</h1>
        <p className="mt-3 text-sm leading-7 text-gray-600">It may have been removed, renamed, or filtered from your current marketplace view.</p>
        <Link href="/resources" className="mt-6 inline-flex">
          <Button>Back to resources</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,232,0.94))] p-6 shadow-[0_24px_60px_rgba(15,20,36,0.08)] sm:p-8">
        <div className="schedule-grid absolute inset-0 opacity-50" />
        <div className="relative">
          <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:gap-3">
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-[rgba(197,138,73,0.24)] bg-[rgba(197,138,73,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-night)]">
                {getCategoryLabel(resource.category)}
              </div>
              <h1 className="mt-4 font-display text-4xl text-gray-900 sm:text-5xl">{resource.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                {resource.description || 'A high-intent listing with live slot browsing, transparent quote breakdowns, and a direct checkout handoff.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-white/82 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Hosted by</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{providerQuery.data?.name ?? 'Provider'}</p>
              </div>
              <div className="rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-white/82 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Starting rate</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{formatCurrency(resource.base_price_minor, resource.currency)}</p>
              </div>
              <div className="rounded-[24px] border border-[rgba(15,20,36,0.08)] bg-white/82 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Group size</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">Up to {resource.max_group_size}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 rounded-[28px] border border-[rgba(15,20,36,0.08)] bg-white/78 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[rgba(20,108,107,0.08)] p-3 text-[var(--accent)]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Booking window</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{formatDateLabel(slotRange.from_ts)} → {formatDateLabel(slotRange.to_ts)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[rgba(197,138,73,0.12)] p-3 text-[var(--brand-copper)]">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Timezone</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{resource.timezone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[rgba(20,108,107,0.08)] p-3 text-[var(--accent)]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Selected group size</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{safeGroupSize} guest{safeGroupSize === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[rgba(197,138,73,0.12)] p-3 text-[var(--brand-copper)]">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Selected slot</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {selectedSlot ? formatTimeRange(selectedSlot.starts_at, selectedSlot.ends_at, resource.timezone) : 'Choose a live slot'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-white/90 p-5 shadow-[0_16px_42px_rgba(15,20,36,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Slot browser</p>
                <h2 className="mt-2 font-display text-3xl text-gray-900">Browse the next available windows.</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-[180px_140px]">
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Start date</span>
                  <input
                    type="date"
                    value={windowStart}
                    onChange={(event) => setWindowStart(event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Days ahead</span>
                  <select
                    value={windowDays}
                    onChange={(event) => setWindowDays(Number(event.target.value))}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  >
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {slotsQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[220px] animate-pulse rounded-[30px] bg-white/80" />
              ))}
            </div>
          ) : (
            <SlotBrowser
              slots={slotsQuery.data ?? []}
              selectedSlotId={selectedSlotId}
              onSelect={(slot) => void handleSelectSlot(slot.id)}
              timezone={resource.timezone}
            />
          )}

          {selectedSlot ? (
            <div className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-white/90 p-5 shadow-[0_16px_42px_rgba(15,20,36,0.06)]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[rgba(20,108,107,0.08)] p-3 text-[var(--accent)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Selected booking window</p>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    {formatDateLabel(selectedSlot.starts_at, { weekday: 'long', month: 'short', day: 'numeric' }, resource.timezone)}
                    {' · '}
                    {formatTimeRange(selectedSlot.starts_at, selectedSlot.ends_at, resource.timezone)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <SlotHoldTimer expiresAt={holdExpiresAt ?? selectedSlot.hold_expires_at ?? null} />
              </div>
            </div>
          ) : null}
        </section>

        <BookingQuoteCard
          resource={resource}
          selectedSlot={selectedSlot}
          quote={quoteQuery.data}
          groupSize={safeGroupSize}
          promoCode={promoCode}
          notes={notes}
          paymentProviders={paymentProvidersQuery.data ?? []}
          selectedPaymentProvider={selectedPaymentProvider}
          onGroupSizeChange={(value) => setGroupSize(Number.isFinite(value) ? value : 1)}
          onPromoCodeChange={setPromoCode}
          onNotesChange={setNotes}
          onPaymentProviderChange={setSelectedPaymentProvider}
          onReserve={handleReserve}
          isSubmitting={createBooking.isPending || checkoutBooking.isPending}
          isQuoteLoading={quoteQuery.isFetching}
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}
