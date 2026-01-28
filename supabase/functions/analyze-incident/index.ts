// @ts-nocheck - This file runs on Deno runtime, not Node/browser
/**
 * analyze-incident Edge Function
 * 
 * Deploy to: supabase/functions/analyze-incident/index.ts
 * 
 * This function analyzes emergency incidents using AI to provide:
 * - Incident type classification (medical, fire, assault, etc.)
 * - Severity assessment
 * - Key information extraction
 * 
 * Requirements:
 * - OpenAI API key in Supabase secrets: OPENAI_API_KEY
 * - Feature flag: ENABLE_AI_ANALYSIS=true
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';

interface AnalysisRequest {
  alertId: number;
  userId: string;
  transcript?: string;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, unknown>;
}

interface AnalysisResult {
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];
  confidence: number;
  suggestedActions: string[];
  aiNotes: string;
}

/**
 * Analyze incident using OpenAI API
 */
async function analyzeWithOpenAI(
  input: string,
  apiKey: string
): Promise<AnalysisResult> {
  const prompt = `
Analyze this emergency incident and provide structured response as JSON:

Input: ${input}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "incidentType": "medical_emergency|fire|accident|assault|robbery|natural_disaster|hazmat|other",
  "severity": "low|medium|high|critical",
  "keywords": ["key", "terms"],
  "confidence": 0-100,
  "suggestedActions": ["action1", "action2"],
  "aiNotes": "brief analysis"
}

Be conservative with severity. Only use "critical" if life-threatening.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON from response (handle markdown wrappers)
    let result: AnalysisResult;
    try {
      result = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }
      result = JSON.parse(jsonMatch[0]);
    }

    return result;
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const body = (await req.json()) as AnalysisRequest;

    // Validate request
    if (!body.alertId || !body.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing alertId or userId',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if AI is enabled
    const aiEnabled = Deno.env.get('ENABLE_AI_ANALYSIS') === 'true';

    if (!aiEnabled) {
      // Return mock analysis if disabled
      const mockResult: AnalysisResult = {
        incidentType: 'other',
        severity: 'medium',
        keywords: [],
        confidence: 0,
        suggestedActions: ['Dispatch responders to scene'],
        aiNotes: 'AI analysis disabled',
      };

      return new Response(JSON.stringify({ success: true, analysis: mockResult }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get API key
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not configured - returning default analysis');
      const mockResult: AnalysisResult = {
        incidentType: 'other',
        severity: 'medium',
        keywords: [],
        confidence: 0,
        suggestedActions: [],
        aiNotes: 'API key not configured',
      };

      return new Response(JSON.stringify({ success: true, analysis: mockResult }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Combine input sources
    const input = [body.description, body.transcript].filter(Boolean).join('\n\n');

    if (!input) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No incident information provided',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Analyze with AI
    const analysis = await analyzeWithOpenAI(input, apiKey);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Save to database
      const { error: dbError } = await supabase.from('incident_analysis').insert({
        alert_id: body.alertId,
        user_id: body.userId,
        analysis_result: analysis,
        processed_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('Database error:', dbError);
        // Don't fail - return analysis anyway
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Analyze incident error:', error);

    // Return graceful error with mock analysis
    const mockResult: AnalysisResult = {
      incidentType: 'other',
      severity: 'medium',
      keywords: [],
      confidence: 0,
      suggestedActions: ['Dispatch responders to scene'],
      aiNotes: 'Analysis error - using defaults',
    };

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        analysis: mockResult, // Still return mock so incident isn't blocked
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
