'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Icon, ICON } from './icons';
import { ShareDialog } from '@/components/dashboard/ShareDialog';
import type { SaveStatus } from '../EditorClient';
import type { Tutorial } from '@/lib/types/editor';

export type StudioMode = 'edit' | 'preview' | 'reader';

interface StudioTopBarProps {
  tutorial: Tutorial;
  saveStatus: SaveStatus;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  onTitleChange: (title: string) => void;
  onGenerateClick?: () => void;
  isGenerating?: boolean;
  hasSourcesForGeneration?: boolean;
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Auto-saved',
  saving: 'Saving…',
  unsaved: 'Unsaved',
  error: 'Save error',
};

export function StudioTopBar({
  tutorial,
  saveStatus,
  mode,
  onModeChange,
  onTitleChange,
  onGenerateClick,
  isGenerating,
  hasSourcesForGeneration,
}: StudioTopBarProps) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <header className="flex flex-none flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 text-foreground">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="shrink-0"><a href="/dashboard" aria-label="Back to dashboard"><Icon d={ICON.back} size={16} /></a></Button>
        <TitleField value={tutorial.title || ''} onCommit={value => { if (value && value !== tutorial.title) onTitleChange(value); }} />
        <span role="status" className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          {saveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}{SAVE_LABEL[saveStatus]}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Editor view" className="flex rounded-md bg-muted p-1">
          {(['edit', 'preview', 'reader'] as const).map(value => <Button key={value} variant={mode === value ? 'secondary' : 'ghost'} size="sm" aria-pressed={mode === value} onClick={() => onModeChange(value)} className="capitalize">{value}</Button>)}
        </div>
        {hasSourcesForGeneration && onGenerateClick && <Button variant="outline" size="sm" onClick={onGenerateClick} disabled={isGenerating || saveStatus !== 'saved'} title={saveStatus !== 'saved' ? 'Save your changes before generating' : undefined}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon d={ICON.sparkle} size={14} />}<span className="ml-1">AI generation</span>
        </Button>}
        <Button size="sm" onClick={() => setShareOpen(true)} disabled={saveStatus !== 'saved'}>Share / Export</Button>
      </div>
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} tutorialId={tutorial.id} tutorialTitle={tutorial.title || 'Untitled'} tutorialSlug={tutorial.slug || null} />
    </header>
  );
}

function TitleField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(value);
  }, [value]);

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.boxShadow = 'none';
        onCommit(draft.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        else if (e.key === 'Escape') setDraft(value);
      }}
      className="w-full min-w-0 max-w-sm"
      aria-label="Guide title"
      placeholder="Untitled guide"
      style={{
        fontSize: 12.5,
        fontWeight: 500,
        color: 'var(--studio-ink)',
        background: 'transparent',
        border: 0,
        outline: 'none',
        padding: '4px 6px',
        borderRadius: 4,
        minWidth: 0,
        fontFamily: 'inherit',
      }}
      onFocus={(e) => {
        e.currentTarget.style.background = 'var(--studio-surface)';
        e.currentTarget.style.boxShadow = '0 0 0 1px var(--studio-line-strong)';
      }}
      onMouseEnter={(e) => {
        if (document.activeElement !== e.currentTarget) e.currentTarget.style.background = 'var(--studio-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) e.currentTarget.style.background = 'transparent';
      }}
    />
  );
}
