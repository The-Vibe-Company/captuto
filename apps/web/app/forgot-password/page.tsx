'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setError('We could not send a reset link. Please wait a moment and try again.');
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-muted p-4">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Reset your password</CardTitle><CardDescription>Enter the email address you use for CapTuto.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        {sent ? <div role="status" className="space-y-3 text-sm"><p>If an account exists for <strong>{email.trim()}</strong>, you will receive a password reset link.</p><p className="text-muted-foreground">Check your inbox and spam folder. Open the link in this browser to choose a new password.</p><Button variant="outline" onClick={() => setSent(false)}>Use another email or retry</Button></div> :
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
          </form>}
        <Link href="/login" className="block text-sm text-primary underline">Back to sign in</Link>
      </CardContent>
    </Card>
  </main>;
}
