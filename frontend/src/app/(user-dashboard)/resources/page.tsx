'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Filter, Search, Ticket } from 'lucide-react';
import { ResourceCard } from '@/components/booking/resource-card';
import { Button } from '@/components/ui/button';
import { useMyBookings, useProviders, useResources } from '@/hooks/use-bookings';
import {
  MARKETPLACE_CATEGORY_OPTIONS,
  formatCompactCurrency,
  resourceMatchesQuery,
} from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth-store';

export default function ResourcesPage() {
  const activeTenant = useAuthStore((state) => state.tenant);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof MARKETPLACE_CATEGORY_OPTIONS)[number]['value']>('all');
  const [providerId, setProviderId] = useState('');
  const deferredSearch = useDeferredValue(search);

  const resourcesQuery = useResources({
    tenant_id: activeTenant?.id,
    q: deferredSearch.trim() || undefined,
    category: category === 'all' ? undefined : category,
    provider_id: providerId || undefined,
    limit: 100,
  });
  const providersQuery = useProviders({ tenant_id: activeTenant?.id, limit: 100 });
  const bookingsQuery = useMyBookings({ tenant_id: activeTenant?.id, limit: 100 });

  const providerMap = useMemo(
    () => new Map((providersQuery.data?.items ?? []).map((provider) => [provider.id, provider])),
    [providersQuery.data?.items]
  );

  const visibleResources = useMemo(() => {
    return (resourcesQuery.data?.items ?? []).filter((resource) => {
      if (category !== 'all' && resource.category !== category) return false;
      if (providerId && resource.provider_id !== providerId) return false;
      return resourceMatchesQuery(resource, providerMap.get(resource.provider_id)?.name, deferredSearch);
    });
  }, [category, deferredSearch, providerId, providerMap, resourcesQuery.data?.items]);

  const lowestPrice = useMemo(() => {
    if (visibleResources.length === 0) return null;
    return Math.min(...visibleResources.map((resource) => resource.base_price_minor));
  }, [visibleResources]);

  const activeBookings = useMemo(
    () => (bookingsQuery.data?.items ?? []).filter((booking) => booking.status === 'pending' || booking.status === 'confirmed').length,
    [bookingsQuery.data?.items]
  );

  const categoryCount = new Set(visibleResources.map((resource) => resource.category)).size;

  return (
    <div className="space-y-8">
      <section className="brand-shell relative overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,20,36,0.18)] sm:px-8">
        <div className="night-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Authenticated marketplace</p>
              <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Find the right room, court, or session — then lock the exact hour.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
                Browse live resources{activeTenant ? ` inside ${activeTenant.name}` : ' across your accessible marketplace'} and jump from discovery to checkout without losing momentum.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/bookings">
                <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  View my bookings
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/46" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search studios, courts, or providers"
                    className="w-full rounded-2xl border border-white/12 bg-black/16 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-white/38 focus:border-[var(--brand-copper)]"
                  />
                </label>

                <label className="relative">
                  <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/46" />
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as (typeof MARKETPLACE_CATEGORY_OPTIONS)[number]['value'])}
                    className="w-full rounded-2xl border border-white/12 bg-black/16 py-3 pl-11 pr-4 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  >
                    {MARKETPLACE_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="text-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <select
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-black/16 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                >
                  <option value="" className="text-gray-900">
                    All providers
                  </option>
                  {(providersQuery.data?.items ?? []).map((provider) => (
                    <option key={provider.id} value={provider.id} className="text-gray-900">
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/56">Live resources</p>
                <p className="mt-2 text-3xl font-semibold text-white">{visibleResources.length}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/56">Categories</p>
                <p className="mt-2 text-3xl font-semibold text-white">{categoryCount || 0}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/56">Starting from</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {lowestPrice === null ? '—' : formatCompactCurrency(lowestPrice, visibleResources[0]?.currency ?? 'USD')}
                </p>
                <p className="mt-2 text-xs text-white/56">{activeBookings} active bookings in your queue</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {MARKETPLACE_CATEGORY_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setCategory(option.value)}
            className={`rounded-[26px] border p-5 text-left transition ${
              category === option.value
                ? 'border-[var(--brand-copper)] bg-[rgba(197,138,73,0.12)] shadow-[0_18px_40px_rgba(15,20,36,0.08)]'
                : 'border-[rgba(15,20,36,0.08)] bg-white/90 hover:border-[rgba(20,108,107,0.18)] hover:bg-[rgba(255,255,255,0.96)]'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{option.label}</p>
            <p className="mt-3 text-sm leading-7 text-gray-600">{option.description}</p>
          </button>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Discovery results</p>
            <h2 className="mt-2 font-display text-4xl text-gray-900">Bookable spaces that match the moment.</h2>
          </div>
          <Link href="/bookings" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:gap-3">
            My recent bookings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {resourcesQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[280px] animate-pulse rounded-[28px] border border-[rgba(15,20,36,0.08)] bg-white/80" />
            ))}
          </div>
        ) : visibleResources.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-[rgba(15,20,36,0.14)] bg-white/75 px-6 py-14 text-center">
            <Ticket className="mx-auto h-8 w-8 text-[var(--brand-copper)]" />
            <h3 className="mt-4 font-display text-3xl text-gray-900">No resources match this mix yet.</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
              Reset the filters or widen the search phrase. The page keeps working even if backend filters are conservative — we apply client-side refinement here as well.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearch('');
                setCategory('all');
                setProviderId('');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                providerName={providerMap.get(resource.provider_id)?.name}
              />
            ))}
          </div>
        )}

        {resourcesQuery.isFetching && !resourcesQuery.isLoading ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,20,36,0.08)] bg-white/80 px-4 py-2 text-xs text-gray-500">
            <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
            Refreshing marketplace view…
          </div>
        ) : null}
      </section>
    </div>
  );
}
