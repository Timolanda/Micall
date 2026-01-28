/**
 * POST /api/invites/accept
 * Accept an invite and link the invited user to the inviter's safety circle
 * 
 * Request body: { inviteCode }
 * Response: { success, message, inviterName }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidInviteCodeFormat, isInviteExpired } from '@/utils/inviteGenerator';

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
    const userEmail = user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { inviteCode } = body;

    // Validate invite code format
    if (!inviteCode || !isValidInviteCodeFormat(inviteCode)) {
      return NextResponse.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      );
    }

    // Find the invite
    const { data: inviteData, error: findError } = await supabase
      .from('user_invites')
      .select('id, inviter_user_id, expires_at, status, invitee_email')
      .eq('invite_code', inviteCode)
      .single();

    if (findError || !inviteData) {
      return NextResponse.json(
        { error: 'Invite code not found or already used' },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (inviteData.status !== 'pending') {
      return NextResponse.json(
        { error: `This invite has already been ${inviteData.status}` },
        { status: 400 }
      );
    }

    // Check if expired
    if (isInviteExpired(inviteData.expires_at)) {
      // Mark as expired in DB
      await supabase
        .from('user_invites')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', inviteData.id);

      return NextResponse.json(
        { error: 'This invite has expired (valid for 7 days)' },
        { status: 410 }
      );
    }

    // Check if email matches (if invitee_email was set)
    if (inviteData.invitee_email && inviteData.invitee_email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 403 }
      );
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('user_invites')
      .update({
        status: 'accepted',
        accepted_by_user_id: userId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteData.id);

    if (updateError) {
      console.error('Error accepting invite:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept invite' },
        { status: 500 }
      );
    }

    // Get inviter profile info
    const { data: inviterProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, id')
      .eq('id', inviteData.inviter_user_id)
      .single();

    if (profileError) {
      console.error('Error fetching inviter profile:', profileError);
    }

    const inviterName = inviterProfile?.full_name || 'Someone';

    return NextResponse.json(
      {
        success: true,
        message: `You've joined ${inviterName}'s safety circle!`,
        inviterName,
        inviterId: inviteData.inviter_user_id,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as any;
    console.error('Accept invite error:', err);
    return NextResponse.json(
      { error: 'Failed to accept invite', details: err.message },
      { status: 500 }
    );
  }
}
