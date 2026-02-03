'use client';

import { MousePointer2 } from 'lucide-react';

interface CursorIndicatorProps {
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
}

/**
 * Hand cursor indicator for showing click position on screenshots.
 * Replaces the blue pulsing circle with a GuideJar-style pointer.
 */
export function CursorIndicator({ x, y }: CursorIndicatorProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 transition-all duration-200"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        // Offset so the pointer tip is at the exact position
        transform: 'translate(-15%, -10%)',
      }}
    >
      <MousePointer2
        className="h-10 w-10 drop-shadow-lg"
        fill="#f59e0b"
        stroke="#92400e"
        strokeWidth={1.5}
      />
    </div>
  );
}
