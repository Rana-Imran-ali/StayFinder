import type {
  Property,
  Amenity,
  PropertyAvailability,
  PropertyFilterParams,
  CreatePropertyPayload,
} from '../types/property';
import type { MapPropertyPoint } from '../types/location';
import type { ApiResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class PropertyApiService {
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

  // 1. Public Browsing Endpoints
  async getProperties(params: PropertyFilterParams = {}): Promise<ApiResponse<{
    data: Property[];
    current_page: number;
    last_page: number;
    total: number;
  }>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.country_id) query.append('country_id', params.country_id.toString());
    if (params.state_id) query.append('state_id', params.state_id.toString());
    if (params.city_id) query.append('city_id', params.city_id.toString());
    if (params.country) query.append('country', params.country);
    if (params.state) query.append('state', params.state);
    if (params.city) query.append('city', params.city);
    if (params.lat !== undefined) query.append('lat', params.lat.toString());
    if (params.lng !== undefined) query.append('lng', params.lng.toString());
    if (params.radius) query.append('radius', params.radius.toString());
    if (params.north !== undefined) query.append('north', params.north.toString());
    if (params.south !== undefined) query.append('south', params.south.toString());
    if (params.east !== undefined) query.append('east', params.east.toString());
    if (params.west !== undefined) query.append('west', params.west.toString());
    if (params.min_price) query.append('min_price', params.min_price.toString());
    if (params.max_price) query.append('max_price', params.max_price.toString());
    if (params.property_type && params.property_type !== 'all') query.append('property_type', params.property_type);
    if (params.guests) query.append('guests', params.guests.toString());
    if (params.amenities && params.amenities.length > 0) {
      query.append('amenities', params.amenities.join(','));
    }
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());

    return this.request(`/properties?${query.toString()}`);
  }

  async getMapProperties(params: PropertyFilterParams = {}): Promise<ApiResponse<MapPropertyPoint[]>> {
    const query = new URLSearchParams();
    if (params.country_id) query.append('country_id', params.country_id.toString());
    if (params.city_id) query.append('city_id', params.city_id.toString());
    if (params.north !== undefined) query.append('north', params.north.toString());
    if (params.south !== undefined) query.append('south', params.south.toString());
    if (params.east !== undefined) query.append('east', params.east.toString());
    if (params.west !== undefined) query.append('west', params.west.toString());

    return this.request<ApiResponse<MapPropertyPoint[]>>(`/properties/map?${query.toString()}`);
  }

  async getProperty(slugOrId: string | number): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>(`/properties/${slugOrId}`);
  }

  async getAmenities(): Promise<ApiResponse<Record<string, Amenity[]>>> {
    return this.request<ApiResponse<Record<string, Amenity[]>>>('/amenities');
  }

  async getPropertyAvailability(propertyId: number): Promise<ApiResponse<PropertyAvailability[]>> {
    return this.request<ApiResponse<PropertyAvailability[]>>(`/properties/${propertyId}/availability`);
  }

  // 2. Host Protected Management Endpoints
  async getMyProperties(page: number = 1): Promise<ApiResponse<{
    data: Property[];
    current_page: number;
    last_page: number;
    total: number;
  }>> {
    return this.request(`/host/properties?page=${page}`);
  }

  async createProperty(payload: CreatePropertyPayload): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>('/host/properties', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProperty(id: number, payload: Partial<CreatePropertyPayload>): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>(`/host/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async changePropertyStatus(id: number, status: 'draft' | 'published' | 'unlisted' | 'archived'): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>(`/host/properties/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteProperty(id: number): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/host/properties/${id}`, {
      method: 'DELETE',
    });
  }

  // 3. Property Photos
  async uploadPropertyImages(propertyId: number, files: File[]): Promise<ApiResponse<Property>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images[]', file);
    });

    return this.request<ApiResponse<Property>>(`/host/properties/${propertyId}/images`, {
      method: 'POST',
      body: formData,
    });
  }

  async setPrimaryImage(propertyId: number, imageId: number): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>(`/host/properties/${propertyId}/images/${imageId}/primary`, {
      method: 'PUT',
    });
  }

  async deletePropertyImage(propertyId: number, imageId: number): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>(`/host/properties/${propertyId}/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  // 4. Availability Calendar
  async updateAvailability(propertyId: number, payload: {
    dates: string[];
    is_available: boolean;
    custom_price?: number;
    note?: string;
  }): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/host/properties/${propertyId}/availability`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
}

export const propertyApi = new PropertyApiService();
