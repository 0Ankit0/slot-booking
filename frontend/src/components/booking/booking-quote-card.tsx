'use client';

import { CreditCard, Loader2, ReceiptText, ShieldCheck, TicketPercent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookingQuote, Resource, Slot } from '@/types/booking';
import type { PaymentProvider } from '@/types/payments';
import { PAYMENT_PROVIDER_LABELS, formatCurrency, formatDateLabel, formatTimeRange } from '@/lib/marketplace';

interface BookingQuoteCardProps {
  resource: Resource;
  selectedSlot?: Slot;
  quote?: BookingQuote;
  groupSize: number;
  promoCode: string;
  notes: string;
  paymentProviders: PaymentProvider[];
  selectedPaymentProvider: PaymentProvider | '';
  onGroupSizeChange: (value: number) => void;
  onPromoCodeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onPaymentProviderChange: (value: PaymentProvider | '') => void;
  onReserve: (mode: 'checkout' | 'booking') => void;
  isSubmitting: boolean;
  isQuoteLoading: boolean;
  errorMessage?: string | null;
}

export function BookingQuoteCard({
  resource,
  selectedSlot,
  quote,
  groupSize,
  promoCode,
  notes,
  paymentProviders,
  selectedPaymentProvider,
  onGroupSizeChange,
  onPromoCodeChange,
  onNotesChange,
  onPaymentProviderChange,
  onReserve,
  isSubmitting,
  isQuoteLoading,
  errorMessage,
}: BookingQuoteCardProps) {
  const canCheckout = paymentProviders.length > 0 && Boolean(selectedPaymentProvider);

  return (
    <aside className="sticky top-24 overflow-hidden rounded-[32px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(15,20,36,0.98),rgba(22,31,53,0.95))] p-6 text-white shadow-[0_28px_80px_rgba(15,20,36,0.24)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(197,138,73,0.22),transparent_48%)]" />
      <div className="relative space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Checkout studio</p>
          <h2 className="mt-2 font-display text-3xl text-white">Shape the booking.</h2>
          <p className="mt-2 text-sm leading-6 text-white/72">
            Choose the party size, preview the total, and decide whether to head straight into payment.
          </p>
        </div>

        <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Group size</span>
              <input
                type="number"
                min={1}
                max={resource.max_group_size}
                value={groupSize}
                onChange={(event) => onGroupSizeChange(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Promo code</span>
              <div className="relative">
                <TicketPercent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => onPromoCodeChange(event.target.value.toUpperCase())}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-white/35 focus:border-[var(--brand-copper)]"
                />
              </div>
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Booking note</span>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="Share setup requests, arrival notes, or anything the host should know."
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[var(--brand-copper)]"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Payment provider</span>
            <select
              value={selectedPaymentProvider}
              onChange={(event) => onPaymentProviderChange(event.target.value as PaymentProvider | '')}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
            >
              <option value="" className="text-gray-900">
                {paymentProviders.length > 0 ? 'Choose a provider' : 'No providers configured'}
              </option>
              {paymentProviders.map((provider) => (
                <option key={provider} value={provider} className="text-gray-900">
                  {PAYMENT_PROVIDER_LABELS[provider]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/18 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
            <ReceiptText className="h-4 w-4" />
            Quote breakdown
          </div>

          {selectedSlot ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/6 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Selected slot</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatDateLabel(selectedSlot.starts_at, { weekday: 'long', month: 'short', day: 'numeric' }, resource.timezone)}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {formatTimeRange(selectedSlot.starts_at, selectedSlot.ends_at, resource.timezone)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/68">Pick a live slot on the left to unlock the live quote.</p>
          )}

          <div className="mt-4 space-y-3 text-sm text-white/74">
            <div className="flex items-center justify-between">
              <span>Base rate</span>
              <span>{formatCurrency(resource.base_price_minor, resource.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Group surcharge</span>
              <span>{quote ? formatCurrency(quote.group_surcharge_minor, resource.currency) : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Promo savings</span>
              <span>{quote ? `-${formatCurrency(quote.promo_discount_minor, resource.currency)}` : '—'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
              <span>Total due</span>
              <span>
                {isQuoteLoading
                  ? 'Refreshing…'
                  : formatCurrency(quote?.final_amount_minor ?? resource.base_price_minor, resource.currency)}
              </span>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-400/12 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]"
            disabled={!selectedSlot || !canCheckout || isSubmitting}
            onClick={() => onReserve('checkout')}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Create booking & checkout
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full border-white/20 text-white hover:bg-white/8"
            disabled={!selectedSlot || isSubmitting}
            onClick={() => onReserve('booking')}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Save booking without redirect
          </Button>
        </div>
      </div>
    </aside>
  );
}
