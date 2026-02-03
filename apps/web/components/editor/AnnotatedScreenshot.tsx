'use client';

import { useRef, useState, useCallback } from 'react';
import { AnnotationToolbar } from './AnnotationToolbar';
import { AnnotationCanvas } from './AnnotationCanvas';
import type { Annotation, AnnotationType } from '@/lib/types/editor';

interface AnnotatedScreenshotProps {
  screenshotUrl: string | null;
  stepNumber: number;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  // Click indicator from recording
  clickX?: number | null;
  clickY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
}

export function AnnotatedScreenshot({
  screenshotUrl,
  stepNumber,
  annotations,
  onAnnotationsChange,
  clickX,
  clickY,
  viewportWidth,
  viewportHeight,
}: AnnotatedScreenshotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
  const [history, setHistory] = useState<Annotation[][]>([]);

  const handleAddAnnotation = useCallback(
    (annotation: Annotation) => {
      // Save current state to history for undo
      setHistory((prev) => [...prev, annotations]);
      onAnnotationsChange([...annotations, annotation]);
    },
    [annotations, onAnnotationsChange]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    onAnnotationsChange(previousState);
  }, [history, onAnnotationsChange]);

  const handleClear = useCallback(() => {
    if (annotations.length === 0) return;

    // Save current state to history
    setHistory((prev) => [...prev, annotations]);
    onAnnotationsChange([]);
  }, [annotations, onAnnotationsChange]);

  if (!screenshotUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-stone-100">
        <p className="text-stone-400">Aucune capture d'écran</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex justify-center">
        <AnnotationToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onUndo={handleUndo}
          onClear={handleClear}
          canUndo={history.length > 0}
          hasAnnotations={annotations.length > 0}
        />
      </div>

      {/* Screenshot with annotations */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border bg-stone-100"
      >
        {/* Screenshot image */}
        <img
          src={screenshotUrl}
          alt={`Capture d'écran de l'étape ${stepNumber}`}
          className="w-full"
          draggable={false}
        />

        {/* Original click position indicator */}
        {clickX != null && clickY != null && viewportWidth && viewportHeight && (
          <div
            className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-blue-500 bg-blue-500/20"
            style={{
              left: `${(clickX / viewportWidth) * 100}%`,
              top: `${(clickY / viewportHeight) * 100}%`,
            }}
          />
        )}

        {/* Annotation canvas overlay */}
        <AnnotationCanvas
          annotations={annotations}
          activeTool={activeTool}
          onAddAnnotation={handleAddAnnotation}
          containerRef={containerRef}
        />
      </div>

      {/* Helper text */}
      {activeTool && (
        <p className="text-center text-xs text-stone-500">
          {activeTool === 'text'
            ? 'Cliquez pour ajouter du texte'
            : 'Cliquez et glissez pour dessiner'}
        </p>
      )}
    </div>
  );
}
