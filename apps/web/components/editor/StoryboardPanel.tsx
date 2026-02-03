'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { StoryboardCard } from './StoryboardCard';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StoryboardPanelProps {
  steps: StepWithSignedUrl[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onReorderSteps: (newOrder: StepWithSignedUrl[]) => void;
  onDeleteStep: (stepId: string) => void;
}

export function StoryboardPanel({
  steps,
  selectedStepId,
  onSelectStep,
  onReorderSteps,
  onDeleteStep,
}: StoryboardPanelProps) {
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((step) => step.id === active.id);
      const newIndex = steps.findIndex((step) => step.id === over.id);

      const newSteps = arrayMove(steps, oldIndex, newIndex);
      onReorderSteps(newSteps);
    }
  }

  function handleDeleteClick(stepId: string) {
    setStepToDelete(stepId);
  }

  function confirmDelete() {
    if (stepToDelete) {
      onDeleteStep(stepToDelete);
      setStepToDelete(null);
    }
  }

  const stepToDeleteNumber = stepToDelete
    ? steps.findIndex((s) => s.id === stepToDelete) + 1
    : null;

  return (
    <>
      <div className="flex h-full flex-col border-l bg-stone-50">
        {/* Panel header */}
        <div className="border-b bg-stone-100/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-700">Storyboard</h2>
          <p className="text-xs text-stone-500">
            {steps.length} étape{steps.length !== 1 ? 's' : ''} • Glissez pour réorganiser
          </p>
        </div>

        {/* Steps grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={steps.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3">
                {steps.map((step, index) => (
                  <StoryboardCard
                    key={step.id}
                    step={step}
                    stepNumber={index + 1}
                    isSelected={step.id === selectedStepId}
                    onSelect={() => onSelectStep(step.id)}
                    onDelete={() => handleDeleteClick(step.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {steps.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              Aucune étape
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!stepToDelete} onOpenChange={() => setStepToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'étape {stepToDeleteNumber} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'étape et sa capture d'écran seront
              définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
