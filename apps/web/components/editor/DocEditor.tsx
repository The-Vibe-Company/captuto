'use client';

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, FileText, Heading, Minus, Sparkles } from 'lucide-react';
import type { Tutorial, StepWithSignedUrl, SourceWithSignedUrl, Annotation } from '@/lib/types/editor';
import type { SaveStatus } from './EditorClient';
import { DocHeader } from './DocHeader';
import { DocStepCard } from './DocStepCard';
import { SourcesSidebar } from './SourcesSidebar';
import { AddStepBetween } from './AddStepBetween';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type NewStepType = 'text' | 'heading' | 'divider';

interface DocEditorProps {
  tutorial: Tutorial;
  sources: SourceWithSignedUrl[];
  steps: StepWithSignedUrl[];
  saveStatus: SaveStatus;
  onStepCaptionChange: (stepId: string, caption: string) => void;
  onStepAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (newSteps: StepWithSignedUrl[]) => void;
  onAddStep: (type: NewStepType, afterStepId?: string | null) => void;
  onCreateStepFromSource: (source: SourceWithSignedUrl) => void;
  onRemoveStepImage: (stepId: string) => void;
  onSetStepImage: (stepId: string, source: SourceWithSignedUrl) => void;
}

export function DocEditor({
  tutorial,
  sources,
  steps,
  saveStatus,
  onStepCaptionChange,
  onStepAnnotationsChange,
  onDeleteStep,
  onReorderSteps,
  onAddStep,
  onCreateStepFromSource,
  onRemoveStepImage,
  onSetStepImage,
}: DocEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = steps.findIndex((s) => s.id === active.id);
        const newIndex = steps.findIndex((s) => s.id === over.id);
        const newSteps = arrayMove(steps, oldIndex, newIndex);
        onReorderSteps(newSteps);
      }
    },
    [steps, onReorderSteps]
  );

  // Count only screenshot steps for numbering
  let screenshotStepNumber = 0;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen bg-background">
        <DocHeader saveStatus={saveStatus} tutorialTitle={tutorial.title} />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Main content area */}
            <main className="min-w-0 flex-1">
              {/* Tutorial header */}
              <div className="mb-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {tutorial.title || 'Sans titre'}
                    </h1>
                    {tutorial.description && (
                      <p className="text-sm text-muted-foreground max-w-2xl">
                        {tutorial.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{steps.length}</span>
                    <span>étapes</span>
                  </div>
                </div>
                <Separator className="mt-6" />
              </div>

              {/* Steps list */}
              <div className="space-y-1">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={steps.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {steps.map((step, index) => {
                      // Only count image and text steps for the numbered badge
                      const isImageStep = step.step_type === 'image';
                      const isTextStep = step.step_type === 'text';
                      if (isImageStep || isTextStep) {
                        screenshotStepNumber++;
                      }

                      return (
                        <div key={step.id}>
                          {/* Add step button before the first step */}
                          {index === 0 && (
                            <AddStepBetween
                              onAddStep={(type) => onAddStep(type, null)}
                            />
                          )}
                          <DocStepCard
                            step={step}
                            stepNumber={
                              step.step_type === 'heading' || step.step_type === 'divider'
                                ? 0
                                : screenshotStepNumber
                            }
                            sources={sources}
                            onCaptionChange={(caption) => onStepCaptionChange(step.id, caption)}
                            onAnnotationsChange={(annotations) =>
                              onStepAnnotationsChange(step.id, annotations)
                            }
                            onDelete={() => onDeleteStep(step.id)}
                            onRemoveImage={() => onRemoveStepImage(step.id)}
                            onSetImage={(source) => onSetStepImage(step.id, source)}
                          />
                          {/* Add step button after each step */}
                          <AddStepBetween
                            onAddStep={(type) => onAddStep(type, step.id)}
                          />
                        </div>
                      );
                    })}
                  </SortableContext>
                </DndContext>

                {/* Empty state */}
                {steps.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="rounded-full bg-muted p-3 mb-4">
                        <Sparkles className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-foreground mb-1">
                        Aucune étape pour le moment
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                        Commencez à créer votre tutoriel en ajoutant des étapes depuis la timeline ou en créant des étapes manuellement.
                      </p>
                      <div className="flex items-center gap-2">
                        <AddStepButton
                          icon={FileText}
                          label="Texte"
                          onClick={() => onAddStep('text', null)}
                        />
                        <AddStepButton
                          icon={Heading}
                          label="Titre"
                          onClick={() => onAddStep('heading', null)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add step buttons */}
                {steps.length > 0 && (
                  <div className="flex items-center justify-center gap-2 pt-6">
                    <AddStepButton
                      icon={FileText}
                      label="Texte"
                      onClick={() => onAddStep('text', steps[steps.length - 1]?.id)}
                    />
                    <AddStepButton
                      icon={Heading}
                      label="Titre"
                      onClick={() => onAddStep('heading', steps[steps.length - 1]?.id)}
                    />
                    <AddStepButton
                      icon={Minus}
                      label="Séparateur"
                      onClick={() => onAddStep('divider', steps[steps.length - 1]?.id)}
                    />
                  </div>
                )}
              </div>
            </main>

            {/* Right sidebar - Sources */}
            <SourcesSidebar
              sources={sources}
              onCreateStepFromSource={onCreateStepFromSource}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Small button component for adding steps
function AddStepButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          className="h-9 gap-2 border-dashed hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Ajouter une étape {label.toLowerCase()}
      </TooltipContent>
    </Tooltip>
  );
}
