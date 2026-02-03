'use client';

import { Circle, ArrowRight, Type, Eraser, Highlighter, Undo, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationType } from '@/lib/types/editor';

interface AnnotationToolbarProps {
  activeTool: AnnotationType | null;
  onToolChange: (tool: AnnotationType | null) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  hasAnnotations: boolean;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, isActive, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
        isActive
          ? 'bg-red-500 text-white shadow-md'
          : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900'
      )}
    >
      {icon}
    </button>
  );
}

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onClear,
  canUndo,
  hasAnnotations,
}: AnnotationToolbarProps) {
  const tools: { type: AnnotationType; icon: React.ReactNode; label: string }[] = [
    { type: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Cercle' },
    { type: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Flèche' },
    { type: 'text', icon: <Type className="h-4 w-4" />, label: 'Texte' },
    { type: 'highlight', icon: <Highlighter className="h-4 w-4" />, label: 'Surligner' },
    { type: 'blur', icon: <Eraser className="h-4 w-4" />, label: 'Flouter' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1 shadow-sm">
      {tools.map((tool) => (
        <ToolButton
          key={tool.type}
          icon={tool.icon}
          label={tool.label}
          isActive={activeTool === tool.type}
          onClick={() => onToolChange(activeTool === tool.type ? null : tool.type)}
        />
      ))}

      <div className="mx-1 h-6 w-px bg-stone-300" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Annuler (Cmd+Z)"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
          canUndo
            ? 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            : 'cursor-not-allowed text-stone-300'
        )}
      >
        <Undo className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onClear}
        disabled={!hasAnnotations}
        title="Tout effacer"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
          hasAnnotations
            ? 'bg-white text-red-500 hover:bg-red-50 hover:text-red-600'
            : 'cursor-not-allowed text-stone-300'
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
