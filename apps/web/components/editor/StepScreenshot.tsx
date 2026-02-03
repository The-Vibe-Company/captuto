'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { MousePointer2, ZoomIn, ZoomOut, Pencil } from 'lucide-react';
import { AnnotationCanvas } from './AnnotationCanvas';
import { AnnotationToolbar } from './AnnotationToolbar';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
import { cn } from '@/lib/utils';

interface StepScreenshotProps {
  src: string;
  alt: string;
  clickX?: number | null;
  clickY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
}

const ZOOM_LEVELS = [1, 1.5, 2];

export function StepScreenshot({
  src,
  alt,
  clickX,
  clickY,
  viewportWidth,
  viewportHeight,
  annotations,
  onAnnotationsChange,
}: StepScreenshotProps) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  const handleZoomIn = useCallback(() => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleAddAnnotation = useCallback(
    (annotation: Annotation) => {
      onAnnotationsChange([...annotations, annotation]);
    },
    [annotations, onAnnotationsChange]
  );

  const handleClearAnnotations = useCallback(() => {
    if (confirm('Supprimer toutes les annotations ?')) {
      onAnnotationsChange([]);
    }
  }, [onAnnotationsChange]);

  const handleDone = useCallback(() => {
    setIsAnnotating(false);
    setActiveTool(null);
  }, []);

  // Calculate cursor position as percentage
  const cursorLeft =
    clickX != null && viewportWidth
      ? (clickX / viewportWidth) * 100
      : null;
  const cursorTop =
    clickY != null && viewportHeight
      ? (clickY / viewportHeight) * 100
      : null;

  return (
    <div className="relative">
      {/* Annotation toolbar (shown when annotating) */}
      {isAnnotating && (
        <div className="absolute -top-14 left-1/2 z-20 -translate-x-1/2">
          <AnnotationToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onClearAll={handleClearAnnotations}
            onDone={handleDone}
            hasAnnotations={annotations.length > 0}
          />
        </div>
      )}

      {/* Screenshot container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border bg-slate-100 transition-all',
          isAnnotating ? 'border-violet-400 ring-2 ring-violet-200' : 'border-slate-200'
        )}
      >
        {/* Scrollable zoom container */}
        <div
          className="overflow-auto"
          style={{ maxHeight: zoom > 1 ? '500px' : 'none' }}
        >
          <div
            ref={containerRef}
            className="relative transition-transform duration-200"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: zoom > 1 ? `${100 / zoom}%` : '100%',
            }}
          >
            {/* Image */}
            <div className="relative aspect-video w-full">
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
                priority
              />

              {/* Cursor indicator */}
              {cursorLeft !== null && cursorTop !== null && (
                <div
                  className="pointer-events-none absolute z-10"
                  style={{
                    left: `${cursorLeft}%`,
                    top: `${cursorTop}%`,
                    transform: 'translate(-4px, -4px)',
                  }}
                >
                  <MousePointer2
                    className="h-7 w-7 drop-shadow-lg"
                    fill="#8b5cf6"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                </div>
              )}

              {/* Annotation canvas (always visible, editable when annotating) */}
              <AnnotationCanvas
                annotations={annotations}
                activeTool={isAnnotating ? activeTool : null}
                onAddAnnotation={handleAddAnnotation}
                containerRef={containerRef}
              />
            </div>
          </div>
        </div>

        {/* Controls overlay (bottom-right) */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
          {/* Annotate button (only when not annotating) */}
          {!isAnnotating && (
            <button
              type="button"
              onClick={() => setIsAnnotating(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 text-sm text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-violet-600"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Annoter</span>
            </button>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded transition-colors',
                zoomIndex === 0
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <span className="min-w-[3rem] text-center text-xs font-medium text-slate-600">
              {zoom}x
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded transition-colors',
                zoomIndex === ZOOM_LEVELS.length - 1
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
