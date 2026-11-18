import type {
  Country,
  State,
  City,
  LocationHierarchyCountry,
  LocationSearchResult,
  LocationValidationPayload,
  LocationValidationResponse,
} from '../types/location';
import type { ApiResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class LocationApiService {
  private getToken(): string | null {
    return localStorage.getItem('stayfinder_token');
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({
      success: false,
      message: 'Failed to parse response.',
    }));

    if (!response.ok) {
      const msg =
        data.message ||
        (data.errors ? Object.values(data.errors).flat().join(', ') : 'An unexpected error occurred.');
      throw new Error(msg);
    }

    return data;
  }

  // 1. Discovery & Hierarchy
  async getHierarchy(): Promise<ApiResponse<LocationHierarchyCountry[]>> {
    return this.request<ApiResponse<LocationHierarchyCountry[]>>('/locations/hierarchy');
  }

  async searchLocations(q: string): Promise<ApiResponse<LocationSearchResult[]>> {
    return this.request<ApiResponse<LocationSearchResult[]>>(`/locations/search?q=${encodeURIComponent(q)}`);
  }

  async getPopularDestinations(): Promise<ApiResponse<City[]>> {
    return this.request<ApiResponse<City[]>>('/locations/popular');
  }

  async validateLocation(payload: LocationValidationPayload): Promise<ApiResponse<LocationValidationResponse>> {
    return this.request<ApiResponse<LocationValidationResponse>>('/locations/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 2. Public Countries
  async getCountries(all: boolean = false): Promise<ApiResponse<Country[]>> {
    return this.request<ApiResponse<Country[]>>(`/countries${all ? '?all=1' : ''}`);
  }

  async getCountry(id: number): Promise<ApiResponse<Country>> {
    return this.request<ApiResponse<Country>>(`/countries/${id}`);
  }

  async getStatesByCountry(countryId: number, all: boolean = false): Promise<ApiResponse<State[]>> {
    return this.request<ApiResponse<State[]>>(`/countries/${countryId}/states${all ? '?all=1' : ''}`);
  }

  async getCitiesByCountry(countryId: number, all: boolean = false): Promise<ApiResponse<City[]>> {
    return this.request<ApiResponse<City[]>>(`/countries/${countryId}/cities${all ? '?all=1' : ''}`);
  }

  // 3. Public States & Cities
  async getStates(countryId?: number, all: boolean = false): Promise<ApiResponse<State[]>> {
    const params = new URLSearchParams();
    if (countryId) params.append('country_id', countryId.toString());
    if (all) params.append('all', '1');
    const qs = params.toString();
    return this.request<ApiResponse<State[]>>(`/states${qs ? `?${qs}` : ''}`);
  }

  async getCitiesByState(stateId: number, all: boolean = false): Promise<ApiResponse<City[]>> {
    return this.request<ApiResponse<City[]>>(`/states/${stateId}/cities${all ? '?all=1' : ''}`);
  }

  async getCities(params: { country_id?: number; state_id?: number; popular?: boolean; all?: boolean } = {}): Promise<ApiResponse<City[]>> {
    const sp = new URLSearchParams();
    if (params.country_id) sp.append('country_id', params.country_id.toString());
    if (params.state_id) sp.append('state_id', params.state_id.toString());
    if (params.popular) sp.append('popular', '1');
    if (params.all) sp.append('all', '1');
    const qs = sp.toString();
    return this.request<ApiResponse<City[]>>(`/cities${qs ? `?${qs}` : ''}`);
  }

  // 4. Admin Country Management
  async createCountry(payload: Partial<Country>): Promise<ApiResponse<Country>> {
    return this.request<ApiResponse<Country>>('/admin/locations/countries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCountry(id: number, payload: Partial<Country>): Promise<ApiResponse<Country>> {
    return this.request<ApiResponse<Country>>(`/admin/locations/countries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCountry(id: number): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/admin/locations/countries/${id}`, {
      method: 'DELETE',
    });
  }

  // 5. Admin State Management
  async createState(payload: Partial<State>): Promise<ApiResponse<State>> {
    return this.request<ApiResponse<State>>('/admin/locations/states', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateState(id: number, payload: Partial<State>): Promise<ApiResponse<State>> {
    return this.request<ApiResponse<State>>(`/admin/locations/states/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteState(id: number): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/admin/locations/states/${id}`, {
      method: 'DELETE',
    });
  }

  // 6. Admin City Management
  async createCity(payload: Partial<City>): Promise<ApiResponse<City>> {
    return this.request<ApiResponse<City>>('/admin/locations/cities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCity(id: number, payload: Partial<City>): Promise<ApiResponse<City>> {
    return this.request<ApiResponse<City>>(`/admin/locations/cities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCity(id: number): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/admin/locations/cities/${id}`, {
      method: 'DELETE',
    });
  }
}

export const locationApi = new LocationApiService();
