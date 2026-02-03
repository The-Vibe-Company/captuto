'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, FileText, Heading, Minus } from 'lucide-react';
import type { StepWithSignedUrl, Annotation } from '@/lib/types/editor';
import { InlineCaption } from './InlineCaption';
import { StepScreenshot } from './StepScreenshot';
import { cn } from '@/lib/utils';

interface DocStepCardProps {
  step: StepWithSignedUrl;
  stepNumber: number;
  onCaptionChange: (caption: string) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onDelete: () => void;
}

export function DocStepCard({
  step,
  stepNumber,
  onCaptionChange,
  onAnnotationsChange,
  onDelete,
}: DocStepCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const annotations = step.annotations || [];

  // Handler to update a single annotation
  const handleUpdateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      const updatedAnnotations = annotations.map((ann) =>
        ann.id === id ? { ...ann, ...updates } : ann
      );
      onAnnotationsChange(updatedAnnotations);
    },
    [annotations, onAnnotationsChange]
  );

  // Handler to delete a single annotation
  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      const updatedAnnotations = annotations.filter((ann) => ann.id !== id);
      onAnnotationsChange(updatedAnnotations);
    },
    [annotations, onAnnotationsChange]
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasScreenshot = !!step.signedScreenshotUrl;
  const isHeading = step.click_type === 'heading';
  const isDivider = step.click_type === 'divider';

  // Divider step
  if (isDivider) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group relative py-4',
          isDragging && 'z-50 opacity-50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-4">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'cursor-grab touch-none text-slate-300 transition-opacity hover:text-slate-400',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Divider line */}
          <div className="flex flex-1 items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <Minus className="h-4 w-4 text-slate-300" />
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              'text-slate-300 transition-all hover:text-red-500',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Heading step
  if (isHeading) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group relative py-2',
          isDragging && 'z-50 opacity-50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start gap-4">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'mt-2 cursor-grab touch-none text-slate-300 transition-opacity hover:text-slate-400',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="mt-1.5 flex h-6 w-6 items-center justify-center rounded bg-violet-100">
            <Heading className="h-3.5 w-3.5 text-violet-600" />
          </div>

          {/* Editable heading */}
          <div className="min-w-0 flex-1">
            <InlineCaption
              content={step.text_content || ''}
              onChange={onCaptionChange}
              placeholder="Titre de section..."
              isHeading
            />
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              'mt-2 text-slate-300 transition-all hover:text-red-500',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Regular step (with or without screenshot)
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'z-50 opacity-50 shadow-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header: badge + caption + actions */}
      <div className="flex items-start gap-3 p-4 pb-0">
        {/* Drag handle + badge */}
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'cursor-grab touch-none text-slate-300 transition-opacity hover:text-slate-400',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-semibold text-white shadow-sm">
            {stepNumber}
          </div>
        </div>

        {/* Caption */}
        <div className="min-w-0 flex-1 pt-1">
          <InlineCaption
            content={step.text_content || ''}
            onChange={onCaptionChange}
            placeholder={
              hasScreenshot
                ? 'Cliquez sur "..."'
                : 'Décrivez cette étape...'
            }
          />
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          className={cn(
            'mt-1 text-slate-300 transition-all hover:text-red-500',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Screenshot (if exists) */}
      {hasScreenshot ? (
        <div className="p-4 pt-3">
          <StepScreenshot
            src={step.signedScreenshotUrl!}
            alt={`Step ${stepNumber} screenshot`}
            clickX={step.click_x}
            clickY={step.click_y}
            viewportWidth={step.viewport_width}
            viewportHeight={step.viewport_height}
            annotations={annotations}
            onAnnotationsChange={onAnnotationsChange}
            onUpdateAnnotation={handleUpdateAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
          />
        </div>
      ) : (
        /* Text-only step indicator */
        <div className="flex items-center gap-2 px-4 pb-4 pt-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-400">Étape texte uniquement</span>
        </div>
      )}
    </div>
  );
}
