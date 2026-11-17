import type {
  ApiResponse,
  AuthResponse,
  User,
  IdentityVerification,
  HostProfile,
  HostVerification,
  PayoutMethod,
  AdminActivityLog,
} from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
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
      message: 'Failed to parse server response.',
    }));

    if (!response.ok) {
      const errorMessage =
        data.message ||
        (data.errors ? Object.values(data.errors).flat().join(', ') : 'An unexpected error occurred.');
      throw new Error(errorMessage);
    }

    return data;
  }

  // 1. Auth Endpoints
  async register(payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
    role?: 'customer' | 'host';
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(payload: { login: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/logout', {
      method: 'POST',
    });
  }

  async logoutAll(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/logout-all', {
      method: 'POST',
    });
  }

  async getUser(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/user');
  }

  async changePassword(payload: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<ApiResponse> {
    return this.request<ApiResponse>('/user/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ email: string; reset_token: string }>> {
    return this.request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(payload: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<ApiResponse> {
    return this.request('/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 2. Profile Endpoints
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/user/profile');
  }

  async updateProfile(payload: {
    name?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    bio?: string;
    address?: string;
  }): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async uploadPhoto(file: File): Promise<ApiResponse<{ profile_photo: string; photo_url: string }>> {
    const formData = new FormData();
    formData.append('photo', file);

    return this.request('/user/profile/photo', {
      method: 'POST',
      body: formData,
    });
  }

  // 3. Identity Verification Endpoints
  async submitIdentityVerification(formData: FormData): Promise<ApiResponse<IdentityVerification>> {
    return this.request<ApiResponse<IdentityVerification>>('/verification/identity', {
      method: 'POST',
      body: formData,
    });
  }

  async getIdentityVerificationStatus(): Promise<ApiResponse<{ is_identity_verified: boolean; verification: IdentityVerification | null }>> {
    return this.request('/verification/identity/status');
  }

  // 4. Host Management Endpoints
  async onboardHost(payload: {
    business_name?: string;
    tax_id?: string;
    about_host: string;
    response_time?: string;
    languages?: string[];
    cancellation_policy?: 'flexible' | 'moderate' | 'strict';
    instant_booking?: boolean;
  }): Promise<ApiResponse<{ user: User }>> {
    return this.request('/host/onboard', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getHostProfile(): Promise<ApiResponse<{ host_profile: HostProfile; is_host_verified: boolean; is_identity_verified: boolean; verification: HostVerification | null }>> {
    return this.request('/host/profile');
  }

  async updateHostProfile(payload: {
    business_name?: string;
    about_host?: string;
    response_time?: string;
    languages?: string[];
  }): Promise<ApiResponse<HostProfile>> {
    return this.request('/host/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getHostAccountSettings(): Promise<ApiResponse<{
    tax_id: string | null;
    cancellation_policy: 'flexible' | 'moderate' | 'strict';
    check_in_time: string;
    check_out_time: string;
    instant_booking: boolean;
  }>> {
    return this.request('/host/account');
  }

  async updateHostAccountSettings(payload: {
    tax_id?: string;
    cancellation_policy?: 'flexible' | 'moderate' | 'strict';
    check_in_time?: string;
    check_out_time?: string;
    instant_booking?: boolean;
  }): Promise<ApiResponse<HostProfile>> {
    return this.request('/host/account', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async requestHostVerification(notes?: string): Promise<ApiResponse<HostVerification>> {
    return this.request('/host/verification/request', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async getHostDashboard(): Promise<ApiResponse> {
    return this.request('/host/dashboard');
  }

  // 5. Payout Account Management Endpoints
  async getPayoutMethods(): Promise<ApiResponse<PayoutMethod[]>> {
    return this.request('/host/payout-methods');
  }

  async addPayoutMethod(payload: {
    type: 'bank_transfer' | 'paypal' | 'stripe';
    account_holder_name: string;
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    paypal_email?: string;
    currency?: string;
    is_default?: boolean;
  }): Promise<ApiResponse<PayoutMethod>> {
    return this.request('/host/payout-methods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async setDefaultPayoutMethod(id: number): Promise<ApiResponse<PayoutMethod>> {
    return this.request(`/host/payout-methods/${id}/default`, {
      method: 'PUT',
    });
  }

  async deletePayoutMethod(id: number): Promise<ApiResponse> {
    return this.request(`/host/payout-methods/${id}`, {
      method: 'DELETE',
    });
  }

  // 6. Admin Management Endpoints
  async getAdminDashboard(): Promise<ApiResponse<{
    stats: {
      total_users: number;
      total_hosts: number;
      active_users: number;
      banned_users: number;
      pending_identity_verifications: number;
      pending_host_verifications: number;
    };
    recent_logs: AdminActivityLog[];
  }>> {
    return this.request('/admin/dashboard');
  }

  async getAdminUsers(params: { search?: string; role?: string; status?: string; page?: number } = {}): Promise<ApiResponse<{
    data: User[];
    current_page: number;
    last_page: number;
    total: number;
  }>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page.toString());

    return this.request(`/admin/users?${query.toString()}`);
  }

  async updateUserStatus(id: number, status: 'active' | 'inactive' | 'banned', reason?: string): Promise<ApiResponse<User>> {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  }

  async getPendingIdentityVerifications(status: string = 'pending'): Promise<ApiResponse<{
    data: IdentityVerification[];
    current_page: number;
    last_page: number;
    total: number;
  }>> {
    return this.request(`/admin/verifications/identity?status=${status}`);
  }

  async reviewIdentityVerification(id: number, decision: 'approved' | 'rejected', rejection_reason?: string): Promise<ApiResponse<IdentityVerification>> {
    return this.request(`/admin/verifications/identity/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, rejection_reason }),
    });
  }

  async getPendingHostVerifications(status: string = 'pending'): Promise<ApiResponse<{
    data: HostVerification[];
    current_page: number;
    last_page: number;
    total: number;
  }>> {
    return this.request(`/admin/verifications/hosts?status=${status}`);
  }

  async reviewHostVerification(id: number, decision: 'approved' | 'rejected', rejection_reason?: string): Promise<ApiResponse<HostVerification>> {
    return this.request(`/admin/verifications/hosts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, rejection_reason }),
    });
  }

  async getAdminActivityLogs(): Promise<ApiResponse<{
    data: AdminActivityLog[];
    current_page: number;
    last_page: number;
  }>> {
    return this.request('/admin/logs');
  }
}

export const api = new ApiService();
