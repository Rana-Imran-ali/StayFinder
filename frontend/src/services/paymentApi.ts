import type { ApiResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface CreateIntentPayload {
  property_id: number;
  check_in: string;
  check_out: string;
  guests_count: number;
  has_pet?: boolean;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  breakdown: any;
}

class PaymentApiService {
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

  /**
   * Get Stripe configuration (publishable key).
   */
  async getConfig(): Promise<ApiResponse<{ publishable_key: string }>> {
    return this.request('/payments/config');
  }

  /**
   * Create a Stripe PaymentIntent for the booking.
   */
  async createPaymentIntent(payload: CreateIntentPayload): Promise<ApiResponse<PaymentIntentResponse>> {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const paymentApi = new PaymentApiService();
