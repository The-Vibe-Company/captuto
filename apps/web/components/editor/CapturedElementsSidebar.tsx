'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Image as ImageIcon, MousePointer2, Plus, Copy, Check } from 'lucide-react';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { cn } from '@/lib/utils';

interface CapturedElementsSidebarProps {
  steps: StepWithSignedUrl[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onCreateStepWithImage?: (sourceStep: StepWithSignedUrl) => void;
}

interface ElementInfo {
  tag?: string;
  text?: string;
  id?: string;
  className?: string;
}

export function CapturedElementsSidebar({
  steps,
  selectedStepId,
  onSelectStep,
  onCreateStepWithImage,
}: CapturedElementsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter to only show steps with screenshots
  const stepsWithScreenshots = steps.filter((step) => step.signedScreenshotUrl);

  if (stepsWithScreenshots.length === 0) {
    return null;
  }

  const handleCopyImage = async (step: StepWithSignedUrl, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!step.signedScreenshotUrl) return;

    try {
      await navigator.clipboard.writeText(step.signedScreenshotUrl);
      setCopiedId(step.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateStep = (step: StepWithSignedUrl, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateStepWithImage) {
      onCreateStepWithImage(step);
    }
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
              <span className="text-sm font-medium text-slate-700">Images</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {stepsWithScreenshots.length}
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
              {stepsWithScreenshots.map((step, index) => {
                const elementInfo = step.element_info as ElementInfo | null;
                const isSelected = selectedStepId === step.id;
                const isCopied = copiedId === step.id;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'group relative rounded-lg border p-2 transition-all',
                      isSelected
                        ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    )}
                  >
                    {/* Thumbnail - clickable to navigate */}
                    <button
                      type="button"
                      onClick={() => onSelectStep(step.id)}
                      className="relative aspect-video w-full overflow-hidden rounded-md bg-slate-100"
                    >
                      <Image
                        src={step.signedScreenshotUrl!}
                        alt={`Step ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />

                      {/* Click indicator overlay */}
                      {step.click_x != null &&
                        step.click_y != null &&
                        step.viewport_width &&
                        step.viewport_height && (
                          <div
                            className="pointer-events-none absolute"
                            style={{
                              left: `${(step.click_x / step.viewport_width) * 100}%`,
                              top: `${(step.click_y / step.viewport_height) * 100}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <div className="h-3 w-3 rounded-full bg-violet-500 shadow-md ring-2 ring-white" />
                          </div>
                        )}

                      {/* Step number badge */}
                      <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white shadow">
                        {index + 1}
                      </div>
                    </button>

                    {/* Action buttons - appear on hover */}
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* Copy image URL */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyImage(step, e)}
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

                      {/* Create new step with this image */}
                      {onCreateStepWithImage && (
                        <button
                          type="button"
                          onClick={(e) => handleCreateStep(step, e)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-600 shadow-sm transition-colors hover:bg-violet-100 hover:text-violet-600"
                          title="Créer une nouvelle étape avec cette image"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
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

        {/* Collapsed state - just show thumbnails */}
        {isCollapsed && (
          <div className="p-1">
            <div className="flex flex-col gap-1">
              {stepsWithScreenshots.slice(0, 5).map((step, index) => {
                const isSelected = selectedStepId === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onSelectStep(step.id)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded text-xs font-semibold transition-colors',
                      isSelected
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                    title={`Étape ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
              {stepsWithScreenshots.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">
                  +{stepsWithScreenshots.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
