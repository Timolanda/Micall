/**
 * Trigger Theft Mode API
 * Called by trusted contacts to activate device recovery
 * 
 * POST /api/theft/trigger-theft-mode
 */

import { supabase } from '@/utils/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

interface TriggerRequest {
  userId: string;
  requestingContactPhone: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { userId, requestingContactPhone }: TriggerRequest = await req.json();

    // Validate inputs
    if (!userId || !requestingContactPhone) {
      return NextResponse.json(
        { error: 'userId and requestingContactPhone are required' },
        { status: 400 }
      );
    }

    // Supabase client ready from singleton import

    // Step 1: Verify that the contact is trusted AND verified
    const { data: contact, error: contactError } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_phone', requestingContactPhone)
      .eq('verified', true)
      .single();

    if (contactError || !contact) {
      console.log('❌ Contact not authorized:', { userId, phone: requestingContactPhone });
      return NextResponse.json(
        {
          error: 'Contact not authorized to trigger theft mode',
          code: 'CONTACT_NOT_VERIFIED',
        },
        { status: 403 }
      );
    }

    // Step 2: Activate theft mode in the database
    // @ts-ignore - new columns (is_stolen, stolen_activated_at) not in auto-generated types
    const { data: profile, error: updateError } = await (supabase
      .from('profiles')
      // @ts-ignore
      .update({
        is_stolen: true,
        stolen_activated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single() as any);

    if (updateError) {
      console.error('❌ Failed to update profiles:', updateError);
      throw updateError;
    }

    console.log('✅ Theft mode activated:', {
      userId,
      triggeredBy: (contact as any)?.contact_name,
      timestamp: new Date().toISOString(),
    });

    // Step 3: Log this activation for audit trail
    try {
      await supabase.from('theft_mode_log').insert({
        user_id: userId,
      triggered_by_contact: (contact as any)?.contact_name,
        triggered_by_phone: requestingContactPhone,
        action: 'activated',
        timestamp: new Date().toISOString(),
      } as any);
    } catch (logErr) {
      console.warn('⚠️ Could not log theft activation:', logErr);
    }

    // Step 4: Broadcast notification to device (via Realtime subscription)
    // The frontend will be listening for changes to profiles.is_stolen
    // (No need to manually subscribe - frontend handles this)

    return NextResponse.json({
      success: true,
      message: 'Theft mode activated successfully',
      data: {
        is_stolen: (profile as any)?.is_stolen,
        activated_at: (profile as any)?.stolen_activated_at,
        device_id: (profile as any)?.device_id,
        triggered_by: (contact as any)?.contact_name,
      },
    });
  } catch (error) {
    console.error('❌ Theft trigger error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
