import type { ApiResponse } from '../types/auth';
import type {
  PricingBreakdown,
  PropertyPricingRules,
  CalendarMatrixResponse,
  SeasonalPriceRule,
  CheckAvailabilityPayload,
  BlockDatesPayload,
  UpdateAvailabilityPayload,
  CreateSeasonalRulePayload,
} from '../types/pricing';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class PricingApiService {
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

  // ── Public Guest Endpoints ─────────────────────────────────────

  /**
   * Fetch calendar days with availability status for a range.
   */
  async getAvailability(
    propertyId: number,
    from?: string,
    to?: string
  ): Promise<ApiResponse<{ property: any; days: any[] }>> {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    return this.request(`/properties/${propertyId}/availability?${query.toString()}`);
  }

  /**
   * Check real-time availability and calculate complete pricing breakdown.
   */
  async checkAvailability(
    propertyId: number,
    payload: CheckAvailabilityPayload
  ): Promise<ApiResponse<{ breakdown: PricingBreakdown }>> {
    return this.request(`/properties/${propertyId}/check-availability`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── Host Protected Endpoints ───────────────────────────────────

  /**
   * Get host month matrix calendar (dates, effective prices, price source, status).
   */
  async getHostCalendar(
    propertyId: number,
    year?: number,
    month?: number
  ): Promise<ApiResponse<CalendarMatrixResponse>> {
    const query = new URLSearchParams();
    if (year) query.append('year', year.toString());
    if (month) query.append('month', month.toString());
    return this.request(`/host/properties/${propertyId}/calendar?${query.toString()}`);
  }

  /**
   * Bulk block or unblock a range of dates.
   */
  async blockDateRange(
    propertyId: number,
    payload: BlockDatesPayload
  ): Promise<ApiResponse<{ count: number }>> {
    return this.request(`/host/properties/${propertyId}/block-dates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update availability & custom price for specific dates.
   */
  async updateAvailability(
    propertyId: number,
    payload: UpdateAvailabilityPayload
  ): Promise<ApiResponse> {
    return this.request(`/host/properties/${propertyId}/availability`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get base pricing rules, stay limits, fees, discounts and taxes.
   */
  async getPricingRules(propertyId: number): Promise<ApiResponse<{ pricing: PropertyPricingRules }>> {
    return this.request(`/host/properties/${propertyId}/pricing`);
  }

  /**
   * Update property pricing rules.
   */
  async updatePricingRules(
    propertyId: number,
    payload: Partial<PropertyPricingRules>
  ): Promise<ApiResponse<{ pricing: PropertyPricingRules }>> {
    return this.request(`/host/properties/${propertyId}/pricing`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * List all seasonal pricing rules for a property.
   */
  async getSeasonalPrices(propertyId: number): Promise<ApiResponse<SeasonalPriceRule[]>> {
    return this.request(`/host/properties/${propertyId}/seasonal-prices`);
  }

  /**
   * Create a new seasonal pricing rule.
   */
  async createSeasonalPrice(
    propertyId: number,
    payload: CreateSeasonalRulePayload
  ): Promise<ApiResponse<SeasonalPriceRule>> {
    return this.request(`/host/properties/${propertyId}/seasonal-prices`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update an existing seasonal pricing rule.
   */
  async updateSeasonalPrice(
    propertyId: number,
    ruleId: number,
    payload: Partial<CreateSeasonalRulePayload>
  ): Promise<ApiResponse<SeasonalPriceRule>> {
    return this.request(`/host/properties/${propertyId}/seasonal-prices/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete a seasonal pricing rule.
   */
  async deleteSeasonalPrice(propertyId: number, ruleId: number): Promise<ApiResponse> {
    return this.request(`/host/properties/${propertyId}/seasonal-prices/${ruleId}`, {
      method: 'DELETE',
    });
  }
}

export const pricingApi = new PricingApiService();
