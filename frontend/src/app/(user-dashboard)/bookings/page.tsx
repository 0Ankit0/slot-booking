'use client';

import { useMemo } from 'react';
import { CalendarClock, Loader2, XCircle, CreditCard } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { useCancelBooking, useCheckoutBooking, useMyBookings } from '@/hooks/use-bookings';
import type { Booking } from '@/types';

function BookingRow({ booking, onCancel, onCheckout, isCancelling, isCheckingOut }: { booking: Booking; onCancel: (id: string) => void; onCheckout: (id: string) => void; isCancelling: boolean; isCheckingOut: boolean }) {
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canCheckout = booking.payment_status === 'pending' || booking.payment_status === 'failed';
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 text-sm text-gray-900">{booking.id}</td>
      <td className="py-3 text-sm text-gray-700 capitalize">{booking.status}</td>
      <td className="py-3 text-sm text-gray-700 capitalize">{booking.payment_status}</td>
      <td className="py-3 text-sm text-gray-700 capitalize">{booking.refund_status}</td>
      <td className="py-3 text-sm text-gray-700">{booking.currency} {(booking.amount_minor / 100).toFixed(2)}</td>
      <td className="py-3 text-sm text-gray-500">{new Date(booking.created_at).toLocaleString()}</td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            disabled={!canCheckout || isCheckingOut}
            onClick={() => onCheckout(booking.id)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            {isCheckingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Checkout
          </Button>
          <Button
            variant="outline"
            disabled={!canCancel || isCancelling}
            onClick={() => onCancel(booking.id)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {isCancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function BookingsPage() {
  const { data, isLoading, isFetching } = useMyBookings();
  const cancelMutation = useCancelBooking();
  const checkoutMutation = useCheckoutBooking();

  const bookings = useMemo(() => data?.items ?? [], [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-500">Track confirmations, cancellations, and refund statuses.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Booking History
            <span className="ml-auto text-sm text-gray-500 font-normal">{bookings.length} records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No bookings found yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-500">Booking</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Payment</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Refund</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Amount</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Created</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking: Booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      onCancel={(id) => cancelMutation.mutate(id)}
                      onCheckout={(id) => checkoutMutation.mutate({ bookingId: id, payload: { provider: 'khalti', return_url: window.location.origin + '/payment-callback', website_url: window.location.origin } }, {
                        onSuccess: (response) => {
                          if (response.payment_url) window.location.href = response.payment_url;
                        },
                      })}
                      isCancelling={cancelMutation.isPending && cancelMutation.variables === booking.id}
                      isCheckingOut={checkoutMutation.isPending && checkoutMutation.variables?.bookingId === booking.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isFetching && !isLoading ? <div className="mt-3 text-xs text-gray-400">Refreshing…</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
