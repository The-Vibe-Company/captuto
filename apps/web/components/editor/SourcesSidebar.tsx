'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Image as ImageIcon, MousePointer2, Plus, Copy, Check } from 'lucide-react';
import type { SourceWithSignedUrl } from '@/lib/types/editor';
import { cn } from '@/lib/utils';

interface SourcesSidebarProps {
  sources: SourceWithSignedUrl[];
  onCreateStepFromSource: (source: SourceWithSignedUrl) => void;
}

interface ElementInfo {
  tag?: string;
  text?: string;
  id?: string;
  className?: string;
}

export function SourcesSidebar({
  sources,
  onCreateStepFromSource,
}: SourcesSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Only show sources that have screenshots
  const sourcesWithScreenshots = sources.filter((source) => source.signedScreenshotUrl);

  if (sourcesWithScreenshots.length === 0) {
    return null;
  }

  const handleCopyImage = async (source: SourceWithSignedUrl, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!source.signedScreenshotUrl) return;

    try {
      await navigator.clipboard.writeText(source.signedScreenshotUrl);
      setCopiedId(source.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateStep = (source: SourceWithSignedUrl, e: React.MouseEvent) => {
    e.stopPropagation();
    onCreateStepFromSource(source);
  };

  return (
    <aside
      className={cn(
        'sticky top-4 flex-shrink-0 transition-all duration-200',
        isCollapsed ? 'w-10' : 'w-60'
      )}
    >
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Sources</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {sourcesWithScreenshots.length}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={isCollapsed ? 'Développer' : 'Réduire'}
          >
            {isCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Content */}
        {!isCollapsed && (
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
            <div className="space-y-2">
              {sourcesWithScreenshots.map((source, index) => {
                const elementInfo = source.element_info as ElementInfo | null;
                const isCopied = copiedId === source.id;

                return (
                  <div
                    key={source.id}
                    className="group relative rounded-lg border border-slate-200 bg-slate-50 p-2 transition-all hover:border-slate-300 hover:bg-white"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-slate-100">
                      <Image
                        src={source.signedScreenshotUrl!}
                        alt={`Source ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />

                      {/* Click indicator overlay */}
                      {source.click_x != null &&
                        source.click_y != null &&
                        source.viewport_width &&
                        source.viewport_height && (
                          <div
                            className="pointer-events-none absolute"
                            style={{
                              left: `${(source.click_x / source.viewport_width) * 100}%`,
                              top: `${(source.click_y / source.viewport_height) * 100}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <div className="h-3 w-3 rounded-full bg-violet-500 shadow-md ring-2 ring-white" />
                          </div>
                        )}

                      {/* Source number badge */}
                      <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-xs font-semibold text-white shadow">
                        {index + 1}
                      </div>
                    </div>

                    {/* Action buttons - appear on hover */}
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* Copy image URL */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyImage(source, e)}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md shadow-sm transition-colors',
                          isCopied
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        )}
                        title={isCopied ? 'Copié !' : 'Copier l\'URL'}
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Create new step with this source */}
                      <button
                        type="button"
                        onClick={(e) => handleCreateStep(source, e)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500 text-white shadow-sm transition-colors hover:bg-violet-600"
                        title="Ajouter au tutoriel"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Element info */}
                    {elementInfo && (elementInfo.tag || elementInfo.text) && (
                      <div className="mt-1.5 space-y-0.5">
                        {elementInfo.tag && (
                          <div className="flex items-center gap-1">
                            <MousePointer2 className="h-3 w-3 text-slate-400" />
                            <span className="text-xs font-mono text-slate-500">
                              {elementInfo.tag.toLowerCase()}
                            </span>
                          </div>
                        )}
                        {elementInfo.text && (
                          <p className="truncate text-xs text-slate-600">
                            {elementInfo.text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsed state - just show count */}
        {isCollapsed && (
          <div className="p-1">
            <div className="flex flex-col gap-1">
              {sourcesWithScreenshots.slice(0, 5).map((source, index) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={(e) => handleCreateStep(source, e)}
                  className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-600 transition-colors hover:bg-violet-100 hover:text-violet-600"
                  title={`Ajouter source ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
              {sourcesWithScreenshots.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">
                  +{sourcesWithScreenshots.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
