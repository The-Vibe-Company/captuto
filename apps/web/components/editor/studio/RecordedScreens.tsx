'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Images, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SourceWithSignedUrl, StepWithSignedUrl } from '@/lib/types/editor';

interface RecordedScreensProps {
  sources: SourceWithSignedUrl[];
  steps: StepWithSignedUrl[];
  onAdd: (source: SourceWithSignedUrl) => Promise<void>;
}

export function RecordedScreens({ sources, steps, onAdd }: RecordedScreensProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<SourceWithSignedUrl | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const addingRef = useRef(false);
  const ordered = [...sources].sort((a, b) => a.order_index - b.order_index);
  const used = new Set(steps.map(step => step.source_id));
  const available = ordered.filter(source => !used.has(source.id) && source.signedScreenshotUrl);
  const chosen = available.filter(source => selected.has(source.id));

  async function add(screens: SourceWithSignedUrl[]) {
    if (addingRef.current || !screens.length) return;
    addingRef.current = true;
    setAdding(true);
    setError(null);
    setNotice('');
    let count = 0;
    try {
      // Sequential requests preserve recording order and the API's append index.
      for (const source of screens) {
        await onAdd(source);
        count++;
        setSelected(current => {
          const next = new Set(current);
          next.delete(source.id);
          return next;
        });
      }
      setOpen(false);
    } catch {
      setError('Could not add the next screen. Screens already added are saved; retry to continue.');
    } finally {
      setNotice(`${count} screen${count === 1 ? '' : 's'} added to the timeline.`);
      addingRef.current = false;
      setAdding(false);
    }
  }

  return (
    <>
      <div className="flex flex-none flex-wrap items-center gap-3 border-b bg-background px-4 py-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Images className="mr-2 h-4 w-4" />Recorded screens
          <Badge variant="secondary" className="ml-2">{sources.length}</Badge>
        </Button>
        <p className="text-xs text-muted-foreground">
          {steps.length === 0 && sources.length > 0
            ? 'Choose your screens to start building the timeline.'
            : `${ordered.filter(source => used.has(source.id)).length} of ${sources.length} screens in the timeline`}
        </p>
        <span role="status" className="text-xs text-muted-foreground">{notice}</span>
      </div>
      <Dialog open={open} onOpenChange={value => { if (!addingRef.current) setOpen(value); }}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b p-6 pr-12">
            <DialogTitle>Recorded screens</DialogTitle>
            <DialogDescription>Preview your captures, then choose which screens to add. Originals stay here for later.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {ordered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No recorded screens yet. Record a tutorial to see your captures here.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ordered.map((source, index) => {
                  const inTimeline = used.has(source.id);
                  return (
                    <div key={source.id} className="overflow-hidden rounded-lg border bg-card">
                      <Button variant="ghost" className="relative aspect-video h-auto w-full overflow-hidden rounded-none bg-muted p-0" onClick={() => setPreview(source)} aria-label={`Preview screen ${index + 1}`} disabled={!source.signedScreenshotUrl}>
                        {source.signedScreenshotUrl ? (
                          <Image src={source.signedScreenshotUrl} alt={`Recorded screen ${index + 1}`} fill sizes="(max-width: 640px) 90vw, 320px" className="object-contain" />
                        ) : <span className="text-sm text-muted-foreground">Image unavailable</span>}
                      </Button>
                      <div className="space-y-3 p-3">
                        <p className="truncate text-sm font-medium" title={source.auto_caption || undefined}>{String(index + 1).padStart(2, '0')} · {source.auto_caption || source.app_name || 'Recorded screen'}</p>
                        <Button variant={selected.has(source.id) ? 'default' : 'outline'} size="sm" className="w-full" disabled={adding || inTimeline || !source.signedScreenshotUrl} aria-pressed={selected.has(source.id)} aria-label={inTimeline ? `Screen ${index + 1} in timeline` : `Select screen ${index + 1}`} onClick={() => setSelected(current => {
                          const next = new Set(current);
                          if (next.has(source.id)) next.delete(source.id); else next.add(source.id);
                          return next;
                        })}>
                          {(inTimeline || selected.has(source.id)) && <Check className="mr-2 h-4 w-4" />}
                          {inTimeline ? 'In timeline' : selected.has(source.id) ? 'Selected' : 'Select screen'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-3 border-t bg-background p-4">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">{chosen.length} selected · {available.length} available</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={adding || !available.length} onClick={() => void add(available)}>Add all screens</Button>
                <Button disabled={adding || !chosen.length} onClick={() => void add(chosen)}>
                  {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {adding ? 'Adding screens…' : `Add to timeline (${chosen.length})`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!preview} onOpenChange={value => { if (!value) setPreview(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-6xl">
          <DialogHeader>
            <DialogTitle>Screen preview</DialogTitle>
            <DialogDescription>{preview?.auto_caption || 'Review the full capture before adding it to your timeline.'}</DialogDescription>
          </DialogHeader>
          {preview?.signedScreenshotUrl && <div className="relative h-[65dvh] bg-muted"><Image src={preview.signedScreenshotUrl} alt={preview.auto_caption || 'Recorded screen preview'} fill sizes="90vw" className="object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
