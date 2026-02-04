'use client';

import { Circle, ArrowRight, Type, Highlighter, EyeOff, Trash2, Check } from 'lucide-react';
import type { AnnotationType } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1.5 shadow-lg">
      {TOOLS.map(({ type, icon: Icon, label }) => (
        <Tooltip key={type}>
          <TooltipTrigger asChild>
            <Toggle
              pressed={activeTool === type}
              onPressedChange={() => onToolChange(activeTool === type ? null : type)}
              className={cn(
                'h-8 gap-1.5 px-2 data-[state=on]:bg-primary/10 data-[state=on]:text-primary',
                'hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">{label}</span>
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            disabled={!hasAnnotations}
            className={cn(
              'h-8 gap-1.5 px-2',
              hasAnnotations
                ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                : 'text-muted-foreground'
            )}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden text-xs sm:inline">Effacer</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Effacer toutes les annotations
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        size="sm"
        onClick={onDone}
        className="h-8 gap-1.5 px-3"
      >
        <Check className="h-4 w-4" />
        <span className="text-xs">Terminer</span>
      </Button>
    </div>
  );
}
