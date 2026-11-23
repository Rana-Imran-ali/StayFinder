import type { User } from './auth';
import type { Property } from './property';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partially_refunded';

export interface BookingTransaction {
  id: number;
  booking_id: number;
  user_id: number;
  transaction_code: string;
  type: 'charge' | 'refund' | 'payout';
  amount: number;
  currency: string;
  payment_method: string;
  payment_gateway: string;
  status: 'pending' | 'successful' | 'failed';
  raw_response?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  booking_code: string;
  property_id: number;
  guest_id: number;
  host_id: number;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  has_pet: boolean;
  base_price: number;
  cleaning_fee: number;
  extra_guest_fee: number;
  pet_fee: number;
  discount_amount: number;
  discount_label: string | null;
  tax_amount: number;
  security_deposit: number;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  special_requests: string | null;
  cancellation_reason: string | null;
  cancelled_by?: number | null;
  cancelled_at?: string | null;
  host_notes?: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  property?: Property;
  guest?: User;
  host?: User;
  cancelled_by_user?: User | null;
  transactions?: BookingTransaction[];
}

export interface CreateBookingPayload {
  property_id: number;
  check_in: string;
  check_out: string;
  guests_count: number;
  has_pet?: boolean;
  special_requests?: string;
  payment_method?: string;
  payment_intent_id?: string;
}

export interface HostBookingStats {
  total_reservations: number;
  pending_approval: number;
  confirmed_upcoming: number;
  total_earnings: number;
}

export interface HostBookingsResponse {
  stats: HostBookingStats;
  data: {
    data: Booking[];
    current_page: number;
    last_page: number;
    total: number;
  };
}
