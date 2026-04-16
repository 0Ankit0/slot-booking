'use client';

import { Clock3, Lock, Sparkles } from 'lucide-react';
import type { Slot } from '@/types/booking';
import { formatTimeRange, getSlotStatusMeta, groupSlotsByDay } from '@/lib/marketplace';

interface SlotBrowserProps {
  slots: Slot[];
  selectedSlotId?: string;
  onSelect: (slot: Slot) => void;
  timezone?: string;
}

export function SlotBrowser({ slots, selectedSlotId, onSelect, timezone }: SlotBrowserProps) {
  if (slots.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[rgba(15,20,36,0.14)] bg-[rgba(255,255,255,0.72)] p-8 text-center text-sm text-gray-500">
        <Sparkles className="mx-auto h-6 w-6 text-[var(--brand-copper)]" />
        <p className="mt-3 font-medium text-gray-900">No bookable slots in this window yet.</p>
        <p className="mt-1">Try widening your date range or check back once the provider publishes new availability.</p>
      </div>
    );
  }

  const groups = groupSlotsByDay(slots, timezone);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section
          key={group.key}
          className="overflow-hidden rounded-[28px] border border-[rgba(15,20,36,0.08)] bg-white/85 shadow-[0_12px_30px_rgba(15,20,36,0.05)]"
          style={{ contentVisibility: 'auto' }}
        >
          <div className="flex items-center justify-between border-b border-[rgba(15,20,36,0.08)] bg-[rgba(247,240,228,0.72)] px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Availability</p>
              <h3 className="mt-1 font-display text-xl text-gray-900">{group.label}</h3>
            </div>
            <span className="rounded-full border border-[rgba(20,108,107,0.14)] bg-[rgba(20,108,107,0.08)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
              {group.slots.filter((slot) => slot.status === 'open').length} open
            </span>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {group.slots.map((slot) => {
              const meta = getSlotStatusMeta(slot.status);
              const isSelected = slot.id === selectedSlotId;
              const isOpen = slot.status === 'open';

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => isOpen && onSelect(slot)}
                  disabled={!isOpen}
                  className={`rounded-[24px] border px-4 py-4 text-left transition duration-200 ${meta.buttonClass} ${
                    isSelected
                      ? 'border-[var(--brand-copper)] bg-[rgba(197,138,73,0.1)] shadow-[0_18px_34px_rgba(15,20,36,0.12)]'
                      : ''
                  } ${!isOpen ? 'cursor-not-allowed opacity-80' : ''}`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {isOpen ? <Clock3 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      Slot
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-gray-900">
                    {formatTimeRange(slot.starts_at, slot.ends_at, timezone)}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {slot.hold_expires_at
                      ? `Hold expires ${new Date(slot.hold_expires_at).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`
                      : isOpen
                        ? 'Select this time to build a quote and continue to payment.'
                        : 'Unavailable right now.'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
