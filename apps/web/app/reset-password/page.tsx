'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (new URLSearchParams(window.location.search).has('error')) { setState('invalid'); return; }
    createClient().auth.getUser().then(({ data, error }) => {
      if (active) setState(data.user && !error ? 'ready' : 'invalid');
    }).catch(() => { if (active) setState('invalid'); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Revoke refresh sessions after a reset; ask for the new password on next sign-in.
      const { error: signOutError } = await supabase.auth.signOut().catch(() => ({ error: new Error('Sign-out failed') }));
      window.postMessage({ type: 'CAPTUTO_AUTH', authToken: null, userEmail: null }, window.location.origin);
      setPassword(''); setConfirmation(''); setState('done');
      if (signOutError) setError('Your password was changed, but some sessions could not be signed out. Please sign out of your other devices.');
    } catch {
      setError('The password could not be changed. Try a different password or request a new reset link.');
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-muted p-4"><Card className="w-full max-w-md">
    <CardHeader><CardTitle>Choose a new password</CardTitle><CardDescription>Use at least 8 characters and a password you do not use elsewhere.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {state === 'loading' && <p role="status">Checking your reset link…</p>}
      {state === 'invalid' && <><p role="alert" className="text-sm">This link is invalid, expired or was opened in a different browser. Request a new link and open it in the same browser.</p><Button asChild><Link href="/forgot-password">Request a new link</Link></Button></>}
      {state === 'ready' && <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/></div>
        <div className="space-y-2"><Label htmlFor="confirmation">Confirm new password</Label><Input id="confirmation" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy}/></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</Button>
      </form>}
      {state === 'done' && <><p role="status">Your password has been changed.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button asChild><Link href="/login">Sign in</Link></Button></>}
    </CardContent>
  </Card></main>;
}
