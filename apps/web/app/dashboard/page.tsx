'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, FileText, Loader2, MoreHorizontal, Pencil, RefreshCw, Search, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DashboardGuide, DashboardPage as GuidePage, DashboardSort, DashboardTab } from '@/lib/dashboard/query';

const ShareDialog = dynamic(() => import('@/components/dashboard/ShareDialog').then(m => m.ShareDialog));
const tabs: { key: DashboardTab; label: string }[] = [{ key: 'all', label: 'All guides' }, { key: 'shared', label: 'Shared' }, { key: 'draft', label: 'Drafts' }, { key: 'processing', label: 'Processing' }];

async function fetchPage(query: string, signal: AbortSignal): Promise<GuidePage> {
  const response = await fetch(`/api/dashboard?${query}`, { signal });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('Could not load your guides. Try again.');
  return response.json();
}

export default function DashboardPage() {
  const router = useRouter();
  const cache = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<DashboardTab>('all');
  const [sort, setSort] = useState<DashboardSort>('recent');
  const [page, setPage] = useState(1);
  const [share, setShare] = useState<DashboardGuide | null>(null);
  const [deleting, setDeleting] = useState<DashboardGuide | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const params = new URLSearchParams({ page: String(page), search: query, tab, sort });
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', query, tab, sort, page],
    queryFn: ({ signal }) => fetchPage(params.toString(), signal),
  });
  useEffect(() => { if (error?.message === 'UNAUTHORIZED') router.replace('/login'); }, [error, router]);
  useEffect(() => { if (data && page > 1 && data.tutorials.length === 0) setPage(Math.max(1, Math.ceil(data.total / data.pageSize))); }, [data, page]);
  async function removeGuide() {
    if (!deleting) return;
    setDeleteBusy(true); setDeleteError('');
    try {
      const response = await fetch(`/api/tutorials/${deleting.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete this guide. It is still available; try again.');
      setDeleting(null);
      await cache.invalidateQueries({ queryKey: ['dashboard'] });
      await cache.invalidateQueries({ queryKey: ['tutorials'] });
    } catch (e) { setDeleteError(e instanceof Error ? e.message : 'Could not delete this guide.'); }
    finally { setDeleteBusy(false); }
  }
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
    <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#ad3d2b]">Your workspace</p><h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">A little clarity, saved.</h1><p className="mt-4 max-w-lg text-sm leading-6 text-stone-600">Record in Captuto for Mac. Turn your captures into a guide here, or shape them with your agent.</p></div>
      <Link href="/settings" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-700 underline-offset-4 hover:underline">Connect your agent<ArrowRight className="h-4 w-4"/></Link>
    </div>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-500"/><Input aria-label="Search guide titles" type="search" maxLength={200} placeholder="Find a guide by title…" value={search} onChange={e => setSearch(e.target.value)} className="h-11 border-stone-300 bg-white pl-10"/></div>
      <div className="flex gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-11 flex-1 justify-between gap-3 border-stone-300 bg-white sm:flex-none" aria-label="Sort guides">{sort === 'recent' ? 'Newest first' : sort === 'oldest' ? 'Oldest first' : 'Title A–Z'}<ChevronDown className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{([{ key: 'recent', label: 'Newest first' }, { key: 'oldest', label: 'Oldest first' }, { key: 'title', label: 'Title A–Z' }] as const).map(option => <DropdownMenuItem key={option.key} onSelect={() => { setSort(option.key); setPage(1); }}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu><Button variant="outline" className="h-11 w-11 bg-white p-0" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh guides"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}/></Button></div>
    </div>
    <div role="group" aria-label="Filter guides" className="mb-3 flex flex-wrap gap-1 border-b border-stone-200 pb-3">{tabs.map(item => <Button key={item.key} variant="ghost" aria-pressed={tab === item.key} onClick={() => { setTab(item.key); setPage(1); }} className={`h-11 gap-2 px-3 ${tab === item.key ? 'bg-stone-900 text-white hover:bg-stone-800 hover:text-white' : 'text-stone-600'}`}>{item.label}<span className="text-xs tabular-nums opacity-70">{data?.counts[item.key] ?? '—'}</span></Button>)}</div>
    {error && error.message !== 'UNAUTHORIZED' ? <div role="alert" className="py-12 text-center"><p className="text-red-700">{error.message}</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button></div> : isLoading ? <div role="status" aria-label="Loading guides" className="space-y-3 py-4">{[0,1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-stone-200/60"/>)}</div> : data?.tutorials.length ? <>
      <ul aria-label="Guides" className="divide-y divide-stone-200">{data.tutorials.map(guide => <li key={guide.id} className="group flex items-center gap-3 py-5 sm:gap-5">
        <Link href={`/editor/${guide.id}`} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:gap-5">
          <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500"><FileText className="h-5 w-5"/></span>
          <span className="min-w-0"><span className="block break-words text-base font-medium leading-6 text-stone-900 group-hover:underline">{guide.title || 'Untitled guide'}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{guide.stepsCount} {guide.stepsCount === 1 ? 'step' : 'steps'}<span className="mx-2">·</span>Created {new Date(guide.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
        </Link>
        <span className="hidden shrink-0 text-xs text-stone-600 sm:block">{guide.visibility === 'public' || guide.visibility === 'link_only' ? 'Shared' : guide.status === 'processing' ? 'Processing' : guide.status === 'error' ? 'Needs attention' : 'Draft'}</span>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Actions for ${guide.title || 'Untitled guide'}`}><MoreHorizontal className="h-5 w-5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/editor/${guide.id}`} prefetch={false}><Pencil className="mr-2 h-4 w-4"/>Edit guide</Link></DropdownMenuItem><DropdownMenuItem onSelect={() => setShare(guide)}><Share2 className="mr-2 h-4 w-4"/>Share or export PDF</DropdownMenuItem><DropdownMenuItem onSelect={() => { setDeleteError(''); setDeleting(guide); }} className="text-red-700"><Trash2 className="mr-2 h-4 w-4"/>Delete guide</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </li>)}</ul>
      <nav aria-label="Guide pages" className="mt-6 flex items-center justify-between border-t border-stone-200 pt-5"><p className="text-sm text-stone-600">Page {page} of {totalPages}<span className="hidden sm:inline"> · {data.total} {data.total === 1 ? 'guide' : 'guides'}</span></p><div className="flex gap-2"><Button variant="outline" className="h-11 bg-transparent" disabled={page <= 1 || isFetching} onClick={() => setPage(p => p-1)}><ChevronLeft className="mr-1 h-4 w-4"/>Previous</Button><Button variant="outline" className="h-11 bg-transparent" disabled={page >= totalPages || isFetching} onClick={() => setPage(p => p+1)}>Next<ChevronRight className="ml-1 h-4 w-4"/></Button></div></nav>
    </> : <div className="py-16 text-center"><h2 className="text-xl font-medium">{query ? 'No matching guides' : tab !== 'all' ? 'No guides in this view' : 'Your first guide starts with a recording.'}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">{query ? 'Try another title or clear the search.' : tab !== 'all' ? 'Choose All guides to return to your library.' : 'Download Captuto for Mac, connect your account and record your workflow. Your captures will appear here.'}</p>{(query || tab !== 'all') && <Button variant="outline" className="mt-5" onClick={() => { setSearch(''); setQuery(''); setTab('all'); setPage(1); }}>Show all guides</Button>}</div>}
    {share && <ShareDialog open onOpenChange={open => { if (!open) { setShare(null); cache.invalidateQueries({ queryKey: ['dashboard'] }); } }} tutorialId={share.id} tutorialTitle={share.title} tutorialSlug={share.slug}/>}
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !deleteBusy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete this guide?</DialogTitle><DialogDescription>“{deleting?.title}” and its steps will be deleted. This cannot be undone.</DialogDescription></DialogHeader>{deleteError && <p role="alert" className="text-sm text-red-700">{deleteError}</p>}<DialogFooter><Button variant="outline" disabled={deleteBusy} onClick={() => setDeleting(null)}>Keep guide</Button><Button variant="destructive" disabled={deleteBusy} onClick={removeGuide}>{deleteBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Delete guide</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
