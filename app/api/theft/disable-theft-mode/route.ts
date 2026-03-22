/**
 * Disable Theft Mode API
 * Called by device owner to deactivate theft protection
 * Requires authentication verification (PIN or backend session)
 * 
 * POST /api/theft/disable-theft-mode
 */

import { supabase } from '@/utils/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

interface DisableRequest {
  userId?: string;
  authenticationMethod: 'pin' | 'biometric' | 'backend-verification';
  pinCode?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { userId, authenticationMethod, pinCode }: DisableRequest = await req.json();

    // Supabase client ready from singleton import

    // Step 1: Get the authenticated user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Step 2: Verify that the requesting user is the owner of the device
    const targetUserId = userId || session.user.id;

    if (session.user.id !== targetUserId) {
      return NextResponse.json(
        { error: 'Cannot disable theft mode for other users' },
        { status: 403 }
      );
    }

    // Step 3: Verify PIN if provided (optional - can use session-based auth only)
    if (authenticationMethod === 'pin' && pinCode) {
      // In production, hash and compare PIN
      // For now, simple validation - replace with proper hashing
      const hashedPin = Buffer.from(pinCode).toString('base64');

      // Placeholder - integrate with actual PIN verification service
      // For demo: accept any 4-digit PIN
      if (!/^\d{4}$/.test(pinCode)) {
        return NextResponse.json(
          { error: 'Invalid PIN format' },
          { status: 400 }
        );
      }
    }

    // Step 4: Disable theft mode
    // @ts-ignore - new columns not yet in Supabase auto-generated types
    const { data: profile, error: updateError } = await (supabase
      .from('profiles')
      .update({
        is_stolen: false,
        stolen_activated_at: null,
      } as any)
      .eq('id', targetUserId)
      .select()
      .single() as any);

    if (updateError) {
      console.error('❌ Failed to disable theft mode:', updateError);
      throw updateError;
    }

    console.log('✅ Theft mode disabled:', {
      userId: targetUserId,
      disabledBy: session.user.email,
      timestamp: new Date().toISOString(),
    });

    // Step 5: Log this disable action for audit trail
    // @ts-ignore - theft_mode_log is new table not in auto-generated types
    await supabase
      .from('theft_mode_log')
      // @ts-ignore
      .insert({
        user_id: targetUserId,
        disabled_by: session.user.email,
        action: 'disabled',
        authentication_method: authenticationMethod,
        timestamp: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Theft mode disabled successfully',
      data: {
        is_stolen: false,
        disabled_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Disable theft mode error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
