'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Menu, Search, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DESKTOP_DOWNLOAD_URL } from '@/lib/constants/download';
import { fetchDashboardPage, type DashboardTab } from '@/lib/dashboard/query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const tabs: { key: DashboardTab; label: string }[] = [
  { key: 'all', label: 'All guides' },
  { key: 'shared', label: 'Shared' },
  { key: 'draft', label: 'Drafts' },
  { key: 'processing', label: 'To review' },
];



function SearchBox({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`flex h-[30px] items-center gap-2 rounded-md border border-stone-200 bg-white px-2 text-stone-500 focus-within:border-stone-300 focus-within:ring-2 focus-within:ring-brand-200/50 ${className ?? ''}`}>
      <Search className="h-3.5 w-3.5 shrink-0" />
      <input
        type="search"
        aria-label="Search guide titles"
        placeholder="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 border-0 bg-transparent p-0 text-[12.5px] text-stone-900 outline-none placeholder:text-stone-500"
      />

    </label>
  );
}

export function DashboardSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const cache = useQueryClient();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as DashboardTab) || 'all';
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => setSearch(searchParams.get('search') || ''), [searchParams]);

  useEffect(() => {
    const current = searchParams.get('search') || '';
    if (search === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set('search', search.trim()); else params.delete('search');
      params.delete('page');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data } = useQuery({
    queryKey: ['dashboard', '', 'all', 'recent', 1],
    queryFn: ({ signal }) => fetchDashboardPage('page=1&search=&tab=all&sort=recent', signal),
    staleTime: 15_000,
  });

  function hrefForTab(tab: DashboardTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'all') params.delete('tab'); else params.set('tab', tab);
    params.delete('page');
    return `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  }

  const initials = userEmail.split('@')[0].slice(0, 2).toUpperCase() || 'U';

  async function logout() {
    await createClient().auth.signOut();
    cache.clear();
    window.postMessage({ type: 'CAPTUTO_AUTH', authToken: null, userEmail: null }, window.location.origin);
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile/tablet top bar: below lg, the desktop sidebar is hidden, so this is the only way to search, switch views, or sign out. */}
      <header className="flex h-12 flex-none items-center gap-2 border-b border-stone-200/70 bg-[#fafaf9] px-3 lg:hidden">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/captuto-mark.svg" alt="" className="h-5 w-5 rounded-[5px]" />
        </Link>
        <SearchBox value={search} onChange={setSearch} className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-stone-600" aria-label="Menu">
              <Menu className="h-4.5 w-4.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate text-xs font-normal text-stone-500">{userEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tabs.map((item) => (
              <DropdownMenuItem key={item.key} asChild>
                <Link href={hrefForTab(item.key)} className="flex items-center justify-between">
                  <span className={activeTab === item.key ? 'font-medium text-stone-900' : ''}>{item.label}</span>
                  <span className="text-xs text-stone-400">{data?.counts[item.key] ?? ''}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={DESKTOP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" />Download for Mac</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col gap-1 border-r border-stone-200/70 bg-[#fafaf9] p-2.5 lg:flex">
        <Link href="/dashboard" className="mb-2 flex items-center gap-2 px-2 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/captuto-mark.svg" alt="" className="h-5 w-5 rounded-[5px]" />
          <span className="text-[13px] font-semibold tracking-tight text-stone-900">CapTuto</span>
          <span className="ml-auto text-[11px] text-stone-500" title={userEmail}>{initials}</span>
        </Link>

        <SearchBox value={search} onChange={setSearch} className="mb-2.5" />

        <nav className="flex flex-col gap-0.5">
          {tabs.map((item) => {
            const active = activeTab === item.key;
            return (
              <Link
                key={item.key}
                href={hrefForTab(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-[30px] items-center gap-2 rounded-md px-2 text-[12.5px] font-medium transition-colors ${active ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}
              >
                <span className="h-1.5 w-1.5 rounded-sm bg-current opacity-55" />
                {item.label}
                <span className="ml-auto text-[11px] font-normal text-stone-400">{data?.counts[item.key] ?? ''}</span>
              </Link>
            );
          })}
        </nav>



        <div className="mt-auto flex flex-col gap-0.5 border-t border-stone-200/70 pt-2">
          <a
            href={DESKTOP_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[30px] items-center gap-2 rounded-md px-2 text-[12.5px] text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          >
            <Download className="h-3.5 w-3.5" />
            Download for Mac
          </a>
          <Link
            href="/settings"
            className="flex h-[30px] items-center gap-2 rounded-md px-2 text-[12.5px] text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex h-[30px] items-center gap-2 rounded-md px-2 text-left text-[12.5px] text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
