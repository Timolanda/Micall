/**
 * Disable Theft Mode API
 * Called by device owner to deactivate theft protection
 * Requires authentication verification (PIN or backend session)
 * 
 * POST /api/theft/disable-theft-mode
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  updateTheftStatus,
  logTheftAction,
} from '@/utils/theftApiHelpers';

interface DisableRequest {
  userId?: string;
  authenticationMethod: 'pin' | 'biometric' | 'backend-verification';
  pinCode?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { userId, authenticationMethod, pinCode }: DisableRequest = await req.json();

    // Step 1: Get the authenticated user
    const user = await getAuthenticatedUser();
    const targetUserId = userId || user.id;

    // Step 2: Verify that the requesting user is the owner of the device
    if (user.id !== targetUserId) {
      return NextResponse.json(
        { error: 'Cannot disable theft mode for other users' },
        { status: 403 }
      );
    }

    // Step 3: Verify PIN if provided (optional - can use session-based auth only)
    if (authenticationMethod === 'pin' && pinCode) {
      // In production, hash and compare PIN
      // For now, simple validation - replace with proper hashing
      if (!/^\d{4}$/.test(pinCode)) {
        return NextResponse.json(
          { error: 'Invalid PIN format' },
          { status: 400 }
        );
      }
    }

    // Step 4: Disable theft mode
    const profile = await updateTheftStatus(targetUserId, false);

    console.log('✅ Theft mode disabled:', {
      userId: targetUserId,
      disabledBy: user.email,
      timestamp: new Date().toISOString(),
    });

    // Step 5: Log this disable action for audit trail
    await logTheftAction(targetUserId, 'theft_mode_disabled', {
      disabled_by: user.email,
      authentication_method: authenticationMethod,
    });

    return NextResponse.json({
      success: true,
      message: 'Theft mode disabled successfully',
      data: {
        is_stolen: profile?.is_stolen,
        disabled_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Disable theft error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
