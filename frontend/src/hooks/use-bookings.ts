'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { analytics } from '@/lib/analytics';
import { BookingEvents } from '@/lib/analytics/events';
import type {
  Booking,
  BookingQuote,
  BookingQuoteInput,
  CursorPage,
  Provider,
  ProviderCreateInput,
  ProviderUpdateInput,
  Resource,
  ResourceCreateInput,
  ResourceUpdateInput,
  Slot,
} from '@/types/booking';
import type { PaymentProvider } from '@/types/payments';

export interface BookingCreatePayload {
  tenant_id: string;
  provider_id: string;
  resource_id: string;
  slot_id: string;
  amount_minor: number;
  currency: string;
  notes?: string;
}

export interface ProviderListParams {
  tenant_id?: string;
  cursor?: string;
  q?: string;
  status?: Provider['status'];
  limit?: number;
}

export interface ResourceListParams {
  tenant_id?: string;
  provider_id?: string;
  cursor?: string;
  q?: string;
  category?: string;
  include_inactive?: boolean;
  limit?: number;
}

export interface BookingCancelResponse {
  booking_id: string;
  status: string;
  refund_status: string;
  request_id: string;
}

export interface BookingAnalyticsSummary {
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  completed_bookings: number;
  disputes_open: number;
  waitlist_active: number;
  gross_revenue_minor: number;
}

export interface ProviderEarningsSummary {
  provider_id: string;
  completed_bookings: number;
  gross_earnings_minor: number;
  pending_payout_minor: number;
  paid_payout_minor: number;
}

export interface BookingCheckoutRequest {
  provider: PaymentProvider;
  return_url: string;
  website_url?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface BookingCheckoutResponse {
  booking_id: string;
  transaction_id: string;
  payment_url?: string | null;
  provider_pidx?: string | null;
  status: string;
}

export function useProviders(params?: ProviderListParams) {
  return useQuery({
    queryKey: ['providers', params],
    queryFn: async () => {
      const response = await apiClient.get<CursorPage<Provider>>('/providers/', { params });
      return response.data;
    },
  });
}

export function useProvider(providerId?: string) {
  return useQuery({
    queryKey: ['providers', providerId],
    queryFn: async () => {
      const response = await apiClient.get<Provider>(`/providers/${providerId}`);
      return response.data;
    },
    enabled: Boolean(providerId),
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProviderCreateInput) => {
      const response = await apiClient.post<Provider>('/providers/', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, payload }: { providerId: string; payload: ProviderUpdateInput }) => {
      const response = await apiClient.patch<Provider>(`/providers/${providerId}`, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['providers', variables.providerId] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: string) => {
      await apiClient.delete(`/providers/${providerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useResources(params?: ResourceListParams) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: async () => {
      const response = await apiClient.get<CursorPage<Resource>>('/resources/', { params });
      return response.data;
    },
  });
}

export function useResource(resourceId?: string) {
  return useQuery({
    queryKey: ['resources', resourceId],
    queryFn: async () => {
      const response = await apiClient.get<Resource>(`/resources/${resourceId}`);
      return response.data;
    },
    enabled: Boolean(resourceId),
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ResourceCreateInput) => {
      const response = await apiClient.post<Resource>('/resources/', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId, payload }: { resourceId: string; payload: ResourceUpdateInput }) => {
      const response = await apiClient.patch<Resource>(`/resources/${resourceId}`, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources', variables.resourceId] });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resourceId: string) => {
      await apiClient.delete(`/resources/${resourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useMyBookings(params?: { tenant_id?: string; cursor?: string; limit?: number }) {
  return useQuery({
    queryKey: ['bookings', 'mine', params],
    queryFn: async () => {
      const response = await apiClient.get<CursorPage<Booking>>('/bookings/', { params });
      return response.data;
    },
  });
}

export function useSlots(params: { resource_id: string; from_ts: string; to_ts: string }) {
  return useQuery({
    queryKey: ['slots', params],
    queryFn: async () => {
      const response = await apiClient.get<Slot[]>('/slots/', { params });
      return response.data;
    },
    enabled: Boolean(params.resource_id),
  });
}

export function useBookingQuote(payload?: BookingQuoteInput) {
  return useQuery({
    queryKey: ['bookings', 'quote', payload],
    queryFn: async () => {
      const response = await apiClient.post<BookingQuote>('/bookings/quote', payload);
      return response.data;
    },
    enabled: Boolean(payload?.tenant_id && payload.resource_id),
    staleTime: 30_000,
  });
}

export interface SlotHoldResponse {
  hold_expires_at: string;
}

export function useHoldSlot() {
  return useMutation({
    mutationFn: async (slotId: string) => {
      const response = await apiClient.post<SlotHoldResponse>(`/slots/${slotId}/hold`);
      return response.data;
    },
  });
}

export function useReleaseSlot() {
  return useMutation({
    mutationFn: async (slotId: string) => {
      const response = await apiClient.post<{ released: boolean }>(`/slots/${slotId}/release`);
      return response.data;
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BookingCreatePayload) => {
      const response = await apiClient.post<Booking>('/bookings/', payload, {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
          'X-Request-Id': crypto.randomUUID(),
          'X-Tenant-Id': payload.tenant_id,
        },
      });
      return response.data;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      analytics.capture(BookingEvents.BOOKING_CREATED, { booking_id: booking.id, tenant_id: booking.tenant_id });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post(`/bookings/${bookingId}/cancel`, null, {
        headers: {
          'X-Request-Id': crypto.randomUUID(),
        },
      });
      return response.data as BookingCancelResponse;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      analytics.capture(BookingEvents.BOOKING_CANCELLED, { booking_id: bookingId });
    },
  });
}

export function useBookingAnalyticsSummary(params?: { tenant_id?: string }) {
  return useQuery({
    queryKey: ['booking-analytics', 'summary', params],
    queryFn: async () => {
      const response = await apiClient.get<BookingAnalyticsSummary>('/admin/booking-analytics/summary', { params });
      return response.data;
    },
  });
}

export function useProviderEarningsSummary(providerId?: string) {
  return useQuery({
    queryKey: ['booking-analytics', 'provider-earnings', providerId],
    queryFn: async () => {
      const response = await apiClient.get<ProviderEarningsSummary>(`/admin/booking-analytics/providers/${providerId}/earnings`);
      return response.data;
    },
    enabled: Boolean(providerId),
  });
}

export function useCheckoutBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, payload }: { bookingId: string; payload: BookingCheckoutRequest }) => {
      const response = await apiClient.post<BookingCheckoutResponse>(`/bookings/${bookingId}/checkout`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
    },
  });
}
