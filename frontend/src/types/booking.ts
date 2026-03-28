export type BookingProviderStatus = 'pending' | 'approved' | 'suspended';
export type SlotStatus = 'open' | 'held' | 'booked' | 'blocked';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type BookingPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type RefundStatus = 'none' | 'pending' | 'refunded' | 'partial' | 'failed';
export type ReviewStatus = 'published' | 'hidden';
export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'rejected';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

export interface Provider {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  status: BookingProviderStatus;
}

export interface ResourceCategory {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ResourceAmenity {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
}

export interface ResourceLocation {
  id: string;
  tenant_id: string;
  name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Resource {
  id: string;
  provider_id: string;
  tenant_id: string;
  location_id?: string | null;
  category_id?: string | null;
  name: string;
  description: string;
  category: string;
  timezone: string;
  base_price_minor: number;
  currency: string;
  max_group_size: number;
  is_active: boolean;
}

export interface Slot {
  id: string;
  resource_id: string;
  tenant_id: string;
  starts_at: string;
  ends_at: string;
  status: SlotStatus;
  hold_expires_at?: string | null;
}

export interface Booking {
  id: string;
  tenant_id: string;
  provider_id: string;
  resource_id: string;
  user_id: string;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  refund_status: RefundStatus;
  amount_minor: number;
  currency: string;
  promo_code?: string | null;
  promo_discount_minor: number;
  created_at: string;
}

export interface Review {
  id: string;
  tenant_id: string;
  booking_id: string;
  resource_id: string;
  user_id: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  tenant_id: string;
  resource_id: string;
  user_id: string;
  desired_start_at: string;
  desired_end_at: string;
  is_active: boolean;
}

export interface Dispute {
  id: string;
  tenant_id: string;
  booking_id: string;
  opened_by_user_id: string;
  reason: string;
  status: DisputeStatus;
  resolution_note: string;
}

export interface RefundRecord {
  id: string;
  tenant_id: string;
  booking_id: string;
  amount_minor: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  external_refund_id?: string | null;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  booking_id: string;
  invoice_no: string;
  status: InvoiceStatus;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  issued_at?: string | null;
  paid_at?: string | null;
}

export interface Payout {
  id: string;
  tenant_id: string;
  provider_id: string;
  booking_id?: string | null;
  amount_minor: number;
  currency: string;
  status: PayoutStatus;
  external_reference?: string | null;
}

export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
}
