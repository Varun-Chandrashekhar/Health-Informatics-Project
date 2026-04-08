import bcrypt from 'bcryptjs';
import { supabase } from '@/utils/supabase';

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return Response.json({ error: 'Missing userId or password.' }, { status: 400 });
    }

    // Fetch the user record
    const { data, error } = await supabase
      .from('users')
      .select('user_id, password, assigned_condition, is_admin')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Login query error:', error);
      if (error?.code === 'PGRST116') {
        return Response.json({ error: `User "${userId}" not found.` }, { status: 401 });
      }
      return Response.json({ error: error?.message || 'User not found.' }, { status: 401 });
    }

    const storedPassword = data.password as string;

    // Support three stored formats:
    // 1. bcrypt hash  (starts with $2a$ or $2b$)
    // 2. base64 encoded plain text (legacy btoa())
    // 3. plain text (original default passwords like "P09")
    let passwordMatch = false;

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      // bcrypt hash — use proper compare
      passwordMatch = await bcrypt.compare(password, storedPassword);
    } else {
      // Legacy: plain text or btoa() — check both
      passwordMatch =
        storedPassword === password ||
        storedPassword === Buffer.from(password).toString('base64');
    }

    if (!passwordMatch) {
      return Response.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    // Return the user info (never return the password)
    return Response.json({
      success: true,
      user: {
        userId: data.user_id,
        condition: data.assigned_condition || 'control',
        isAdmin: data.is_admin || false,
      },
    });

  } catch (err: any) {
    console.error('Login API error:', err);
    return Response.json({ error: err.message || 'Login failed.' }, { status: 500 });
  }
}
