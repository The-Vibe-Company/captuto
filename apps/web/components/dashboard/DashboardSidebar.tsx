'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DESKTOP_DOWNLOAD_URL } from '@/lib/constants/download';
import { fetchDashboardPage, type DashboardTab } from '@/lib/dashboard/query';

const tabs: { key: DashboardTab; label: string }[] = [
  { key: 'all', label: 'All guides' },
  { key: 'shared', label: 'Shared' },
  { key: 'draft', label: 'Drafts' },
  { key: 'processing', label: 'Processing' },
];

const libraryNav = ['Onboarding', 'Support', 'Internal SOPs'];

export function DashboardSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
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
    window.postMessage({ type: 'CAPTUTO_AUTH', authToken: null, userEmail: null }, window.location.origin);
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col gap-1 border-r border-stone-200/70 bg-[#fafaf9] p-2.5 lg:flex">
      <Link href="/dashboard" className="mb-2 flex items-center gap-2 px-2 py-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/captuto-mark.svg" alt="" className="h-5 w-5 rounded-[5px]" />
        <span className="text-[13px] font-semibold tracking-tight text-stone-900">CapTuto</span>
        <span className="ml-auto text-[11px] text-stone-500" title={userEmail}>{initials}</span>
      </Link>

      <label className="mb-2.5 flex h-[30px] items-center gap-2 rounded-md border border-stone-200 bg-white px-2 text-stone-500 focus-within:border-stone-300 focus-within:ring-2 focus-within:ring-brand-200/50">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <input
          type="search"
          aria-label="Search guide titles"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-[12.5px] text-stone-900 outline-none placeholder:text-stone-500"
        />
        <span className="shrink-0 text-[10.5px] text-stone-400">⌘K</span>
      </label>

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

      <div className="px-2 pb-1 pt-3.5 text-[11px] font-medium text-stone-400">Folders</div>
      {libraryNav.map((label) => (
        <span
          key={label}
          className="flex h-[30px] cursor-default items-center gap-2 rounded-md px-2 text-[12.5px] text-stone-500"
        >
          {label}
        </span>
      ))}

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
  );
}
