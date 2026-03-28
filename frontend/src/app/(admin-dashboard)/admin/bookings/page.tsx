'use client';

import { BarChart3, AlertCircle, Clock3, DollarSign } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBookingAnalyticsSummary } from '@/hooks/use-bookings';

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminBookingsAnalyticsPage() {
  const { data, isLoading } = useBookingAnalyticsSummary();

  if (isLoading) {
    return <div className="text-gray-500">Loading booking analytics…</div>;
  }

  if (!data) {
    return <div className="text-gray-500">No booking analytics data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Analytics</h1>
        <p className="text-gray-500">Platform-level booking, dispute, waitlist, and revenue summary.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Bookings" value={String(data.total_bookings)} icon={BarChart3} />
        <MetricCard title="Completed" value={String(data.completed_bookings)} icon={Clock3} />
        <MetricCard title="Open Disputes" value={String(data.disputes_open)} icon={AlertCircle} />
        <MetricCard
          title="Gross Revenue"
          value={`$${(data.gross_revenue_minor / 100).toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Confirmed: {data.confirmed_bookings}</li>
            <li>Cancelled: {data.cancelled_bookings}</li>
            <li>Waitlist Active: {data.waitlist_active}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
