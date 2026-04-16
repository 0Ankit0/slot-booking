'use client';

import axios from 'axios';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  useCreateProvider,
  useDeleteProvider,
  useProviders,
  useResources,
  useUpdateProvider,
} from '@/hooks/use-bookings';
import { useTenants } from '@/hooks/use-tenants';
import { getProviderStatusMeta, normalizeSearch } from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth-store';
import type { Provider } from '@/types/booking';

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }

  return fallback;
}

type ProviderFormState = {
  tenant_id: string;
  name: string;
  description: string;
  status: Provider['status'];
};

function buildFormState(provider?: Provider | null, tenantId?: string | null): ProviderFormState {
  return {
    tenant_id: provider?.tenant_id ?? tenantId ?? '',
    name: provider?.name ?? '',
    description: provider?.description ?? '',
    status: provider?.status ?? 'pending',
  };
}

export default function AdminProvidersPage() {
  const activeTenant = useAuthStore((state) => state.tenant);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Provider['status']>('all');
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState<ProviderFormState>(() => buildFormState(null, activeTenant?.id));
  const [formError, setFormError] = useState<string | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

  const deferredSearch = useDeferredValue(search);

  const tenantsQuery = useTenants({ limit: 100 });
  const providersQuery = useProviders({
    tenant_id: activeTenant?.id,
    q: deferredSearch.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 100,
  });
  const resourcesQuery = useResources({
    tenant_id: activeTenant?.id,
    include_inactive: true,
    limit: 100,
  });

  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();

  useEffect(() => {
    if (!editingProvider) {
      setForm((current) => ({
        ...current,
        tenant_id: current.tenant_id || activeTenant?.id || tenantsQuery.data?.items[0]?.id || '',
      }));
    }
  }, [activeTenant?.id, editingProvider, tenantsQuery.data?.items]);

  const providerResourceCount = useMemo(() => {
    const counts = new Map<string, number>();
    (resourcesQuery.data?.items ?? []).forEach((resource) => {
      counts.set(resource.provider_id, (counts.get(resource.provider_id) ?? 0) + 1);
    });
    return counts;
  }, [resourcesQuery.data?.items]);

  const visibleProviders = useMemo(() => {
    const query = normalizeSearch(deferredSearch);

    return (providersQuery.data?.items ?? []).filter((provider) => {
      if (statusFilter !== 'all' && provider.status !== statusFilter) return false;
      if (!query) return true;

      return [provider.name, provider.description]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query));
    });
  }, [deferredSearch, providersQuery.data?.items, statusFilter]);

  const stats = useMemo(() => {
    const providers = providersQuery.data?.items ?? [];
    return {
      total: providers.length,
      approved: providers.filter((provider) => provider.status === 'approved').length,
      pending: providers.filter((provider) => provider.status === 'pending').length,
    };
  }, [providersQuery.data?.items]);

  const resetComposer = () => {
    setEditingProvider(null);
    setForm(buildFormState(null, activeTenant?.id ?? tenantsQuery.data?.items[0]?.id));
    setFormError(null);
  };

  const submitDisabled =
    !form.tenant_id.trim() ||
    form.name.trim().length < 2 ||
    createProvider.isPending ||
    updateProvider.isPending;

  const handleSubmit = async () => {
    setFormError(null);

    try {
      if (editingProvider) {
        const updated = await updateProvider.mutateAsync({
          providerId: editingProvider.id,
          payload: {
            name: form.name.trim(),
            description: form.description.trim(),
            status: form.status,
          },
        });
        setEditingProvider(updated);
        setForm(buildFormState(updated, updated.tenant_id));
      } else {
        await createProvider.mutateAsync({
          tenant_id: form.tenant_id,
          name: form.name.trim(),
          description: form.description.trim(),
        });
        resetComposer();
      }
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          editingProvider
            ? 'Could not update the provider. Backend ownership rules may restrict this action.'
            : 'Could not create the provider. Check the tenant selection and try again.'
        )
      );
    }
  };

  const handleDelete = async () => {
    if (!providerToDelete) return;

    try {
      await deleteProvider.mutateAsync(providerToDelete.id);
      if (editingProvider?.id === providerToDelete.id) {
        resetComposer();
      }
      setProviderToDelete(null);
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          'Could not delete this provider. Backend policies may require the original creator to perform deletion.'
        )
      );
      setProviderToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="brand-shell relative overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,20,36,0.18)] sm:px-8">
        <div className="night-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">Admin marketplace controls</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Provider management with tenant-aware controls.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            Review provider readiness, assign new providers to the right tenant, and keep marketplace supply healthy without leaving the dashboard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Total providers</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Approved</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.approved}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Pending review</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.pending}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,20,36,0.06)]">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search providers"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-11 py-3 outline-none transition focus:border-[var(--accent)]"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | Provider['status'])}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending review</option>
                <option value="approved">Approved</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {providersQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[180px] animate-pulse rounded-[28px] bg-white/80" />
              ))}
            </div>
          ) : visibleProviders.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-[rgba(15,20,36,0.14)] bg-white/80 px-6 py-14 text-center">
              <Building2 className="mx-auto h-8 w-8 text-[var(--brand-copper)]" />
              <h2 className="mt-4 font-display text-3xl text-gray-900">No providers match this filter.</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Reset the filters or create a new provider to start building out your marketplace supply.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleProviders.map((provider) => {
                const status = getProviderStatusMeta(provider.status);

                return (
                  <article
                    key={provider.id}
                    className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,232,0.92))] p-6 shadow-[0_18px_44px_rgba(15,20,36,0.05)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="font-display text-3xl text-gray-900">{provider.name}</h2>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.chipClass}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
                          {provider.description || 'No provider description yet. Use the editor to define tone, specialties, and positioning.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingProvider(provider);
                            setForm(buildFormState(provider, provider.tenant_id));
                            setFormError(null);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setProviderToDelete(provider)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Tenant</p>
                        <p className="mt-2 text-sm font-medium text-gray-900">{provider.tenant_id}</p>
                      </div>
                      <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Resources</p>
                        <p className="mt-2 text-sm font-medium text-gray-900">{providerResourceCount.get(provider.id) ?? 0} linked resources</p>
                      </div>
                      <div className="rounded-2xl border border-[rgba(15,20,36,0.08)] bg-white/72 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Admin note</p>
                        <p className="mt-2 text-sm font-medium text-gray-900">Use edit mode to manage review status.</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rounded-[32px] border border-[rgba(15,20,36,0.08)] bg-[linear-gradient(180deg,rgba(15,20,36,0.98),rgba(22,31,53,0.95))] p-6 text-white shadow-[0_24px_70px_rgba(15,20,36,0.2)]">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  {editingProvider ? 'Editing provider' : 'Create provider'}
                </p>
                <h2 className="mt-2 font-display text-3xl text-white">
                  {editingProvider ? editingProvider.name : 'Add a new marketplace host'}
                </h2>
              </div>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  if (editingProvider) {
                    resetComposer();
                  } else {
                    setForm(buildFormState(null, activeTenant?.id ?? tenantsQuery.data?.items[0]?.id));
                    setFormError(null);
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {editingProvider ? 'New' : 'Reset'}
              </Button>
            </div>

            <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
              <label className="space-y-2 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Tenant</span>
                <select
                  value={form.tenant_id}
                  onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}
                  disabled={Boolean(editingProvider)}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="" className="text-gray-900">
                    Select a tenant
                  </option>
                  {(tenantsQuery.data?.items ?? []).map((tenant) => (
                    <option key={tenant.id} value={tenant.id} className="text-gray-900">
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Provider name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="What does this provider host, and what makes their inventory worth booking?"
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/34 focus:border-[var(--brand-copper)]"
                />
              </label>

              {editingProvider ? (
                <label className="space-y-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Provider['status'] }))}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                  >
                    <option value="pending" className="text-gray-900">
                      Pending review
                    </option>
                    <option value="approved" className="text-gray-900">
                      Approved
                    </option>
                    <option value="suspended" className="text-gray-900">
                      Suspended
                    </option>
                  </select>
                </label>
              ) : null}

              {formError ? (
                <div className="rounded-2xl border border-red-400/40 bg-red-400/12 px-4 py-3 text-sm text-red-100">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitDisabled}
                  isLoading={createProvider.isPending || updateProvider.isPending}
                  className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]"
                >
                  {editingProvider ? 'Save provider changes' : 'Create provider'}
                </Button>
                {editingProvider ? (
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={resetComposer}>
                    Cancel editing
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/16 p-4 text-sm text-white/70">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-4 w-4 text-[var(--brand-copper)]" />
                Practical note
              </div>
              <p className="mt-3 leading-7">
                The backend may restrict updates and deletes to the original creator. If a save fails, the UI keeps the draft and surfaces the API detail so admins can respond quickly.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(providerToDelete)}
        title="Delete provider?"
        description={`This will permanently remove ${providerToDelete?.name ?? 'this provider'} if the backend allows the action.`}
        confirmLabel="Delete provider"
        onConfirm={handleDelete}
        onCancel={() => setProviderToDelete(null)}
        isLoading={deleteProvider.isPending}
      />
    </div>
  );
}
