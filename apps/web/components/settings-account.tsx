'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AccountSettings({ pending, onPendingChange }: { pending: boolean; onPendingChange: (pending: boolean) => void }) {
  const cache = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);


  async function remove(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        onPendingChange(data.pending === true || pending);
        throw new Error(data.error || 'Account deletion could not be completed. Retry to finish.');
      }
      setDone(true); setPassword(''); setConfirmation('');
      cache.clear();
      await createClient().auth.signOut({ scope: 'local' }).catch(() => {});
      window.postMessage({ type: 'CAPTUTO_AUTH', authToken: null, userEmail: null }, window.location.origin);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The connection was interrupted. Retry here to finish deleting your account.');
    } finally { setBusy(false); }
  }

  return <Card className="mt-6" id="account">
    <CardHeader><CardTitle>Account</CardTitle><CardDescription>Manage your password or permanently delete your account.</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <Button asChild variant="outline"><Link href="/forgot-password">Reset password by email</Link></Button>
      <div className="space-y-3 border-t pt-5">
        {pending && <p role="alert" className="text-sm text-destructive">Account deletion has started. Recording and editing are disabled. Retry deletion to finish, or <Link href="/support" className="underline">contact support</Link>.</p>}
        <p className="text-sm text-muted-foreground">Deleting your account removes your guides, recordings and connections, disables shared links, and cancels your subscriptions immediately.</p>
        <Button variant="destructive" onClick={() => { setOpen(true); setError(''); }}>{pending ? 'Finish deleting account' : 'Delete account'}</Button>
      </div>
    </CardContent>
    <Dialog open={open} onOpenChange={value => { if (done && !value) { router.replace('/'); return; } if (!busy) { setOpen(value); if (!value) { setPassword(''); setConfirmation(''); } } }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle className="pr-6 leading-snug">{done ? 'Account deleted' : 'Permanently delete your account?'}</DialogTitle><DialogDescription>{done ? 'Your guides, recordings and connections have been removed.' : 'This cannot be undone. Export any guides you want to keep and stop your recordings before continuing.'}</DialogDescription></DialogHeader>
        {done ? <Button asChild><Link href="/">Return to home</Link></Button> : <form onSubmit={remove} className="space-y-4">
          <p className="text-sm text-muted-foreground">Subscriptions end immediately. This action does not issue a refund; existing billing records remain with the payment provider. Downloads and copies saved on your devices are not removed.</p>
          <div className="space-y-2"><Label htmlFor="delete-password">Current password</Label><Input id="delete-password" type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={event => setPassword(event.target.value)}/><Link href="/forgot-password" className="text-sm text-primary underline">Forgot password?</Link></div>
          <div className="space-y-2"><Label htmlFor="delete-confirmation">Type DELETE to confirm</Label><Input id="delete-confirmation" autoComplete="off" required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)}/></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {busy && <p role="status" className="text-sm">Deleting your account. Keep this page open…</p>}
          <DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" disabled={busy} onClick={() => { setOpen(false); setPassword(''); setConfirmation(''); }}>{pending ? 'Close' : 'Keep account'}</Button><Button type="submit" variant="destructive" disabled={busy || confirmation !== 'DELETE' || !password}>{busy ? 'Deleting…' : 'Delete account permanently'}</Button></DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
  </Card>;
}
