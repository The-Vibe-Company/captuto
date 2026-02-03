'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Pencil, X, Circle, ArrowRight, Type, Highlighter, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ZoomableScreenshot } from './ZoomableScreenshot';
import { InlineCaption } from './InlineCaption';
import type { StepWithSignedUrl, Annotation, AnnotationType } from '@/lib/types/editor';
import { cn } from '@/lib/utils';

interface WYSIWYGStepCardProps {
  step: StepWithSignedUrl;
  stepNumber: number;
  isSelected: boolean;
  onSelect: () => void;
  onCaptionChange: (caption: string) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onDelete: () => void;
}

const ANNOTATION_TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'circle', icon: Circle, label: 'Cercle' },
  { type: 'arrow', icon: ArrowRight, label: 'Flèche' },
  { type: 'text', icon: Type, label: 'Texte' },
  { type: 'highlight', icon: Highlighter, label: 'Surligner' },
  { type: 'blur', icon: EyeOff, label: 'Flouter' },
];

export function WYSIWYGStepCard({
  step,
  stepNumber,
  isSelected,
  onSelect,
  onCaptionChange,
  onAnnotationsChange,
  onDelete,
}: WYSIWYGStepCardProps) {
  const [annotationMode, setAnnotationMode] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);

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

  const annotations = (step.annotations as Annotation[]) || [];

  const handleToggleAnnotationMode = () => {
    if (annotationMode) {
      // Exiting annotation mode
      setAnnotationMode(false);
      setActiveTool(null);
    } else {
      // Entering annotation mode
      setAnnotationMode(true);
    }
  };

  const handleToolSelect = (tool: AnnotationType) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  const handleClearAnnotations = () => {
    if (confirm('Supprimer toutes les annotations ?')) {
      onAnnotationsChange([]);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-xl border bg-white shadow-sm transition-all',
        isSelected
          ? 'border-violet-400 ring-2 ring-violet-100'
          : 'border-stone-200 hover:border-stone-300 hover:shadow-md',
        isDragging && 'opacity-50 shadow-xl z-50'
      )}
      onClick={onSelect}
    >
      {/* Header with step number and controls */}
      <div className="flex items-start gap-3 p-4 pb-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-1.5 cursor-grab rounded p-1 opacity-0 transition-opacity hover:bg-stone-100 group-hover:opacity-100 active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-stone-400" />
        </div>

        {/* Step number badge (violet like GuideJar) */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-md">
          {stepNumber}
        </div>

        {/* Caption */}
        <div className="flex-1 pt-1" onClick={(e) => e.stopPropagation()}>
          <InlineCaption
            content={step.text_content || ''}
            onChange={onCaptionChange}
            placeholder="Cliquez pour ajouter une description..."
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              annotationMode && 'bg-violet-100 text-violet-700'
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleAnnotationMode();
            }}
            title={annotationMode ? 'Quitter le mode annotation' : 'Annoter'}
          >
            {annotationMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Supprimer cette étape ?')) {
                onDelete();
              }
            }}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Annotation toolbar (when in annotation mode) */}
      {annotationMode && (
        <div className="mx-4 mb-2 flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
          {ANNOTATION_TOOLS.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5 px-2',
                activeTool === type && 'bg-violet-100 text-violet-700'
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleToolSelect(type);
              }}
              title={label}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
          <div className="mx-1 h-6 w-px bg-stone-200" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              handleClearAnnotations();
            }}
            disabled={annotations.length === 0}
            title="Tout effacer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Screenshot */}
      <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <ZoomableScreenshot
          url={step.signedScreenshotUrl}
          stepNumber={stepNumber}
          clickX={step.click_x}
          clickY={step.click_y}
          viewportWidth={step.viewport_width}
          viewportHeight={step.viewport_height}
          annotations={annotations}
          onAnnotationsChange={onAnnotationsChange}
          editMode={annotationMode}
          activeTool={activeTool}
        />
      </div>

      {/* URL display (subtle) */}
      {step.url && (
        <div className="border-t border-stone-100 px-4 py-2">
          <p className="truncate text-xs text-stone-400">{step.url}</p>
        </div>
      )}
    </div>
  );
}
