'use client';

import { useEffect, useRef, useState } from 'react';
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

const SAVE_DOT_COLOR: Record<SaveStatus, string> = {
  saved: '#10b981',
  saving: 'var(--stone-400)',
  unsaved: '#f59e0b',
  error: '#ef4444',
};
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
    <header
      style={{
        flex: 'none',
        height: 44,
        padding: '0 12px 0 10px',
        background: 'var(--studio-bg)',
        color: 'var(--studio-ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid #ebe9e6',
      }}
    >
      {/* Left cluster: back + logo + breadcrumb + title */}
      <div className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
        <a
          href="/dashboard"
          aria-label="Back to dashboard"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--studio-muted)',
            flex: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--studio-surface-2)';
            e.currentTarget.style.color = 'var(--studio-ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--studio-muted)';
          }}
        >
          <Icon d={ICON.back} size={14} />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/captuto-mark.svg"
          alt=""
          style={{ width: 20, height: 20, borderRadius: 5, flex: 'none' }}
        />
        <span style={{ color: 'var(--stone-300)', padding: '0 4px' }}>/</span>
        <span
          style={{
            fontSize: 12.5,
            color: 'var(--studio-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          Guides
        </span>
        <span style={{ color: 'var(--stone-300)', padding: '0 4px' }}>/</span>
        <TitleField
          value={tutorial.title || ''}
          onCommit={(v) => v && v !== tutorial.title && onTitleChange(v)}
        />
        <span
          className="inline-flex items-center"
          style={{ gap: 5, fontSize: 11.5, color: 'var(--stone-400)', whiteSpace: 'nowrap' }}
        >
          {saveStatus === 'saving' ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: SAVE_DOT_COLOR[saveStatus],
              }}
            />
          )}
          {SAVE_LABEL[saveStatus]}
        </span>
      </div>

      {/* Center: mode segmented */}
      <div
        style={{
          display: 'flex',
          background: 'var(--studio-surface-2)',
          borderRadius: 6,
          padding: 2,
          flex: 'none',
        }}
      >
        {(['edit', 'preview', 'reader'] as const).map((k) => {
          const on = mode === k;
          return (
            <button
              key={k}
              onClick={() => onModeChange(k)}
              style={{
                height: 24,
                padding: '0 12px',
                border: 0,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: on ? 'var(--studio-surface)' : 'transparent',
                color: on ? 'var(--studio-ink)' : 'var(--studio-muted)',
                boxShadow: on ? 'var(--studio-shadow-1)' : 'none',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* Right cluster: AI clean-up + Publish */}
      <div className="flex items-center" style={{ gap: 6, flex: 'none' }}>
        {hasSourcesForGeneration && onGenerateClick && (
          <button
            onClick={onGenerateClick}
            disabled={isGenerating}
            style={{
              height: 28,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid var(--studio-line-strong)',
              background: 'var(--studio-surface)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--studio-ink-2)',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!isGenerating) e.currentTarget.style.background = 'var(--studio-surface-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--studio-surface)';
            }}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon d={ICON.sparkle} size={12} />
            )}
            <span>AI clean-up</span>
          </button>
        )}
        <button
          onClick={() => setShareOpen(true)}
          style={{
            height: 28,
            padding: '0 10px',
            borderRadius: 6,
            border: '1px solid var(--studio-accent)',
            background: 'var(--studio-accent)',
            fontSize: 12,
            fontWeight: 500,
            color: '#fff',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--brand-700)';
            e.currentTarget.style.borderColor = 'var(--brand-700)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--studio-accent)';
            e.currentTarget.style.borderColor = 'var(--studio-accent)';
          }}
        >
          Publish
        </button>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tutorialId={tutorial.id}
        tutorialTitle={tutorial.title || 'Untitled'}
        tutorialSlug={tutorial.slug || null}
      />
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
        minWidth: 120,
        width: 260,
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
