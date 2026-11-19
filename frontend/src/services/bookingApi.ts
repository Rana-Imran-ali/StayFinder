import type { ApiResponse } from '../types/auth';
import type {
  Booking,
  CreateBookingPayload,
  HostBookingsResponse,
} from '../types/booking';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class BookingApiService {
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

  // ── Guest Endpoints ──────────────────────────────────────────

  /**
   * Get user's bookings (upcoming, past, cancelled, all).
   */
  async getBookings(
    tab: 'all' | 'upcoming' | 'past' | 'cancelled' = 'all',
    page: number = 1
  ): Promise<ApiResponse<{
    data: Booking[];
    current_page: number;
    last_page: number;
    total: number;
  }>> {
    return this.request(`/bookings?tab=${tab}&page=${page}`);
  }

  /**
   * Get single booking details.
   */
  async getBooking(id: number): Promise<ApiResponse<Booking>> {
    return this.request<ApiResponse<Booking>>(`/bookings/${id}`);
  }

  /**
   * Create a new reservation.
   */
  async createBooking(payload: CreateBookingPayload): Promise<ApiResponse<Booking>> {
    return this.request<ApiResponse<Booking>>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Cancel an existing booking.
   */
  async cancelBooking(id: number, reason: string): Promise<ApiResponse<Booking>> {
    return this.request<ApiResponse<Booking>>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ── Host Endpoints ───────────────────────────────────────────

  /**
   * List all reservations for the authenticated host's properties.
   */
  async getHostBookings(
    status: string = 'all',
    page: number = 1
  ): Promise<ApiResponse<HostBookingsResponse>> {
    return this.request(`/host/bookings?status=${status}&page=${page}`);
  }

  /**
   * Host accepts a pending reservation.
   */
  async acceptBooking(id: number): Promise<ApiResponse<Booking>> {
    return this.request<ApiResponse<Booking>>(`/host/bookings/${id}/accept`, {
      method: 'POST',
    });
  }

  /**
   * Host declines a pending reservation.
   */
  async rejectBooking(id: number, reason?: string): Promise<ApiResponse<Booking>> {
    return this.request<ApiResponse<Booking>>(`/host/bookings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
}

export const bookingApi = new BookingApiService();
