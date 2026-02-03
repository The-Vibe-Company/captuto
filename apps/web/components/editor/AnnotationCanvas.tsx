'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Annotation, AnnotationType } from '@/lib/types/editor';

interface AnnotationCanvasProps {
  annotations: Annotation[];
  activeTool: AnnotationType | null;
  onAddAnnotation: (annotation: Annotation) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ANNOTATION_COLOR = '#e63946';
const HIGHLIGHT_COLOR = 'rgba(244, 211, 94, 0.4)';
const BLUR_RADIUS = 10;

export function AnnotationCanvas({
  annotations,
  activeTool,
  onAddAnnotation,
  containerRef,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  // Get relative position (0-1) from mouse event
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

  // Draw all annotations
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
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
          ctx.filter = `blur(${BLUR_RADIUS}px)`;
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

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawAnnotations();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef, drawAnnotations]);

  // Redraw when annotations change
  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool) return;

    const pos = getRelativePosition(e);
    if (!pos) return;

    if (activeTool === 'text') {
      const content = window.prompt('Texte de l\'annotation:');
      if (content) {
        onAddAnnotation({
          id: crypto.randomUUID(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          content,
          color: ANNOTATION_COLOR,
        });
      }
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeTool) return;

    const pos = getRelativePosition(e);
    if (pos) {
      setCurrentPos(pos);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPos || !currentPos || !activeTool) {
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
      onAddAnnotation(annotation);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 cursor-crosshair"
      style={{ cursor: activeTool ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
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

  // Line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  if (dashed) {
    ctx.setLineDash([]);
  }

  // Arrowhead
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
