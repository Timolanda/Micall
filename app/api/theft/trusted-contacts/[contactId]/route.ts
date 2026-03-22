/**
 * Delete Trusted Contact API
 * Remove a trusted contact by ID
 * 
 * DELETE /api/theft/trusted-contacts/[contactId]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  removeTrustedContact,
} from '@/utils/theftApiHelpers';
import { supabase } from '@/utils/supabaseClient';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    // Verify user is authenticated
    const user = await getAuthenticatedUser();

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

    if ((contact as any)?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Cannot delete contacts for other users' },
        { status: 403 }
      );
    }

    // Delete the contact
    await removeTrustedContact(user.id, params.contactId);

    console.log('✅ Contact deleted:', {
      contactId: params.contactId,
      userId: user.id,
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
