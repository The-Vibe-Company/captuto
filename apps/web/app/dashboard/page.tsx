'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, FileText, LayoutGrid, List, Loader2, MoreHorizontal, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchDashboardPage, type DashboardGuide, type DashboardSort, type DashboardTab } from '@/lib/dashboard/query';

const ShareDialog = dynamic(() => import('@/components/dashboard/ShareDialog').then(m => m.ShareDialog));
const tabs: { key: DashboardTab; label: string }[] = [{ key: 'all', label: 'All guides' }, { key: 'shared', label: 'Shared' }, { key: 'draft', label: 'Drafts' }, { key: 'processing', label: 'Processing' }];
const sortOptions: { key: DashboardSort; label: string }[] = [{ key: 'recent', label: 'Newest first' }, { key: 'oldest', label: 'Oldest first' }, { key: 'title', label: 'Title A–Z' }];
function guideStatus(guide: DashboardGuide): { label: string; dot: string } {
  if (guide.visibility === 'public' || guide.visibility === 'link_only') return { label: 'Shared', dot: 'bg-emerald-500' };
  if (guide.status === 'processing') return { label: 'Processing', dot: 'bg-amber-500' };
  if (guide.status === 'error') return { label: 'Needs attention', dot: 'bg-red-500' };
  return { label: 'Draft', dot: 'bg-stone-300' };
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cache = useQueryClient();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [share, setShare] = useState<DashboardGuide | null>(null);
  const [deleting, setDeleting] = useState<DashboardGuide | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const search = searchParams.get('search') || '';
  const tab = (searchParams.get('tab') as DashboardTab) || 'all';
  const sort = (searchParams.get('sort') as DashboardSort) || 'recent';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  function updateParams(next: { tab?: DashboardTab; sort?: DashboardSort; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab !== undefined) { if (next.tab === 'all') params.delete('tab'); else params.set('tab', next.tab); }
    if (next.sort !== undefined) { if (next.sort === 'recent') params.delete('sort'); else params.set('sort', next.sort); }
    if (next.page !== undefined) { if (next.page <= 1) params.delete('page'); else params.set('page', String(next.page)); }
    if (next.tab !== undefined || next.sort !== undefined) params.delete('page');
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  }

  const queryString = new URLSearchParams({ page: String(page), search, tab, sort }).toString();
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', search, tab, sort, page],
    queryFn: ({ signal }) => fetchDashboardPage(queryString, signal),
  });
  useEffect(() => { if (error?.message === 'UNAUTHORIZED') router.replace('/login'); }, [error, router]);
  useEffect(() => {
    if (data && page > 1 && data.tutorials.length === 0) updateParams({ page: Math.max(1, Math.ceil(data.total / data.pageSize)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function removeGuide() {
    if (!deleting) return;
    setDeleteBusy(true); setDeleteError('');
    try {
      const response = await fetch(`/api/tutorials/${deleting.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete this guide. It is still available; try again.');
      setDeleting(null);
      await cache.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) { setDeleteError(e instanceof Error ? e.message : 'Could not delete this guide.'); }
    finally { setDeleteBusy(false); }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const activeLabel = tabs.find(t => t.key === tab)?.label ?? 'All guides';

  return <div className="flex min-w-0 flex-1 flex-col">
    <header className="sticky top-0 z-10 flex h-11 flex-none items-center justify-between border-b border-stone-200 bg-[#fafaf9] px-5">
      <div className="flex items-center gap-2 text-[12.5px] text-stone-500">
        <span className="font-medium text-stone-900">{activeLabel}</span>
        <span>·</span>
        <span>{data ? `${data.total} ${data.total === 1 ? 'guide' : 'guides'}` : '—'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5 rounded-md bg-stone-100 p-0.5">
          <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`flex h-6 w-7 items-center justify-center rounded ${view === 'list' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}><List className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={`flex h-6 w-7 items-center justify-center rounded ${view === 'grid' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-7 gap-1.5 border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 hover:bg-stone-100">{sortOptions.find(o => o.key === sort)?.label}<ChevronDown className="h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{sortOptions.map(option => <DropdownMenuItem key={option.key} onSelect={() => updateParams({ sort: option.key })}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>
        <Button asChild className="h-7 gap-1.5 bg-brand-600 px-2.5 text-xs font-medium text-white hover:bg-brand-700">
          <Link href="/settings"><Plus className="h-3 w-3" />Connect your agent</Link>
        </Button>
      </div>
    </header>

    <div className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">Guides</h1>
        <div role="group" aria-label="Filter guides" className="flex gap-0.5 rounded-md bg-stone-100 p-0.5">
          {tabs.map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => updateParams({ tab: item.key })} className={`flex h-6 items-center gap-1.5 whitespace-nowrap rounded px-2.5 text-xs font-medium ${tab === item.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}>{item.label}<span className="text-[11px] font-normal opacity-55">{data?.counts[item.key] ?? 0}</span></button>)}
        </div>
      </div>

      {error && error.message !== 'UNAUTHORIZED' ? <div role="alert" className="py-12 text-center"><p className="text-red-700">{error.message}</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button></div> : isLoading ? <div role="status" aria-label="Loading guides" className="space-y-2 py-2">{[0,1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-200/60"/>)}</div> : data?.tutorials.length ? <>
        {view === 'list' ? (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            {data.tutorials.map(guide => { const meta = guideStatus(guide); return <div key={guide.id} className="group flex items-center gap-3.5 border-b border-stone-100 px-3.5 py-3 last:border-b-0 sm:gap-4">
              <Link href={`/editor/${guide.id}`} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:gap-4">
                <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-[4px] border border-stone-200 bg-stone-50 text-stone-400"><FileText className="h-4 w-4"/></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-stone-900 group-hover:underline">{guide.title || 'Untitled guide'}</span><span className="mt-0.5 block text-[11.5px] text-stone-500">{guide.stepsCount} {guide.stepsCount === 1 ? 'step' : 'steps'}</span></span>
                <span className="hidden shrink-0 items-center gap-1.5 text-xs text-stone-600 sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}/>{meta.label}</span>
                <span className="hidden shrink-0 text-xs text-stone-500 sm:block">{new Date(guide.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </Link>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-stone-400 hover:text-stone-900" aria-label={`Actions for ${guide.title || 'Untitled guide'}`}><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/editor/${guide.id}`} prefetch={false}><Pencil className="mr-2 h-4 w-4"/>Edit guide</Link></DropdownMenuItem><DropdownMenuItem onSelect={() => setShare(guide)}><Share2 className="mr-2 h-4 w-4"/>Share or export PDF</DropdownMenuItem><DropdownMenuItem onSelect={() => { setDeleteError(''); setDeleting(guide); }} className="text-red-700"><Trash2 className="mr-2 h-4 w-4"/>Delete guide</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>; })}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {data.tutorials.map(guide => { const meta = guideStatus(guide); return <Link key={guide.id} href={`/editor/${guide.id}`} prefetch={false} className="group overflow-hidden rounded-lg border border-stone-200 bg-white transition-colors hover:border-stone-300">
              <div className="flex aspect-[16/10] items-center justify-center border-b border-stone-100 bg-stone-50 text-stone-300" style={{ backgroundImage: 'repeating-linear-gradient(135deg, var(--stone-50) 0 6px, var(--stone-100) 6px 12px)' }}><FileText className="h-6 w-6"/></div>
              <div className="px-3 py-2.5">
                <div className="truncate text-[13px] font-medium text-stone-900">{guide.title || 'Untitled guide'}</div>
                <div className="mt-1 flex items-center justify-between text-[11.5px] text-stone-500"><span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}/>{meta.label}</span><span>{guide.stepsCount} steps</span></div>
              </div>
            </Link>; })}
          </div>
        )}
        <nav aria-label="Guide pages" className="mt-6 flex items-center justify-between border-t border-stone-200 pt-5"><p className="text-sm text-stone-600">Page {page} of {totalPages}<span className="hidden sm:inline"> · {data.total} {data.total === 1 ? 'guide' : 'guides'}</span></p><div className="flex gap-2"><Button variant="outline" className="h-9 bg-transparent" disabled={page <= 1 || isFetching} onClick={() => updateParams({ page: page - 1 })}><ChevronLeft className="mr-1 h-4 w-4"/>Previous</Button><Button variant="outline" className="h-9 bg-transparent" disabled={page >= totalPages || isFetching} onClick={() => updateParams({ page: page + 1 })}>Next<ChevronRight className="ml-1 h-4 w-4"/></Button></div></nav>
      </> : <div className="py-16 text-center"><h2 className="text-xl font-medium">{search ? 'No matching guides' : tab !== 'all' ? 'No guides in this view' : 'Your first guide starts with a recording.'}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">{search ? 'Try another title or clear the search.' : tab !== 'all' ? 'Choose All guides to return to your library.' : 'Download Captuto for Mac, connect your account and record your workflow. Your captures will appear here.'}</p>{(search || tab !== 'all') && <Button variant="outline" className="mt-5" onClick={() => router.replace(pathname)}>Show all guides</Button>}</div>}
    </div>
    {share && <ShareDialog open onOpenChange={open => { if (!open) { setShare(null); cache.invalidateQueries({ queryKey: ['dashboard'] }); } }} tutorialId={share.id} tutorialTitle={share.title} tutorialSlug={share.slug}/>}
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !deleteBusy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete this guide?</DialogTitle><DialogDescription>&ldquo;{deleting?.title}&rdquo; and its steps will be deleted. This cannot be undone.</DialogDescription></DialogHeader>{deleteError && <p role="alert" className="text-sm text-red-700">{deleteError}</p>}<DialogFooter><Button variant="outline" disabled={deleteBusy} onClick={() => setDeleting(null)}>Keep guide</Button><Button variant="destructive" disabled={deleteBusy} onClick={removeGuide}>{deleteBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Delete guide</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
