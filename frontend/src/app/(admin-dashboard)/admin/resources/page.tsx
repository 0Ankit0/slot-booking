'use client';

import axios from 'axios';
import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarRange, Pencil, Plus, Search, ShieldBan, Store, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useCreateAvailabilityException,
  useCreateAvailabilityRule,
  useCreateResource,
  useDeleteResource,
  useDeleteAvailabilityException,
  useDeleteAvailabilityRule,
  useGenerateSlots,
  useProviders,
  useResources,
  useUpdateAvailabilityException,
  useUpdateAvailabilityRule,
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
import type { AvailabilityException, AvailabilityRule, Resource } from '@/types/booking';

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

type RuleFormState = {
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_min: string;
  is_active: boolean;
};

type ExceptionFormState = {
  starts_at: string;
  ends_at: string;
  reason: string;
  is_available: boolean;
};

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Monday' },
  { value: '1', label: 'Tuesday' },
  { value: '2', label: 'Wednesday' },
  { value: '3', label: 'Thursday' },
  { value: '4', label: 'Friday' },
  { value: '5', label: 'Saturday' },
  { value: '6', label: 'Sunday' },
] as const;

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function minutesToTime(minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map((segment) => Number(segment));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return hour * 60 + minute;
}

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

function buildRuleFormState(rule?: AvailabilityRule | null): RuleFormState {
  return {
    day_of_week: String(rule?.day_of_week ?? 0),
    start_time: minutesToTime(rule?.start_minute ?? 9 * 60),
    end_time: minutesToTime(rule?.end_minute ?? 17 * 60),
    slot_duration_min: String(rule?.slot_duration_min ?? 60),
    is_active: rule?.is_active ?? true,
  };
}

