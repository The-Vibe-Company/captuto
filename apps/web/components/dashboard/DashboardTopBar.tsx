'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DESKTOP_DOWNLOAD_URL } from '@/lib/constants/download';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function DashboardTopBar({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const initials = userEmail.split('@')[0].slice(0, 2).toUpperCase();
  async function logout() {
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      cache.clear();
      window.postMessage({ type: 'CAPTUTO_AUTH', authToken: null, userEmail: null }, window.location.origin);
      router.push('/login');
      router.refresh();
    } catch {
      setError('Could not sign out. Try again.');
    }
  }
  return <>
    <header className="border-b border-stone-200 bg-[#faf8f3]">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-stone-900">captuto<span className="text-[#bd402d]">.</span></Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button asChild variant="outline" className="h-11 border-stone-300 bg-transparent text-stone-700">
            <a aria-label="Download Captuto for Mac (opens a new tab)" href={DESKTOP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/><span className="sm:hidden">Mac app</span><span className="hidden sm:inline">Download for Mac</span><span className="sr-only"> (opens a new tab)</span></a>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-11 w-11 rounded-full p-0" aria-label="Account menu"><Avatar className="h-9 w-9"><AvatarFallback className="bg-stone-200 text-xs font-semibold text-stone-800">{initials}</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="truncate font-normal">{userEmail}</DropdownMenuLabel><DropdownMenuSeparator/>
              <DropdownMenuItem asChild><Link href="/settings"><Settings className="mr-2 h-4 w-4"/>Settings & agent connection</Link></DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem onSelect={logout}><LogOut className="mr-2 h-4 w-4"/>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    {error && <p role="alert" className="bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
  </>;
}
