'use client';

import { useEffect, useMemo, useState } from 'react';
import { TimerReset } from 'lucide-react';

function formatRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function SlotHoldTimer({ expiresAt }: { expiresAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) {
      return undefined;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const remainingSeconds = useMemo(() => {
    if (!expiresAt) {
      return null;
    }
    const remaining = Math.floor((new Date(expiresAt).getTime() - now) / 1000);
    return remaining > 0 ? remaining : 0;
  }, [expiresAt, now]);

  if (!expiresAt || remainingSeconds === null) {
    return null;
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${
      remainingSeconds < 60
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }`}>
      <div className="flex items-center gap-2">
        <TimerReset className="h-4 w-4" />
        <span className="font-medium">Slot held for you</span>
      </div>
      <p className="mt-1 text-xs">
        Hold expires in <span className="font-semibold">{formatRemaining(remainingSeconds)}</span>.
      </p>
    </div>
  );
}