function buildExceptionFormState(exception?: AvailabilityException | null): ExceptionFormState {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    starts_at: exception?.starts_at ? toDateTimeLocalValue(new Date(exception.starts_at)) : toDateTimeLocalValue(now),
    ends_at: exception?.ends_at ? toDateTimeLocalValue(new Date(exception.ends_at)) : toDateTimeLocalValue(later),
    reason: exception?.reason ?? '',
    is_available: exception?.is_available ?? false,
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
  const [ruleForm, setRuleForm] = useState<RuleFormState>(() => buildRuleFormState());
  const [exceptionForm, setExceptionForm] = useState<ExceptionFormState>(() => buildExceptionFormState());
  const [slotWindow, setSlotWindow] = useState(() => {
    const today = new Date();
    const inThirtyDays = new Date(today);
    inThirtyDays.setDate(inThirtyDays.getDate() + 30);
    return {
      from_date: toDateInputValue(today),
      to_date: toDateInputValue(inThirtyDays),
    };
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

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
  const availabilityRulesQuery = useAvailabilityRules(editingResource?.id);
  const availabilityExceptionsQuery = useAvailabilityExceptions(editingResource?.id);
  const createAvailabilityRule = useCreateAvailabilityRule();
  const updateAvailabilityRule = useUpdateAvailabilityRule();
  const deleteAvailabilityRule = useDeleteAvailabilityRule(editingResource?.id);
  const createAvailabilityException = useCreateAvailabilityException();
  const updateAvailabilityException = useUpdateAvailabilityException();
  const deleteAvailabilityException = useDeleteAvailabilityException(editingResource?.id);
  const generateSlots = useGenerateSlots();

  const selectedProvider = form.provider_id ? providerMap.get(form.provider_id) : undefined;
  const availabilityRules = availabilityRulesQuery.data ?? [];
  const availabilityExceptions = availabilityExceptionsQuery.data ?? [];

  const resetComposer = () => {
    setEditingResource(null);
    setForm(buildFormState());
    setFormError(null);
    setRuleForm(buildRuleFormState());
    setExceptionForm(buildExceptionFormState());
    setScheduleError(null);
    setScheduleMessage(null);
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
        const created = await createResource.mutateAsync(createPayload);
        setEditingResource(created);
        setForm(buildFormState(created));
        setScheduleMessage('Resource created. Add weekly availability and publish slots next.');
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

  const handleCreateAvailabilityRule = async () => {
    if (!editingResource) return;
    setScheduleError(null);
    setScheduleMessage(null);

    try {
      await createAvailabilityRule.mutateAsync({
        resourceId: editingResource.id,
        payload: {
          tenant_id: editingResource.tenant_id,
          day_of_week: Number(ruleForm.day_of_week),
          start_minute: timeToMinutes(ruleForm.start_time),
          end_minute: timeToMinutes(ruleForm.end_time),
          slot_duration_min: Number(ruleForm.slot_duration_min),
          is_active: ruleForm.is_active,
        },
      });
      setRuleForm(buildRuleFormState());
      setScheduleMessage('Weekly availability rule added.');
    } catch (error) {
      setScheduleError(getErrorMessage(error, 'Could not save this availability rule.'));
    }
  };

  const handleToggleRule = async (rule: AvailabilityRule) => {
    setScheduleError(null);
    setScheduleMessage(null);
    try {
      await updateAvailabilityRule.mutateAsync({
        resourceId: rule.resource_id,
        ruleId: rule.id,
        payload: { is_active: !rule.is_active },
      });
    } catch (error) {
      setScheduleError(getErrorMessage(error, 'Could not update this availability rule.'));
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setScheduleError(null);
    setScheduleMessage(null);
    try {
      await deleteAvailabilityRule.mutateAsync(ruleId);
    } catch (error) {
      setScheduleError(getErrorMessage(error, 'Could not delete this availability rule.'));
    }
  };

  const handleCreateAvailabilityException = async () => {
    if (!editingResource) return;
    setScheduleError(null);
    setScheduleMessage(null);

    try {
      await createAvailabilityException.mutateAsync({
        resourceId: editingResource.id,
        payload: {
          tenant_id: editingResource.tenant_id,
          starts_at: new Date(exceptionForm.starts_at).toISOString(),
          ends_at: new Date(exceptionForm.ends_at).toISOString(),
          reason: exceptionForm.reason.trim(),
          is_available: exceptionForm.is_available,
        },
      });
      setExceptionForm(buildExceptionFormState());
      setScheduleMessage(exceptionForm.is_available ? 'Availability override added.' : 'Blocking exception added.');
    } catch (error) {
      setScheduleError(getErrorMessage(error, 'Could not save this availability exception.'));
    }
  };

  const handleToggleException = async (exception: AvailabilityException) => {
    setScheduleError(null);
    setScheduleMessage(null);
    try {
      await updateAvailabilityException.mutateAsync({
        resourceId: exception.resource_id,
        exceptionId: exception.id,
        payload: { is_available: !exception.is_available },
      });
    } catch (error) {
      setScheduleError(getErrorMessage(error, 'Could not update this availability exception.'));
    }
  };

  const handleDeleteException = async (exceptionId: string) => {
    setScheduleError(null);
    setScheduleMessage(null);
    try {
      await deleteAvailabilityException.mutateAsync(exceptionId);
    } catch (error) {
      setScheduleError(getErrorMessage(error, 'Could not delete this availability exception.'));
    }
  };

  const handleGenerateSlots = async () => {
    if (!editingResource) return;
    setScheduleError(null);
    setScheduleMessage(null);

    try {
      const response = await generateSlots.mutateAsync({
        resourceId: editingResource.id,
        fromTs: new Date(`${slotWindow.from_date}T00:00:00`).toISOString(),
        toTs: new Date(`${slotWindow.to_date}T23:59:59`).toISOString(),
      });
      setScheduleMessage(`${response.created} slots generated for ${editingResource.name}.`);
    } catch (error) {
      setScheduleError(getErrorMessage(error, 'Could not generate slots for this resource.'));
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

            {editingResource ? (
              <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Availability operations</p>
                  <h3 className="mt-2 font-display text-2xl text-white">Publish recurring schedules and slot windows</h3>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    Weekly rules create the recurring shape. Exceptions block or reopen specific windows. Slot generation materialises inventory for booking.
                  </p>
                </div>

                {scheduleError ? (
                  <div className="rounded-2xl border border-red-400/40 bg-red-400/12 px-4 py-3 text-sm text-red-100">
                    {scheduleError}
                  </div>
                ) : null}
                {scheduleMessage ? (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/12 px-4 py-3 text-sm text-emerald-100">
                    {scheduleMessage}
                  </div>
                ) : null}

                <div className="grid gap-4 rounded-[24px] border border-white/10 bg-black/16 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/56">Active rules</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{availabilityRules.filter((rule) => rule.is_active).length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/56">Exceptions</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{availabilityExceptions.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/56">Resource timezone</p>
                    <p className="mt-2 text-lg font-semibold text-white">{editingResource.timezone}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/16 p-4">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-[var(--brand-copper)]" />
                    <p className="text-sm font-semibold text-white">Weekly availability rule</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">Day</span>
                      <select
                        value={ruleForm.day_of_week}
                        onChange={(event) => setRuleForm((current) => ({ ...current, day_of_week: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      >
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="text-gray-900">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">Starts</span>
                      <input
                        type="time"
                        value={ruleForm.start_time}
                        onChange={(event) => setRuleForm((current) => ({ ...current, start_time: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">Ends</span>
                      <input
                        type="time"
                        value={ruleForm.end_time}
                        onChange={(event) => setRuleForm((current) => ({ ...current, end_time: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">Slot minutes</span>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={ruleForm.slot_duration_min}
                        onChange={(event) => setRuleForm((current) => ({ ...current, slot_duration_min: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      />
                    </label>
                  </div>

                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-white">Rule active</p>
                      <p className="mt-1 text-xs text-white/56">Inactive rules stay saved but stop generating slots.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={ruleForm.is_active}
                      onChange={(event) => setRuleForm((current) => ({ ...current, is_active: event.target.checked }))}
                      className="h-4 w-4 rounded border-white/20"
                    />
                  </label>

                  <Button
                    onClick={handleCreateAvailabilityRule}
                    isLoading={createAvailabilityRule.isPending}
                    className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]"
                  >
                    Save weekly rule
                  </Button>

                  <div className="space-y-3">
                    {availabilityRulesQuery.isLoading ? (
                      <div className="text-sm text-white/60">Loading saved rules…</div>
                    ) : availabilityRules.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/14 px-4 py-4 text-sm text-white/60">
                        No weekly availability rules yet.
                      </div>
                    ) : (
                      availabilityRules.map((rule) => (
                        <div key={rule.id} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-medium text-white">
                                {WEEKDAY_OPTIONS.find((option) => option.value === String(rule.day_of_week))?.label} · {minutesToTime(rule.start_minute)} - {minutesToTime(rule.end_minute)}
                              </p>
                              <p className="mt-1 text-sm text-white/60">Slots every {rule.slot_duration_min} minutes</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => handleToggleRule(rule)}>
                                {rule.is_active ? 'Disable' : 'Enable'}
                              </Button>
                              <Button variant="outline" className="border-red-300/30 text-red-100 hover:bg-red-400/10" onClick={() => handleDeleteRule(rule.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/16 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldBan className="h-4 w-4 text-[var(--brand-copper)]" />
                    <p className="text-sm font-semibold text-white">Availability exceptions</p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">Starts at</span>
                      <input
                        type="datetime-local"
                        value={exceptionForm.starts_at}
                        onChange={(event) => setExceptionForm((current) => ({ ...current, starts_at: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">Ends at</span>
                      <input
                        type="datetime-local"
                        value={exceptionForm.ends_at}
                        onChange={(event) => setExceptionForm((current) => ({ ...current, ends_at: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      />
                    </label>
                  </div>

                  <label className="space-y-2 text-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">Reason</span>
                    <input
                      value={exceptionForm.reason}
                      onChange={(event) => setExceptionForm((current) => ({ ...current, reason: event.target.value }))}
                      placeholder="Maintenance, holiday, special opening, etc."
                      className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/34 focus:border-[var(--brand-copper)]"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-white">Treat as available override</p>
                      <p className="mt-1 text-xs text-white/56">Turn this on to reopen a special window instead of blocking it.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={exceptionForm.is_available}
                      onChange={(event) => setExceptionForm((current) => ({ ...current, is_available: event.target.checked }))}
                      className="h-4 w-4 rounded border-white/20"
                    />
                  </label>

                  <Button
                    onClick={handleCreateAvailabilityException}
                    isLoading={createAvailabilityException.isPending}
                    className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]"
                  >
                    Save exception
                  </Button>

                  <div className="space-y-3">
                    {availabilityExceptionsQuery.isLoading ? (
                      <div className="text-sm text-white/60">Loading saved exceptions…</div>
                    ) : availabilityExceptions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/14 px-4 py-4 text-sm text-white/60">
                        No exceptions defined yet.
                      </div>
                    ) : (
                      availabilityExceptions.map((exception) => (
                        <div key={exception.id} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-medium text-white">
                                {new Date(exception.starts_at).toLocaleString()} - {new Date(exception.ends_at).toLocaleString()}
                              </p>
                              <p className="mt-1 text-sm text-white/60">
                                {exception.is_available ? 'Available override' : 'Blocked window'}{exception.reason ? ` · ${exception.reason}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => handleToggleException(exception)}>
                                {exception.is_available ? 'Mark blocked' : 'Mark available'}
                              </Button>
                              <Button variant="outline" className="border-red-300/30 text-red-100 hover:bg-red-400/10" onClick={() => handleDeleteException(exception.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/16 p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Generate bookable slots</p>
                    <p className="mt-1 text-sm text-white/60">Publish a concrete slot horizon from the saved rules and exceptions.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">From date</span>
                      <input
                        type="date"
                        value={slotWindow.from_date}
                        onChange={(event) => setSlotWindow((current) => ({ ...current, from_date: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">To date</span>
                      <input
                        type="date"
                        value={slotWindow.to_date}
                        onChange={(event) => setSlotWindow((current) => ({ ...current, to_date: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[var(--brand-copper)]"
                      />
                    </label>
                  </div>

                  <Button
                    onClick={handleGenerateSlots}
                    isLoading={generateSlots.isPending}
                    className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]"
                  >
                    Generate slots
                  </Button>
                </div>
              </div>
            ) : null}
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
