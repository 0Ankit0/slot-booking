import Link from 'next/link';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Camera,
  Dumbbell,
  Sparkles,
  Users,
} from 'lucide-react';
import type { Resource } from '@/types/booking';
import { formatCurrency, getCategoryLabel } from '@/lib/marketplace';

function CategoryBadge({ category }: { category: string }) {
  switch (category.toLowerCase()) {
    case 'studio':
      return <Camera className="h-6 w-6" />;
    case 'court':
      return <Dumbbell className="h-6 w-6" />;
    case 'workspace':
      return <BriefcaseBusiness className="h-6 w-6" />;
    case 'wellness':
      return <Sparkles className="h-6 w-6" />;
    case 'events':
      return <CalendarClock className="h-6 w-6" />;
    default:
      return <Building2 className="h-6 w-6" />;
  }
}

interface ResourceCardProps {
  resource: Resource;
  providerName?: string;
}

export function ResourceCard({ resource, providerName }: ResourceCardProps) {
  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group relative overflow-hidden rounded-[28px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,242,232,0.98))] p-6 shadow-[0_16px_40px_rgba(15,20,36,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-copper)] hover:shadow-[0_28px_60px_rgba(15,20,36,0.14)]"
      style={{ contentVisibility: 'auto' }}
    >
      <div className="schedule-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="absolute right-5 top-5 rounded-full border border-[rgba(197,138,73,0.28)] bg-[rgba(197,138,73,0.1)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-night)]">
        {getCategoryLabel(resource.category)}
      </div>

      <div className="relative flex h-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-[20px] border border-[rgba(20,108,107,0.18)] bg-[rgba(20,108,107,0.08)] p-3 text-[var(--accent)]">
            <CategoryBadge category={resource.category} />
          </div>
          <ArrowUpRight className="h-5 w-5 text-[var(--brand-copper)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        <div>
          <h3 className="font-display text-2xl text-gray-900">{resource.name}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{resource.description || 'A polished venue with live slot availability and instant checkout.'}</p>
        </div>

        <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200/70 bg-white/75 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Starting from</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {formatCurrency(resource.base_price_minor, resource.currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200/70 bg-white/75 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Group size</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Users className="h-4 w-4 text-[var(--brand-copper)]" />
              Up to {resource.max_group_size}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[rgba(15,20,36,0.08)] pt-4 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Hosted by</p>
            <p className="mt-1 font-medium text-gray-900">{providerName ?? 'Independent provider'}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Timezone</p>
            <p className="mt-1 font-medium text-gray-900">{resource.timezone}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
