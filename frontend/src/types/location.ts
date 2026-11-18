export interface Country {
  id: number;
  name: string;
  code: string;
  phone_code: string | null;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  states_count?: number;
  cities_count?: number;
  properties_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface State {
  id: number;
  country_id: number;
  name: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  country?: Country;
  cities_count?: number;
  properties_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface City {
  id: number;
  country_id: number;
  state_id: number | null;
  name: string;
  postal_code_pattern: string | null;
  latitude: number | null;
  longitude: number | null;
  is_popular: boolean;
  is_active: boolean;
  country?: Country;
  state?: State;
  properties_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LocationHierarchyCountry {
  id: number;
  name: string;
  code: string;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  states: Array<{
    id: number;
    country_id: number;
    name: string;
    code: string | null;
    latitude: number | null;
    longitude: number | null;
    cities: Array<{
      id: number;
      country_id: number;
      state_id: number | null;
      name: string;
      latitude: number | null;
      longitude: number | null;
    }>;
  }>;
}

export interface LocationSearchResult {
  type: 'city' | 'state' | 'country';
  id: number;
  country_id: number;
  state_id?: number | null;
  city_id?: number;
  title: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface LocationValidationPayload {
  country_id: number;
  state_id?: number | null;
  city_id?: number | null;
  address: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LocationValidationResponse {
  country: string;
  state?: string | null;
  city?: string | null;
  formatted_address: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MapPropertyPoint {
  id: number;
  title: string;
  slug: string;
  property_type: string;
  price_per_night: number;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  primary_image?: {
    id: number;
    image_path: string;
  } | null;
}
