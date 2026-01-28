/**
 * POST /api/invites/generate
 * Generate a new invite code for the authenticated user
 * 
 * Request body: { sourceFlow?: 'profile' | 'contacts' | 'onboarding' }
 * Response: { inviteCode, inviteLink, expiresAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInviteCode, createInviteLink, calculateInviteExpiry, canSendInvite } from '@/utils/inviteGenerator';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const { sourceFlow = 'profile' } = body;

    if (!['profile', 'contacts', 'onboarding'].includes(sourceFlow)) {
      return NextResponse.json(
        { error: 'Invalid sourceFlow' },
        { status: 400 }
      );
    }

    // Check rate limit: max 10 invites per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayInvites, error: countError } = await supabase
      .from('user_invites')
      .select('id', { count: 'exact', head: true })
      .eq('inviter_user_id', userId)
      .gte('created_at', today.toISOString())
      .eq('status', 'pending');

    if (countError) {
      console.error('Error checking invite limit:', countError);
      return NextResponse.json(
        { error: 'Failed to check rate limit' },
        { status: 500 }
      );
    }

    const inviteCount = todayInvites?.length || 0;
    if (!canSendInvite(inviteCount)) {
      return NextResponse.json(
        { error: 'You have reached the daily invite limit (10 per day)', remaining: 0 },
        { status: 429 }
      );
    }

    // Generate new invite code
    const inviteCode = generateInviteCode();
    const expiresAt = calculateInviteExpiry();

    // Store in database
    const { data: insertedInvite, error: insertError } = await supabase
      .from('user_invites')
      .insert({
        inviter_user_id: userId,
        invite_code: inviteCode,
        expires_at: expiresAt,
        status: 'pending',
        metadata: {
          sourceFlow,
          createdAt: new Date().toISOString(),
          userAgent: request.headers.get('user-agent'),
        },
      })
      .select('id, invite_code, expires_at, created_at')
      .single();

    if (insertError) {
      console.error('Error creating invite:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate invite' },
        { status: 500 }
      );
    }

    // Get app base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://micall.app';
    const inviteLink = createInviteLink(inviteCode, baseUrl);

    return NextResponse.json(
      {
        success: true,
        inviteCode,
        inviteLink,
        expiresAt,
        message: "Invite generated. You can now share it with someone you trust.",
        remaining: 10 - (inviteCount + 1),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as any;
    console.error('Generate invite error:', err);
    return NextResponse.json(
      { error: 'Failed to generate invite', details: err.message },
      { status: 500 }
    );
  }
}
