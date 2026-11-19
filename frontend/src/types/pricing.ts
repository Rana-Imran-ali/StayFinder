export interface NightlyRate {
  date: string;
  price: number;
  source: 'base' | 'weekend' | 'custom' | string;
}

export interface PricingBreakdown {
  available: boolean;
  unavailable_dates?: string[];
  nights?: number;
  nightly_breakdown?: NightlyRate[];
  base_total?: number;
  extra_guest_fee?: number;
  pet_fee?: number;
  cleaning_fee?: number;
  subtotal?: number;
  discount_label?: string | null;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  security_deposit?: number;
  total?: number;
  currency?: string;
}

export interface SeasonalPriceRule {
  id: number;
  property_id: number;
  name: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  weekend_price: number | null;
  min_nights: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyPricingRules {
  price_per_night: number;
  weekend_price: number | null;
  cleaning_fee: number | null;
  extra_guest_fee: number | null;
  extra_guest_threshold: number | null;
  pet_fee: number | null;
  security_deposit: number | null;
  weekly_discount_percent: number | null;
  monthly_discount_percent: number | null;
  tax_percent: number | null;
  min_nights: number;
  max_nights: number | null;
  currency: string;
}

export interface CalendarMatrixDay {
  date: string;
  day_of_week: number;
  is_available: boolean;
  is_blocked: boolean;
  custom_price: number | null;
  effective_price: number;
  price_source: 'base' | 'weekend' | 'seasonal' | 'custom';
  min_nights: number;
  status: 'available' | 'blocked' | 'booked' | 'pending';
  note: string | null;
}

export interface CalendarMatrixResponse {
  year: number;
  month: number;
  seasonal_rules: SeasonalPriceRule[];
  days: CalendarMatrixDay[];
}

export interface CheckAvailabilityPayload {
  check_in: string;
  check_out: string;
  guests: number;
  has_pet?: boolean;
}

export interface BlockDatesPayload {
  from_date: string;
  to_date: string;
  reason?: string;
  action: 'block' | 'unblock';
}

export interface UpdateAvailabilityPayload {
  dates: string[];
  is_available: boolean;
  custom_price?: number | null;
  min_nights?: number | null;
  status?: 'available' | 'blocked' | 'booked' | 'pending';
  note?: string | null;
}

export interface CreateSeasonalRulePayload {
  name: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  weekend_price?: number | null;
  min_nights?: number | null;
  is_active?: boolean;
}
