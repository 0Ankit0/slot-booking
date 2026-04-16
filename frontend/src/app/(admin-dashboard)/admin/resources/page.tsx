'use client';

import axios from 'axios';
import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Pencil, Plus, Search, Store, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  useCreateResource,
  useDeleteResource,
  useProviders,
  useResources,
  useUpdateResource,
} from '@/hooks/use-bookings';
import {
  MARKETPLACE_CATEGORY_OPTIONS,
  formatCurrency,
  getCategoryLabel,
  normalizeSearch,
  resourceMatchesQuery,
} from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth-store';
import type { Resource } from '@/types/booking';

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }

  return fallback;
}

type AvailabilityFilter = 'all' | 'active' | 'inactive';

type ResourceFormState = {
  provider_id: string;
  name: string;
  description: string;
  category: string;
  timezone: string;
  price_major: string;
  currency: string;
  max_group_size: string;
  is_active: boolean;
};

function buildFormState(resource?: Resource | null): ResourceFormState {
  return {
    provider_id: resource?.provider_id ?? '',
    name: resource?.name ?? '',
    description: resource?.description ?? '',
    category: resource?.category ?? 'general',
    timezone: resource?.timezone ?? 'UTC',
    price_major: resource ? String(resource.base_price_minor / 100) : '0',
    currency: resource?.currency ?? 'USD',
    max_group_size: resource ? String(resource.max_group_size) : '1',
    is_active: resource?.is_active ?? true,
  };
}

