'use client';

import { useState, useCallback } from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WYSIWYGHeader } from './WYSIWYGHeader';
import { WYSIWYGStepCard } from './WYSIWYGStepCard';
import type { Tutorial, StepWithSignedUrl, Annotation } from '@/lib/types/editor';
import type { SaveStatus } from './EditorClient';

interface WYSIWYGEditorProps {
  tutorial: Tutorial;
  steps: StepWithSignedUrl[];
  saveStatus: SaveStatus;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onStepCaptionChange: (stepId: string, caption: string) => void;
  onStepAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (newSteps: StepWithSignedUrl[]) => void;
  onPreview: () => void;
}

export function WYSIWYGEditor({
  tutorial,
  steps,
  saveStatus,
  selectedStepId,
  onSelectStep,
  onStepCaptionChange,
  onStepAnnotationsChange,
  onDeleteStep,
  onReorderSteps,
  onPreview,
}: WYSIWYGEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

  return (
    <div className="flex h-screen flex-col bg-stone-100">
      <WYSIWYGHeader saveStatus={saveStatus} onPreview={onPreview} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Tutorial header */}
          <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-stone-900">{tutorial.title}</h1>
            {tutorial.description && (
              <p className="mt-2 text-stone-600">{tutorial.description}</p>
            )}
            <div className="mt-3 flex items-center gap-2 text-sm text-stone-500">
              <span>{steps.length} étape{steps.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Steps list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <WYSIWYGStepCard
                    key={step.id}
                    step={step}
                    stepNumber={index + 1}
                    isSelected={selectedStepId === step.id}
                    onSelect={() => onSelectStep(step.id)}
                    onCaptionChange={(caption) => onStepCaptionChange(step.id, caption)}
                    onAnnotationsChange={(annotations) =>
                      onStepAnnotationsChange(step.id, annotations)
                    }
                    onDelete={() => onDeleteStep(step.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Empty state */}
          {steps.length === 0 && (
            <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white">
              <div className="text-center">
                <p className="text-stone-500">Aucune étape enregistrée</p>
                <p className="mt-1 text-sm text-stone-400">
                  Utilisez l'extension Chrome pour enregistrer un tutoriel
                </p>
              </div>
            </div>
          )}

          {/* Bottom padding for scroll */}
          <div className="h-20" />
        </div>
      </main>
    </div>
  );
}
