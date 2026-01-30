// Admin role and verification types for the Micall platform

/**
 * User roles in the system
 */
export enum UserRole {
  USER = 'user',
  RESPONDER = 'responder',
  SECONDARY_ADMIN = 'secondary_admin',
  PLATFORM_ADMIN = 'platform_admin',
}

/**
 * Types of institutions that can become secondary admins
 */
export enum InstitutionType {
  POLICE = 'police',
  HOSPITAL = 'hospital',
  FIRE_DEPARTMENT = 'fire_department',
  AMBULANCE_SERVICE = 'ambulance_service',
  GOVERNMENT_AGENCY = 'government_agency',
  NGO = 'ngo',
  OTHER = 'other',
}

/**
 * Verification status for admin requests
 */
export enum AdminStatus {
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

/**
 * Institution information
 */
export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  identifier: string; // License/ID number
  jurisdiction_area: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Admin profile containing institution and verification info
 */
export interface AdminProfile {
  id: string;
  user_id: string;
  institution_id: string;
  institution?: Institution;
  status: AdminStatus;
  emergency_types: string[]; // e.g., ['fire', 'medical', 'accident']
  verification_documents: VerificationDocument[];
  verified_by?: string; // User ID of platform admin who verified
  verified_at?: string;
  rejection_reason?: string;
  rejected_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Verification document metadata
 */
export interface VerificationDocument {
  id: string;
  admin_id: string;
  document_type: 'license' | 'certificate' | 'registration' | 'government_id' | 'other';
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

/**
 * Verification request for admins
 */
export interface VerificationRequest {
  id: string;
  admin_profile_id: string;
  institution_name: string;
  institution_type: InstitutionType;
  institution_identifier: string;
  jurisdiction_area: string;
  emergency_types: string[];
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  documents: VerificationDocument[];
  status: AdminStatus;
  created_at: string;
  updated_at: string;
  notes?: string;
}

/**
 * Admin statistics
 */
export interface AdminStats {
  total_alerts_handled: number;
  active_emergencies: number;
  average_response_time: number; // in seconds
  verified_at: string;
  institution_type: InstitutionType;
  emergency_types: string[];
}

/**
 * Alert record relevant to admin
 */
export interface AdminAlertRecord {
  id: number;
  type: string;
  status: 'active' | 'ended' | 'resolved' | 'cancelled';
  location: {
    lat: number;
    lng: number;
  };
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    phone: string;
  };
  responder_count?: number;
}
