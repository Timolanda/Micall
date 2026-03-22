/**
 * Delete Trusted Contact API
 * Remove a trusted contact by ID
 * 
 * DELETE /api/theft/trusted-contacts/[contactId]
 */

import { supabase } from '@/utils/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    // Verify user is authenticated
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

    // Verify ownership of contact
    const { data: contact, error: checkError } = await (supabase
      .from('trusted_contacts')
      .select('user_id')
      .eq('id', params.contactId)
      .single() as any);

    if (checkError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    if ((contact as any)?.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete contacts for other users' },
        { status: 403 }
      );
    }

    // Delete the contact
    const { error: deleteError } = await (supabase
      .from('trusted_contacts')
      .delete()
      .eq('id', params.contactId) as any);

    if (deleteError) {
      console.error('❌ Failed to delete contact:', deleteError);
      throw deleteError;
    }

    console.log('✅ Contact deleted:', {
      contactId: params.contactId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Contact removed successfully',
    });
  } catch (error) {
    console.error('❌ Delete contact error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
