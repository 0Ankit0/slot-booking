'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { analytics } from '@/lib/analytics';
import { BookingEvents } from '@/lib/analytics/events';
import type { Booking, CursorPage, Slot } from '@/types';

export interface BookingCreatePayload {
  tenant_id: string;
  provider_id: string;
  resource_id: string;
  slot_id: string;
  amount_minor: number;
  currency: string;
  notes?: string;
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


export interface BookingCheckoutRequest {
  provider: string;
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

export function useCheckoutBooking() {
  return useMutation({
    mutationFn: async ({ bookingId, payload }: { bookingId: string; payload: BookingCheckoutRequest }) => {
      const response = await apiClient.post<BookingCheckoutResponse>(`/bookings/${bookingId}/checkout`, payload);
      return response.data;
    },
  });
}
