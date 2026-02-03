'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { cn } from '@/lib/utils';

interface StoryboardCardProps {
  step: StepWithSignedUrl;
  stepNumber: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function StoryboardCard({
  step,
  stepNumber,
  isSelected,
  onSelect,
  onDelete,
}: StoryboardCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative cursor-pointer rounded-lg border-2 bg-white transition-all',
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-200 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 z-10 cursor-grab rounded p-0.5 opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100 active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5 text-gray-400" />
      </div>

      {/* Delete button */}
      <button
        type="button"
        className="absolute right-1 top-1 z-10 rounded p-0.5 opacity-0 transition-all hover:bg-red-100 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Supprimer cette étape"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </button>

      {/* Step number badge */}
      <div
        className={cn(
          'absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
          isSelected
            ? 'bg-amber-400 text-amber-900'
            : 'bg-gray-200 text-gray-600'
        )}
      >
        {stepNumber}
      </div>

      {/* Thumbnail */}
      <div className="aspect-video overflow-hidden rounded-md bg-gray-100">
        {step.signedScreenshotUrl ? (
          <img
            src={step.signedScreenshotUrl}
            alt={`Étape ${stepNumber}`}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-gray-400">Pas d'image</span>
          </div>
        )}
      </div>

      {/* Optional: Text preview */}
      {step.text_content && (
        <div className="px-1.5 py-1">
          <p className="line-clamp-2 text-[10px] text-gray-500">
            {step.text_content}
          </p>
        </div>
      )}
    </div>
  );
}
