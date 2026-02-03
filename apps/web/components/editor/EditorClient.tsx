'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { EditorHeader } from './EditorHeader';
import { StepViewer } from './StepViewer';
import { StoryboardPanel } from './StoryboardPanel';
import { PreviewOverlay } from './PreviewOverlay';
import type { Tutorial, StepWithSignedUrl, Annotation } from '@/lib/types/editor';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EditorClientProps {
  initialTutorial: Tutorial;
  initialSteps: StepWithSignedUrl[];
  audioUrl: string | null;
}

export function EditorClient({ initialTutorial, initialSteps }: EditorClientProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingAnnotations, setPendingAnnotations] = useState<Record<string, Annotation[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isReordering, setIsReordering] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedStepIndex = steps.findIndex((s) => s.id === selectedStepId);
  const hasChanges = Object.keys(pendingChanges).length > 0 || Object.keys(pendingAnnotations).length > 0;
  const totalSteps = steps.length;

  // Get current annotations for the selected step
  // Priority: pending changes > saved step data > empty array
  const currentAnnotations = selectedStepId
    ? (pendingAnnotations[selectedStepId] ??
       (selectedStep?.annotations as Annotation[] | undefined) ??
       [])
    : [];

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
  }, []);

  // Navigation functions
  const goToPreviousStep = useCallback(() => {
    if (selectedStepIndex > 0) {
      setSelectedStepId(steps[selectedStepIndex - 1].id);
    }
  }, [selectedStepIndex, steps]);

  const goToNextStep = useCallback(() => {
    if (selectedStepIndex < steps.length - 1) {
      setSelectedStepId(steps[selectedStepIndex + 1].id);
    }
  }, [selectedStepIndex, steps]);

  const handleTextChange = useCallback((text: string) => {
    if (!selectedStepId) return;

    // Update local steps state for immediate UI feedback
    setSteps((prev) =>
      prev.map((step) =>
        step.id === selectedStepId ? { ...step, text_content: text } : step
      )
    );

    // Track pending changes
    setPendingChanges((prev) => ({
      ...prev,
      [selectedStepId]: text,
    }));

    // Mark as unsaved
    setSaveStatus('unsaved');
  }, [selectedStepId]);

  const handleAnnotationsChange = useCallback((annotations: Annotation[]) => {
    if (!selectedStepId) return;

    // Track pending annotation changes
    setPendingAnnotations((prev) => ({
      ...prev,
      [selectedStepId]: annotations,
    }));

    // Mark as unsaved
    setSaveStatus('unsaved');
  }, [selectedStepId]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      // Combine all step IDs that need saving
      const stepIdsToSave = new Set([
        ...Object.keys(pendingChanges),
        ...Object.keys(pendingAnnotations),
      ]);

      // Save all pending changes
      const savePromises = Array.from(stepIdsToSave).map(async (stepId) => {
        const payload: { text_content?: string; annotations?: Annotation[] } = {};

        if (pendingChanges[stepId] !== undefined) {
          payload.text_content = pendingChanges[stepId];
        }

        if (pendingAnnotations[stepId] !== undefined) {
          payload.annotations = pendingAnnotations[stepId];
        }

        const response = await fetch(`/api/steps/${stepId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save');
        }

        return response.json();
      });

      await Promise.all(savePromises);

      // Update local steps state with saved annotations before clearing pending
      setSteps((prev) =>
        prev.map((step) => {
          const savedAnnotations = pendingAnnotations[step.id];
          if (savedAnnotations !== undefined) {
            return { ...step, annotations: savedAnnotations };
          }
          return step;
        })
      );

      // Clear pending changes on success
      setPendingChanges({});
      setPendingAnnotations({});
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pendingAnnotations, hasChanges]);

  // Handle step reordering via drag & drop
  const handleReorderSteps = useCallback(async (newSteps: StepWithSignedUrl[]) => {
    const previousSteps = steps;

    // Optimistic update
    setSteps(newSteps);
    setIsReordering(true);

    try {
      const response = await fetch(`/api/tutorials/${initialTutorial.id}/steps/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stepIds: newSteps.map((s) => s.id) }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder steps');
      }
    } catch (error) {
      console.error('Failed to reorder steps:', error);
      // Rollback on error
      setSteps(previousSteps);
    } finally {
      setIsReordering(false);
    }
  }, [steps, initialTutorial.id]);

  // Preview handlers
  const handleOpenPreview = useCallback(() => {
    // Start preview from the currently selected step
    const index = selectedStepIndex >= 0 ? selectedStepIndex : 0;
    setPreviewStepIndex(index);
    setIsPreviewOpen(true);
  }, [selectedStepIndex]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handlePreviewStepChange = useCallback((index: number) => {
    setPreviewStepIndex(index);
  }, []);

  // Handle step deletion
  const handleDeleteStep = useCallback(async (stepId: string) => {
    const previousSteps = steps;
    const stepIndex = steps.findIndex((s) => s.id === stepId);

    // Optimistic update - remove step from list
    const newSteps = steps.filter((s) => s.id !== stepId);
    setSteps(newSteps);

    // Update selected step if deleted step was selected
    if (selectedStepId === stepId) {
      // Select the next step, or the previous one if we deleted the last step
      const newSelectedIndex = Math.min(stepIndex, newSteps.length - 1);
      setSelectedStepId(newSteps[newSelectedIndex]?.id ?? null);
    }

    // Remove any pending changes for this step
    setPendingChanges((prev) => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });

    // Remove any pending annotations for this step
    setPendingAnnotations((prev) => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });

    try {
      const response = await fetch(`/api/steps/${stepId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete step');
      }
    } catch (error) {
      console.error('Failed to delete step:', error);
      // Rollback on error
      setSteps(previousSteps);
      setSelectedStepId(stepId);
    }
  }, [steps, selectedStepId]);

  // Auto-save with debounce (1 second delay)
  useEffect(() => {
    if (!hasChanges) return;

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for auto-save
    debounceTimerRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pendingChanges, pendingAnnotations, hasChanges, handleSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea or input
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Cmd/Ctrl + P to toggle preview (only when not already in preview)
      if ((e.metaKey || e.ctrlKey) && e.key === 'p' && !isPreviewOpen) {
        e.preventDefault();
        handleOpenPreview();
        return;
      }

      // Navigation shortcuts (only when not in input field)
      if (!isInputField) {
        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          goToPreviousStep();
        } else if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          goToNextStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, goToPreviousStep, goToNextStep, isPreviewOpen, handleOpenPreview]);

  return (
    <div className="flex h-screen flex-col bg-stone-100">
      <EditorHeader
        title={initialTutorial.title}
        isSaving={isSaving || isReordering}
        hasChanges={hasChanges}
        saveStatus={saveStatus}
        onSave={handleSave}
        onPreview={handleOpenPreview}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main editor area - 70% */}
        <div className="flex-[7] overflow-hidden bg-white">
          <StepViewer
            step={selectedStep}
            stepNumber={selectedStepIndex + 1}
            totalSteps={totalSteps}
            annotations={currentAnnotations}
            onTextChange={handleTextChange}
            onAnnotationsChange={handleAnnotationsChange}
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
            hasPrevious={selectedStepIndex > 0}
            hasNext={selectedStepIndex < steps.length - 1}
          />
        </div>

        {/* Storyboard panel - 30% */}
        <div className="w-80 flex-shrink-0">
          <StoryboardPanel
            steps={steps}
            selectedStepId={selectedStepId}
            onSelectStep={handleSelectStep}
            onReorderSteps={handleReorderSteps}
            onDeleteStep={handleDeleteStep}
          />
        </div>
      </div>

      {/* Preview overlay */}
      {isPreviewOpen && (
        <PreviewOverlay
          steps={steps}
          currentStepIndex={previewStepIndex}
          onStepChange={handlePreviewStepChange}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
