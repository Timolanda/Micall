import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client - lazy load to avoid initialization errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface ConvertUserRequest {
  userId: string;
  targetRole: string;
  callerEmail: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConvertUserRequest;
    const { userId, targetRole, callerEmail } = body;

    // Verify caller is owner
    if (callerEmail !== 'timolanda@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized: Only platform owner can convert users' },
        { status: 403 }
      );
    }

    // Validate target role
    const validRoles = ['admin', 'police', 'fire', 'hospital', 'ems', 'responder'];
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Update user role
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: targetRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `User role updated to ${targetRole}`,
        user: data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
