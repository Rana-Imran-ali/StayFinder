import type { User } from './auth';
import type { Country, State, City } from './location';
import type { SeasonalPriceRule } from './pricing';

export interface PropertyImage {
  id: number;
  property_id: number;
  image_path: string;
  caption: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Amenity {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  category: 'essentials' | 'features' | 'location' | 'safety' | 'kitchen' | 'outdoor';
  created_at?: string;
  updated_at?: string;
}

export interface PropertyAvailability {
  id: number;
  property_id: number;
  date: string;
  is_available: boolean;
  custom_price: number | null;
  min_nights?: number | null;
  status?: 'available' | 'blocked' | 'booked' | 'pending';
  note: string | null;
}

export interface Property {
  id: number;
  host_id: number;
  title: string;
  slug: string;
  description: string;
  property_type: 'apartment' | 'house' | 'villa' | 'cabin' | 'cottage' | 'loft' | 'hotel';
  room_type: 'entire_place' | 'private_room' | 'shared_room';
  price_per_night: number;
  weekend_price?: number | null;
  cleaning_fee: number;
  extra_guest_fee?: number | null;
  extra_guest_threshold?: number | null;
  pet_fee?: number | null;
  security_deposit?: number | null;
  weekly_discount_percent?: number | null;
  monthly_discount_percent?: number | null;
  tax_percent?: number | null;
  min_nights?: number;
  max_nights?: number | null;
  currency: string;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  status: 'draft' | 'published' | 'unlisted' | 'archived';
  instant_bookable: boolean;
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  created_at: string;
  updated_at: string;
  distance?: number;
  host?: User;
  countryRelation?: Country | null;
  stateRelation?: State | null;
  cityRelation?: City | null;
  images?: PropertyImage[];
  primary_image?: PropertyImage | null;
  primaryImage?: PropertyImage | null;
  amenities?: Amenity[];
  seasonalPrices?: SeasonalPriceRule[];
}

export interface PropertyFilterParams {
  search?: string;
  country_id?: number;
  state_id?: number;
  city_id?: number;
  country?: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number; // in km
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  min_price?: number;
  max_price?: number;
  property_type?: string;
  guests?: number;
  check_in?: string;
  check_out?: string;
  amenities?: number[];
  page?: number;
  per_page?: number;
}

export interface CreatePropertyPayload {
  title: string;
  description: string;
  property_type: 'apartment' | 'house' | 'villa' | 'cabin' | 'cottage' | 'loft' | 'hotel';
  room_type: 'entire_place' | 'private_room' | 'shared_room';
  price_per_night: number;
  weekend_price?: number | null;
  cleaning_fee?: number;
  extra_guest_fee?: number;
  extra_guest_threshold?: number;
  pet_fee?: number;
  security_deposit?: number;
  weekly_discount_percent?: number;
  monthly_discount_percent?: number;
  tax_percent?: number;
  min_nights?: number;
  max_nights?: number;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  instant_bookable?: boolean;
  cancellation_policy?: 'flexible' | 'moderate' | 'strict';
  amenities?: number[];
}
