import type {
  BookingPaymentStatus,
  BookingProviderStatus,
  BookingStatus,
  Resource,
  Slot,
  SlotStatus,
} from '@/types/booking';
import type { PaymentProvider } from '@/types/payments';

export const MARKETPLACE_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All spaces', description: 'Studios, courts, rooms, and focused work nooks.' },
  { value: 'studio', label: 'Studios', description: 'Photo sets, rehearsal rooms, podcast booths.' },
  { value: 'court', label: 'Courts', description: 'Training sessions, leagues, and drop-in play.' },
  { value: 'workspace', label: 'Workspaces', description: 'Day desks, strategy rooms, and team pods.' },
  { value: 'wellness', label: 'Wellness', description: 'Recovery suites, mats, reformers, and treatment rooms.' },
  { value: 'events', label: 'Events', description: 'Tastings, workshops, meetings, and private gatherings.' },
] as const;

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  khalti: 'Khalti',
  esewa: 'eSewa',
  stripe: 'Stripe',
  paypal: 'PayPal',
};

export function formatCurrency(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function formatCompactCurrency(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amountMinor / 100);
  } catch {
    return formatCurrency(amountMinor, currency);
  }
}

export function formatDateLabel(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
  timeZone?: string
) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
    timeZone,
  }).format(new Date(value));
}

export function formatTimeRange(start: string | Date, end: string | Date, timeZone?: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });

  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

export function getCategoryLabel(category: string) {
  const normalized = category?.trim();
  if (!normalized) return 'General';

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}`)
    .join(' ');
}

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function resourceMatchesQuery(resource: Resource, providerName: string | undefined, query: string) {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;

  return [
    resource.name,
    resource.description,
    resource.category,
    providerName,
  ]
    .filter(Boolean)
    .some((field) => field?.toLowerCase().includes(normalized));
}

export function getProviderStatusMeta(status: BookingProviderStatus) {
  switch (status) {
    case 'approved':
      return {
        label: 'Approved',
        chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'suspended':
      return {
        label: 'Suspended',
        chipClass: 'border-red-200 bg-red-50 text-red-700',
      };
    case 'pending':
    default:
      return {
        label: 'Pending review',
        chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
      };
  }
}

export function getSlotStatusMeta(status: SlotStatus) {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        buttonClass:
          'border-emerald-200 bg-white text-gray-900 hover:-translate-y-0.5 hover:border-[var(--brand-copper)] hover:shadow-[0_12px_30px_rgba(15,20,36,0.08)]',
      };
    case 'held':
      return {
        label: 'Held',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        buttonClass: 'border-amber-200 bg-amber-50/80 text-amber-800',
      };
    case 'booked':
      return {
        label: 'Booked',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        buttonClass: 'border-red-200 bg-red-50/80 text-red-800',
      };
    case 'blocked':
    default:
      return {
        label: 'Blocked',
        badgeClass: 'border-gray-200 bg-gray-100 text-gray-600',
        buttonClass: 'border-gray-200 bg-gray-100 text-gray-500',
      };
  }
}

export function getBookingStatusMeta(status: BookingStatus) {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'completed':
      return {
        label: 'Completed',
        chipClass: 'border-[var(--brand-copper)] bg-[rgba(197,138,73,0.14)] text-[var(--brand-night)]',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        chipClass: 'border-red-200 bg-red-50 text-red-700',
      };
    case 'no_show':
      return {
        label: 'No show',
        chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        chipClass: 'border-blue-200 bg-blue-50 text-blue-700',
      };
  }
}

export function getPaymentStatusMeta(status: BookingPaymentStatus) {
  switch (status) {
    case 'completed':
      return {
        label: 'Paid',
        chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'failed':
      return {
        label: 'Payment failed',
        chipClass: 'border-red-200 bg-red-50 text-red-700',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    case 'pending':
    default:
      return {
        label: 'Awaiting payment',
        chipClass: 'border-blue-200 bg-blue-50 text-blue-700',
      };
  }
}

export function groupSlotsByDay(slots: Slot[], timeZone?: string) {
  const groups = new Map<string, { label: string; slots: Slot[] }>();

  slots.forEach((slot) => {
    const key = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).format(new Date(slot.starts_at));

    if (!groups.has(key)) {
      groups.set(key, {
        label: formatDateLabel(slot.starts_at, { weekday: 'long', month: 'short', day: 'numeric' }, timeZone),
        slots: [],
      });
    }

    groups.get(key)?.slots.push(slot);
  });

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    slots: value.slots,
  }));
}
