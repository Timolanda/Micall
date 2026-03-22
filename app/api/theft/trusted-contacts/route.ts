/**
 * Trusted Contacts Management API
 * Get, add, verify, and remove trusted contacts
 * 
 * GET /api/theft/trusted-contacts - List all contacts
 * POST /api/theft/trusted-contacts - Add new contact
 */

import { supabase } from '@/utils/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Retrieve all trusted contacts for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
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

    // Fetch all trusted contacts for this user
    const { data: contacts, error: fetchError } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Failed to fetch contacts:', fetchError);
      throw fetchError;
    }

    console.log('✅ Fetched contacts:', {
      userId: session.user.id,
      count: contacts?.length || 0,
    });

    return NextResponse.json({
      data: contacts || [],
      count: contacts?.length || 0,
    });
  } catch (error) {
    console.error('❌ Get contacts error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a new trusted contact
 * Initial step: Add contact, then trigger OTP verification
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user's session
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

    // Parse request body
    const { contactPhone, contactName } = await req.json();

    // Validate inputs
    if (!contactPhone || !contactName) {
      return NextResponse.json(
        { error: 'contactPhone and contactName are required' },
        { status: 400 }
      );
    }

    // Normalize phone number (remove all non-digits)
    const normalizedPhone = contactPhone.replace(/\D/g, '');

    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Step 1: Check if contact already exists
    const { data: existingContact } = await supabase
      .from('trusted_contacts')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('contact_phone', normalizedPhone)
      .single();

    if (existingContact) {
      return NextResponse.json(
        { error: 'This contact is already in your list' },
        { status: 400 }
      );
    }

    // Step 2: Check contact limit (max 5)
    const { data: allContacts, error: countError } = await supabase
      .from('trusted_contacts')
      .select('id')
      .eq('user_id', session.user.id);

    if (countError) throw countError;

    if ((allContacts?.length || 0) >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 trusted contacts allowed' },
        { status: 400 }
      );
    }

    // Step 3: Insert the contact (unverified initially)
    const { data: newContact, error: insertError } = await (supabase as any)
      .from('trusted_contacts')
      .insert({
        user_id: session.user.id,
        contact_phone: normalizedPhone,
        contact_name: contactName,
        verified: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert contact:', insertError);
      throw insertError;
    }

    console.log('✅ Contact added (awaiting OTP):', {
      userId: session.user.id,
      contact: contactName,
      phone: normalizedPhone,
    });

    // Step 4: Send OTP via Supabase Auth
    // This will send an OTP to the contact's phone number
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    if (otpError) {
      // Contact was added but OTP failed - user can try again
      console.error('⚠️ OTP sending failed:', otpError);
      return NextResponse.json({
        data: newContact,
        warning: 'Contact added but OTP sending failed. Please try again.',
        otpError: otpError.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Contact added. OTP verification code sent to their phone.',
      data: newContact,
      nextStep: 'The contact must verify the OTP to complete the process',
    });
  } catch (error) {
    console.error('❌ Add contact error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
