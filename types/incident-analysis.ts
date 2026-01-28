/**
 * Incident Analysis Types
 * Structures for AI-generated incident metadata and categorization
 */

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType =
  | 'medical_emergency'
  | 'fire'
  | 'accident'
  | 'assault'
  | 'robbery'
  | 'natural_disaster'
  | 'hazmat'
  | 'other';

export interface AnalysisResult {
  incidentType: IncidentType;
  severity: IncidentSeverity;
  keywords: string[];
  confidence: number; // 0-100
  suggestedActions: string[];
  aiNotes: string;
}

export interface IncidentAnalysis {
  id: number;
  alert_id: number;
  user_id: string;
  analysis_result: AnalysisResult;
  processed_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for Edge Function
 */
export interface AnalysisRequest {
  alertId: number;
  userId: string;
  transcript?: string; // Speech-to-text from recording
  description?: string; // User-provided description
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Response from Edge Function
 */
export interface AnalysisResponse {
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
}
