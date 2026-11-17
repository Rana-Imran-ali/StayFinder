export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface UserProfile {
  id: number;
  user_id: number;
  profile_photo: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdentityVerification {
  id: number;
  user_id: number;
  document_type: 'passport' | 'national_id' | 'driving_license';
  document_number: string | null;
  document_front: string;
  document_back: string | null;
  selfie: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: number | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface HostProfile {
  id: number;
  user_id: number;
  business_name: string | null;
  tax_id: string | null;
  about_host: string | null;
  response_time: string;
  languages: string[] | null;
  is_superhost: boolean;
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  check_in_time: string;
  check_out_time: string;
  instant_booking: boolean;
  created_at: string;
  updated_at: string;
}

export interface HostVerification {
  id: number;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: number | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface PayoutMethod {
  id: number;
  user_id: number;
  type: 'bank_transfer' | 'paypal' | 'stripe';
  account_holder_name: string;
  bank_name: string | null;
  account_number_last_four: string | null;
  routing_number: string | null;
  paypal_email: string | null;
  currency: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityLog {
  id: number;
  admin_id: number;
  action: string;
  target_type: string | null;
  target_id: number | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
  admin?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'banned';
  is_identity_verified?: boolean;
  is_host_verified?: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles?: Role[];
  profile?: UserProfile | null;
  hostProfile?: HostProfile | null;
  identityVerification?: IdentityVerification | null;
  hostVerification?: HostVerification | null;
  payoutMethods?: PayoutMethod[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    token_type: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}
