'use client';

import { Circle, ArrowRight, Type, Highlighter, EyeOff, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationType } from '@/lib/types/editor';

interface AnnotationToolbarProps {
  activeTool: AnnotationType | null;
  onToolChange: (tool: AnnotationType | null) => void;
  onClearAll: () => void;
  onDone: () => void;
  hasAnnotations: boolean;
}

const TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'circle', icon: Circle, label: 'Cercle' },
  { type: 'arrow', icon: ArrowRight, label: 'Flèche' },
  { type: 'text', icon: Type, label: 'Texte' },
  { type: 'highlight', icon: Highlighter, label: 'Surligner' },
  { type: 'blur', icon: EyeOff, label: 'Flouter' },
];

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  onClearAll,
  onDone,
  hasAnnotations,
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
      {TOOLS.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          type="button"
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors',
            activeTool === type
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
          onClick={() => onToolChange(activeTool === type ? null : type)}
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">{label}</span>
        </button>
      ))}

      <div className="mx-1 h-6 w-px bg-slate-200" />

      <button
        type="button"
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors',
          hasAnnotations
            ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
            : 'cursor-not-allowed text-slate-300'
        )}
        onClick={onClearAll}
        disabled={!hasAnnotations}
        title="Effacer tout"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden text-xs sm:inline">Effacer</span>
      </button>

      <div className="mx-1 h-6 w-px bg-slate-200" />

      <button
        type="button"
        className="flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        onClick={onDone}
      >
        <Check className="h-4 w-4" />
        <span className="text-xs">Terminer</span>
      </button>
    </div>
  );
}
