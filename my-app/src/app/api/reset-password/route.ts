import bcrypt from 'bcryptjs';
import { supabase } from '@/utils/supabase';

export async function POST(req: Request) {
  try {
    const { userId, fullName, newPassword } = await req.json();

    if (!userId || !fullName || !newPassword) {
      return Response.json({ error: 'Missing userId, fullName, or newPassword.' }, { status: 400 });
    }

    // 1. Verify the identity by checking the full name
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    if (fetchError || !data) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!data.full_name) {
      return Response.json({ error: 'Recovery name not set for this account. Please contact an administrator.' }, { status: 400 });
    }

    // Simple case-insensitive match for the recovery
    if (data.full_name.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      return Response.json({ error: 'Identity verification failed. Name does not match our records.' }, { status: 401 });
    }

    // 2. Identity verified, update the password
    const hashed = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashed })
      .eq('user_id', userId);

    if (updateError) {
      return Response.json({ error: 'Failed to reset password.' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err: any) {
    console.error('Reset password API error:', err);
    return Response.json({ error: err.message || 'Reset failed.' }, { status: 500 });
  }
}
