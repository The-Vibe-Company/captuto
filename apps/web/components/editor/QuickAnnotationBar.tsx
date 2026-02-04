'use client';

import { Circle, MoveRight, Type, MoreHorizontal, Highlighter, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationType } from '@/lib/types/editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuickAnnotationBarProps {
  onToolSelect: (tool: AnnotationType) => void;
  className?: string;
}

const QUICK_TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'circle', icon: Circle, label: 'Cercle' },
  { type: 'arrow', icon: MoveRight, label: 'Flèche' },
  { type: 'text', icon: Type, label: 'Texte' },
];

const MORE_TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'highlight', icon: Highlighter, label: 'Surligner' },
  { type: 'blur', icon: EyeOff, label: 'Flouter' },
];

export function QuickAnnotationBar({ onToolSelect, className }: QuickAnnotationBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg border border-stone-200 bg-white/95 p-1 shadow-sm backdrop-blur-sm transition-opacity',
        className
      )}
    >
      {QUICK_TOOLS.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => onToolSelect(type)}
          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 transition-colors hover:bg-violet-100 hover:text-violet-700"
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            title="Plus d'outils"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[120px]">
          {MORE_TOOLS.map(({ type, icon: Icon, label }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onToolSelect(type)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
