'use client';

import { Circle, MoveRight, Type, MoreHorizontal, Highlighter, EyeOff } from 'lucide-react';
import type { AnnotationType } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
        'flex items-center gap-0.5 rounded-lg border border-border bg-background/95 p-1 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      {QUICK_TOOLS.map(({ type, icon: Icon, label }) => (
        <Tooltip key={type}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToolSelect(type)}
              className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      ))}

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Plus d&apos;outils
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="min-w-[120px]">
          {MORE_TOOLS.map(({ type, icon: Icon, label }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onToolSelect(type)}
              className="gap-2"
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
