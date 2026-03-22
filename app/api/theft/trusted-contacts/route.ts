/**
 * Trusted Contacts Management API
 * Get, add, verify, and remove trusted contacts
 * 
 * GET /api/theft/trusted-contacts - List all contacts
 * POST /api/theft/trusted-contacts - Add new contact
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getTrustedContacts,
  addTrustedContact,
} from '@/utils/theftApiHelpers';
import { supabase } from '@/utils/supabaseClient';

/**
 * GET - Retrieve all trusted contacts for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getAuthenticatedUser();

    // Fetch all trusted contacts for this user
    const contacts = await getTrustedContacts(user.id);

    console.log('✅ Fetched contacts:', {
      userId: user.id,
      count: contacts.length,
    });

    return NextResponse.json({
      data: contacts,
      count: contacts.length,
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
    // Get the authenticated user
    const user = await getAuthenticatedUser();

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

    // Add the contact using helper
    const newContact = await addTrustedContact(
      user.id,
      normalizedPhone,
      contactName
    );

    console.log('✅ Contact added (awaiting OTP):', {
      userId: user.id,
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
