'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CursorIndicator } from './CursorIndicator';
import type { Annotation, AnnotationType } from '@/lib/types/editor';

// Annotation colors (reuse from AnnotationCanvas)
const ANNOTATION_COLOR = '#e63946';
const HIGHLIGHT_COLOR = 'rgba(244, 211, 94, 0.4)';

interface ZoomableScreenshotProps {
  url: string | null;
  stepNumber: number;
  clickX?: number | null;
  clickY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  annotations: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  editMode?: boolean;
  activeTool?: AnnotationType | null;
}

const ZOOM_LEVELS = [1, 1.25, 1.5, 2];

export function ZoomableScreenshot({
  url,
  stepNumber,
  clickX,
  clickY,
  viewportWidth,
  viewportHeight,
  annotations,
  onAnnotationsChange,
  editMode = false,
  activeTool = null,
}: ZoomableScreenshotProps) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  // Calculate cursor position as percentage
  const cursorPosition =
    clickX != null && clickY != null && viewportWidth && viewportHeight
      ? { x: (clickX / viewportWidth) * 100, y: (clickY / viewportHeight) * 100 }
      : null;

  // Get relative position from mouse event
  const getRelativePosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    },
    []
  );

  // Draw annotations on canvas
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !container || !ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    // Draw existing annotations
    annotations.forEach((ann) => {
      const x = ann.x * width;
      const y = ann.y * height;

      switch (ann.type) {
        case 'circle': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.1) * height;
          ctx.strokeStyle = ann.color || ANNOTATION_COLOR;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'arrow': {
          const endX = (ann.endX || ann.x + 0.1) * width;
          const endY = (ann.endY || ann.y) * height;
          drawArrow(ctx, x, y, endX, endY, ann.color || ANNOTATION_COLOR);
          break;
        }
        case 'text': {
          ctx.font = '16px Inter, sans-serif';
          ctx.fillStyle = ann.color || ANNOTATION_COLOR;
          ctx.fillText(ann.content || 'Texte', x, y);
          break;
        }
        case 'highlight': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.05) * height;
          ctx.fillStyle = HIGHLIGHT_COLOR;
          ctx.fillRect(x, y, w, h);
          break;
        }
        case 'blur': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.1) * height;
          ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
          ctx.filter = `blur(10px)`;
          ctx.fillRect(x, y, w, h);
          ctx.filter = 'none';
          break;
        }
      }
    });

    // Draw current drawing preview
    if (isDrawing && startPos && currentPos && activeTool) {
      const startX = startPos.x * width;
      const startY = startPos.y * height;
      const currX = currentPos.x * width;
      const currY = currentPos.y * height;

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = ANNOTATION_COLOR;
      ctx.lineWidth = 2;

      switch (activeTool) {
        case 'circle': {
          const w = Math.abs(currX - startX);
          const h = Math.abs(currY - startY);
          const cx = Math.min(startX, currX) + w / 2;
          const cy = Math.min(startY, currY) + h / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'arrow': {
          drawArrow(ctx, startX, startY, currX, currY, ANNOTATION_COLOR, true);
          break;
        }
        case 'highlight':
        case 'blur': {
          ctx.strokeRect(
            Math.min(startX, currX),
            Math.min(startY, currY),
            Math.abs(currX - startX),
            Math.abs(currY - startY)
          );
          break;
        }
      }

      ctx.setLineDash([]);
    }
  }, [annotations, isDrawing, startPos, currentPos, activeTool]);

  // Redraw on annotations change
  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      drawAnnotations();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [drawAnnotations]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode || !activeTool) return;

    const pos = getRelativePosition(e);
    if (!pos) return;

    if (activeTool === 'text') {
      const content = window.prompt("Texte de l'annotation:");
      if (content && onAnnotationsChange) {
        onAnnotationsChange([
          ...annotations,
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: pos.x,
            y: pos.y,
            content,
            color: ANNOTATION_COLOR,
          },
        ]);
      }
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !editMode || !activeTool) return;

    const pos = getRelativePosition(e);
    if (pos) {
      setCurrentPos(pos);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPos || !currentPos || !activeTool || !onAnnotationsChange) {
      setIsDrawing(false);
      return;
    }

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: activeTool,
      x: Math.min(startPos.x, currentPos.x),
      y: Math.min(startPos.y, currentPos.y),
      color: ANNOTATION_COLOR,
    };

    switch (activeTool) {
      case 'circle':
      case 'highlight':
      case 'blur':
        annotation.width = Math.abs(currentPos.x - startPos.x);
        annotation.height = Math.abs(currentPos.y - startPos.y);
        break;
      case 'arrow':
        annotation.x = startPos.x;
        annotation.y = startPos.y;
        annotation.endX = currentPos.x;
        annotation.endY = currentPos.y;
        break;
    }

    // Only add if it has some size
    const minSize = 0.01;
    if (
      activeTool === 'arrow' ||
      (annotation.width && annotation.width > minSize) ||
      (annotation.height && annotation.height > minSize)
    ) {
      onAnnotationsChange([...annotations, annotation]);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-stone-100">
        <p className="text-stone-400">Aucune capture d'écran</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-900">
      {/* Scrollable container for zoom */}
      <div className="overflow-auto" style={{ maxHeight: '500px' }}>
        <div
          ref={containerRef}
          className="relative transition-transform duration-200 origin-top-left"
          style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
        >
          <img
            src={url}
            alt={`Étape ${stepNumber}`}
            className="w-full"
            draggable={false}
          />

          {/* Cursor indicator */}
          {cursorPosition && (
            <CursorIndicator x={cursorPosition.x} y={cursorPosition.y} />
          )}

          {/* Annotation canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ cursor: editMode && activeTool ? 'crosshair' : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={() => setZoomIndex(Math.max(0, zoomIndex - 1))}
          disabled={zoomIndex === 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs font-medium text-white min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={() => setZoomIndex(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Helper to draw an arrow
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  dashed = false
) {
  const headLength = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  if (dashed) {
    ctx.setLineDash([5, 5]);
  }

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  if (dashed) {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
