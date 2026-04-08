import bcrypt from 'bcryptjs';
import { supabase } from '@/utils/supabase';

export async function POST(req: Request) {
  try {
    const { userId, newPassword, fullName } = await req.json();

    if (!userId || !newPassword || !fullName) {
      return Response.json({ error: 'Missing userId, newPassword, or fullName.' }, { status: 400 });
    }

    if (newPassword.length < 3) {
      return Response.json({ error: 'Password must be at least 3 characters.' }, { status: 400 });
    }

    // Hash with bcrypt (salt rounds = 10)
    const hashed = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ 
        password: hashed,
        full_name: fullName
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Set-password DB error:', error);
      return Response.json({ error: 'Failed to save password.' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err: any) {
    console.error('Set-password API error:', err);
    return Response.json({ error: err.message || 'Failed to save password.' }, { status: 500 });
  }
}