export default function AdminResourcesPage() {
  const activeTenant = useAuthStore((state) => state.tenant);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState('');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceFormState>(() => buildFormState());
  const [formError, setFormError] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);

  const providersQuery = useProviders({ tenant_id: activeTenant?.id, limit: 100 });
  const resourcesQuery = useResources({
    tenant_id: activeTenant?.id,
    provider_id: providerFilter || undefined,
    q: deferredSearch.trim() || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    include_inactive: availability !== 'active',
    limit: 100,
  });

  const providerMap = useMemo(
    () => new Map((providersQuery.data?.items ?? []).map((provider) => [provider.id, provider])),
    [providersQuery.data?.items]
  );

  const visibleResources = useMemo(() => {
    const query = normalizeSearch(deferredSearch);

    return (resourcesQuery.data?.items ?? []).filter((resource) => {
      if (categoryFilter !== 'all' && resource.category !== categoryFilter) return false;
      if (providerFilter && resource.provider_id !== providerFilter) return false;
      if (availability === 'active' && !resource.is_active) return false;
      if (availability === 'inactive' && resource.is_active) return false;
      return resourceMatchesQuery(resource, providerMap.get(resource.provider_id)?.name, query);
    });
  }, [availability, categoryFilter, deferredSearch, providerFilter, providerMap, resourcesQuery.data?.items]);

  const stats = useMemo(() => {
    const resources = resourcesQuery.data?.items ?? [];
    return {
      total: resources.length,
      active: resources.filter((resource) => resource.is_active).length,
      inactive: resources.filter((resource) => !resource.is_active).length,
    };
  }, [resourcesQuery.data?.items]);

  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  const selectedProvider = form.provider_id ? providerMap.get(form.provider_id) : undefined;

  const resetComposer = () => {
    setEditingResource(null);
    setForm(buildFormState());
    setFormError(null);
  };

  const submitDisabled =
    !form.provider_id ||
    form.name.trim().length < 2 ||
    Number(form.max_group_size) < 1 ||
    Number.isNaN(Number(form.price_major)) ||
    createResource.isPending ||
    updateResource.isPending;

  const handleSubmit = async () => {
    const provider = providerMap.get(form.provider_id);
    if (!provider) {
      setFormError('Select a provider before saving the resource.');
      return;
    }

    setFormError(null);

    try {
      const createPayload = {
        provider_id: provider.id,
        tenant_id: provider.tenant_id,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || 'general',
        timezone: form.timezone.trim() || 'UTC',
        base_price_minor: Math.max(0, Math.round(Number(form.price_major) * 100)),
        currency: form.currency.trim().toUpperCase() || 'USD',
        max_group_size: Math.max(1, Number(form.max_group_size)),
      };

      if (editingResource) {
        const updated = await updateResource.mutateAsync({
          resourceId: editingResource.id,
          payload: {
            name: createPayload.name,
            description: createPayload.description,
            category: createPayload.category,
            timezone: createPayload.timezone,
            base_price_minor: createPayload.base_price_minor,
            currency: createPayload.currency,
            max_group_size: createPayload.max_group_size,
            is_active: form.is_active,
          },
        });
        setEditingResource(updated);
        setForm(buildFormState(updated));
      } else {
        await createResource.mutateAsync(createPayload);
        resetComposer();
      }
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          editingResource
            ? 'Could not update the resource. Check provider ownership or required fields.'
            : 'Could not create the resource. Make sure the provider and price details are valid.'
        )
      );
    }
  };

  const handleDelete = async () => {
    if (!resourceToDelete) return;

    try {
      await deleteResource.mutateAsync(resourceToDelete.id);
      if (editingResource?.id === resourceToDelete.id) {
        resetComposer();
      }
      setResourceToDelete(null);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Could not delete this resource.'));
      setResourceToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="brand-shell relative overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,20,36,0.18)] sm:px-8">
        <div className="night-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">Admin marketplace controls</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Resource management built for practical inventory ops.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            Create the spaces customers actually browse, connect them to providers, and keep pricing, availability labels, and activation state tidy.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Total resources</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Active</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.active}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Inactive</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,20,36,0.06)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative md:col-span-2 xl:col-span-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search resources"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-11 py-3 outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              >
                {MARKETPLACE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              >
                <option value="">All providers</option>
                {(providersQuery.data?.items ?? []).map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>

              <select
                value={availability}
                onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              >
                <option value="all">All availability states</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
          </div>

          {resourcesQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[220px] animate-pulse rounded-[28px] bg-white/80" />
              ))}
            </div>
          ) : visibleResources.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-[rgba(15,20,36,0.14)] bg-white/80 px-6 py-14 text-center">
              <Store className="mx-auto h-8 w-8 text-[var(--brand-copper)]" />
              <h2 className="mt-4 font-display text-3xl text-gray-900">No resources match this view.</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Adjust filters or create a new resource in the composer. Inactive resources remain available for editing whenever backend filtering is limited.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleResources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,232,0.92))] p-6 shadow-[0_18px_44px_rgba(15,20,36,0.05)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-display text-3xl text-gray-900">{resource.name}</h2>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${resource.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {resource.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="rounded-full border border-[rgba(197,138,73,0.24)] bg-[rgba(197,138,73,0.12)] px-3 py-1 text-xs font-semibold text-[var(--brand-night)]">
                          {getCategoryLabel(resource.category)}
                        </span>
                      </div>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
                        {resource.description || 'No description yet. Add positioning, atmosphere, or operational guidance to sharpen the listing.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/resources/${resource.id}`}>
                        <Button variant="outline">
                          Open live page
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingResource(resource);
                          setForm(buildFormState(resource));
                          setFormError(null);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setResourceToDelete(resource)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Provider</p>
                      <p className="mt-2 text-sm font-medium text-gray-900">{providerMap.get(resource.provider_id)?.name ?? 'Unknown provider'}</p>
                    </div>
                    <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Rate</p>
                      <p className="mt-2 text-sm font-medium text-gray-900">{formatCurrency(resource.base_price_minor, resource.currency)}</p>
                    </div>
                    <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Group size</p>
                      <p className="mt-2 text-sm font-medium text-gray-900">Up to {resource.max_group_size}</p>
                    </div>
                    <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Timezone</p>
                      <p className="mt-2 text-sm font-medium text-gray-900">{resource.timezone}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-[32px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(15,20,36,0.98),rgba(22,31,53,0.95))] p-6 text-white shadow-[0_24px_70px_rgba(15,20,36,0.2)]">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  {editingResource ? 'Editing resource' : 'Create resource'}
                </p>
                <h2 className="mt-2 font-display text-3xl text-white">
                  {editingResource ? editingResource.name : 'Compose a new listing'}
                </h2>
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={resetComposer}>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </div>

            <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
              <label className="space-y-2 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Provider</span>
                <select
                  value={form.provider_id}
                  onChange={(event) => setForm((current) => ({ ...current, provider_id: event.target.value }))}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                >
                  <option value="" className="text-gray-900">
                    Select a provider
                  </option>
                  {(providersQuery.data?.items ?? []).map((provider) => (
                    <option key={provider.id} value={provider.id} className="text-gray-900">
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Resource name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Category</span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  >
                    {MARKETPLACE_CATEGORY_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                      <option key={option.value} value={option.value} className="text-gray-900">
                        {option.label}
                      </option>
                    ))}
                    <option value="general" className="text-gray-900">
                      General
                    </option>
                  </select>
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="Describe the atmosphere, use cases, and why this listing converts."
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/34 focus:border-[var(--brand-copper)]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Timezone</span>
                  <input
                    value={form.timezone}
                    onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Currency</span>
                  <input
                    value={form.currency}
                    onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Base price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price_major}
                    onChange={(event) => setForm((current) => ({ ...current, price_major: event.target.value }))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Max group size</span>
                  <input
                    type="number"
                    min="1"
                    value={form.max_group_size}
                    onChange={(event) => setForm((current) => ({ ...current, max_group_size: event.target.value }))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  />
                </label>
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">Resource is active</p>
                  <p className="mt-1 text-xs text-white/56">Inactive resources remain editable but drop from default discovery lists.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/20"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/70">
                Tenant source: <span className="font-medium text-white">{selectedProvider?.tenant_id ?? 'Select a provider first'}</span>
              </div>

              {formError ? (
                <div className="rounded-2xl border border-red-400/40 bg-red-400/12 px-4 py-3 text-sm text-red-100">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitDisabled}
                  isLoading={createResource.isPending || updateResource.isPending}
                  className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]"
                >
                  {editingResource ? 'Save resource changes' : 'Create resource'}
                </Button>
                {editingResource ? (
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={resetComposer}>
                    Cancel editing
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(resourceToDelete)}
        title="Delete resource?"
        description={`This permanently removes ${resourceToDelete?.name ?? 'this resource'} from the marketplace.`}
        confirmLabel="Delete resource"
        onConfirm={handleDelete}
        onCancel={() => setResourceToDelete(null)}
        isLoading={deleteResource.isPending}
      />
    </div>
  );
}
