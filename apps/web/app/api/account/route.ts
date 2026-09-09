import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { deleteAccount } from '@/lib/account/delete-account';

export const maxDuration = 120;

export async function DELETE(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Open account settings on this website to delete your account.' }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) return NextResponse.json({ error: 'Sign in again to delete your account.' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (body?.confirmation !== 'DELETE' || typeof body.password !== 'string' || !body.password || body.password.length > 1024) {
    return NextResponse.json({ error: 'Enter your current password and type DELETE to confirm.' }, { status: 400 });
  }
  // A separate client verifies the password without replacing this browser's session.
  const verifier = createAuthClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const verified = await verifier.auth.signInWithPassword({ email: user.email, password: body.password });
  if (verified.error || verified.data.user?.id !== user.id) {
    return NextResponse.json({ error: 'The password could not be verified. Try again or reset your password first.' }, { status: 403 });
  }
  await verifier.auth.signOut({ scope: 'local' });
  try {
    await deleteAccount(user.id);
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* Account is already deleted; do not report a false failure. */ }
    return NextResponse.json({ success: true });
  } catch {
    // Do not claim rollback: some subscriptions/files may already have been removed.
    const { data } = await supabase.auth.getUser();
    return NextResponse.json({ pending: data.user?.app_metadata.account_deletion_pending === true, error: 'Deletion could not be completed. Some data or subscriptions may already have been removed. Retry here to finish, or contact support.' }, { status: 503 });
  }
}
