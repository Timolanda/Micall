/**
 * Trigger Theft Mode API
 * Called by trusted contacts to activate device recovery
 * 
 * POST /api/theft/trigger-theft-mode
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyTrustedContact,
  updateTheftStatus,
  logTheftAction,
} from '@/utils/theftApiHelpers';

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

    // Step 1: Verify that the contact is trusted AND verified
    const contact = await verifyTrustedContact(userId, requestingContactPhone);

    // Step 2: Activate theft mode in the database
    const profile = await updateTheftStatus(userId, true);

    console.log('✅ Theft mode activated:', {
      userId,
      triggeredBy: contact?.contact_name,
      timestamp: new Date().toISOString(),
    });

    // Step 3: Log this activation for audit trail
    await logTheftAction(userId, 'theft_mode_triggered', {
      triggered_by_contact: contact?.contact_name,
      triggered_by_phone: requestingContactPhone,
    });

    return NextResponse.json({
      success: true,
      message: 'Theft mode activated successfully',
      data: {
        is_stolen: profile?.is_stolen,
        activated_at: profile?.stolen_activated_at,
        device_id: profile?.device_id,
        triggered_by: contact?.contact_name,
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
