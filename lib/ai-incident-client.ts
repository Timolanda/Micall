/**
 * AI Incident Analysis Client
 * Interfaces with Supabase Edge Functions for AI-powered incident categorization
 */

import { supabase } from '@/lib/supabase';
import { AnalysisRequest, AnalysisResponse, AnalysisResult } from '@/types/incident-analysis';

const ENABLE_AI_ANALYSIS = process.env.NEXT_PUBLIC_ENABLE_AI_ANALYSIS === 'true';

/**
 * Analyze an incident using AI
 * Sends request to Edge Function which uses OpenAI/Claude API
 */
export async function analyzeIncident(request: AnalysisRequest): Promise<AnalysisResult | null> {
  if (!ENABLE_AI_ANALYSIS) {
    console.warn('AI analysis is disabled');
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke<AnalysisResponse>('analyze-incident', {
      body: request,
    });

    if (error) {
      console.error('Analysis function error:', error);
      return null;
    }

    if (data?.success && data.analysis) {
      // Save analysis result to database
      await saveAnalysisResult(request.alertId, request.userId, data.analysis);
      return data.analysis;
    }

    console.warn('Analysis failed:', data?.error);
    return null;
  } catch (err) {
    console.error('Failed to analyze incident:', err);
    return null;
  }
}

/**
 * Save analysis result to incident_analysis table
 */
async function saveAnalysisResult(
  alertId: number,
  userId: string,
  result: AnalysisResult
): Promise<boolean> {
  try {
    const { error } = await supabase.from('incident_analysis').insert({
      alert_id: alertId,
      user_id: userId,
      analysis_result: result,
      processed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to save analysis:', error);
      return false;
    }

    console.log(`Saved analysis for alert ${alertId}`);
    return true;
  } catch (err) {
    console.error('Save analysis error:', err);
    return false;
  }
}

/**
 * Retrieve analysis for an alert
 */
export async function getAlertAnalysis(alertId: number): Promise<AnalysisResult | null> {
  try {
    const { data, error } = await supabase
      .from('incident_analysis')
      .select('analysis_result')
      .eq('alert_id', alertId)
      .order('processed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn('No analysis found:', error);
      return null;
    }

    return data?.analysis_result || null;
  } catch (err) {
    console.error('Get analysis error:', err);
    return null;
  }
}

/**
 * Auto-analyze when alert is created
 * Called from Go Live handler or separately
 */
export async function triggerIncidentAnalysis(
  alertId: number,
  userId: string,
  description?: string
): Promise<void> {
  if (!ENABLE_AI_ANALYSIS) return;

  try {
    // Get alert details first
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .select('description, latitude, longitude')
      .eq('id', alertId)
      .single();

    if (alertError) {
      console.error('Failed to fetch alert:', alertError);
      return;
    }

    const request: AnalysisRequest = {
      alertId,
      userId,
      description: description || alert?.description,
      location: alert ? { latitude: alert.latitude, longitude: alert.longitude } : undefined,
    };

    await analyzeIncident(request);
  } catch (err) {
    console.error('Failed to trigger analysis:', err);
  }
}
