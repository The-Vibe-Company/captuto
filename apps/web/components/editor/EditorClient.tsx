'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { EditorHeader } from './EditorHeader';
import { StepSidebar } from './StepSidebar';
import { StepViewer } from './StepViewer';
import { AudioPlayer } from './AudioPlayer';
import type { Tutorial, StepWithSignedUrl } from '@/lib/types/editor';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EditorClientProps {
  initialTutorial: Tutorial;
  initialSteps: StepWithSignedUrl[];
  audioUrl: string | null;
}

export function EditorClient({ initialTutorial, initialSteps, audioUrl }: EditorClientProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedStepIndex = steps.findIndex((s) => s.id === selectedStepId);
  const hasChanges = Object.keys(pendingChanges).length > 0;
  const totalSteps = steps.length;

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

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      // Save all pending changes
      const savePromises = Object.entries(pendingChanges).map(async ([stepId, text]) => {
        const response = await fetch(`/api/steps/${stepId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text_content: text }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save');
        }

        return response.json();
      });

      await Promise.all(savePromises);

      // Clear pending changes on success
      setPendingChanges({});
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, hasChanges]);

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
  }, [pendingChanges, hasChanges, handleSave]);

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
  }, [handleSave, goToPreviousStep, goToNextStep]);

  return (
    <div className="flex h-screen flex-col">
      <EditorHeader
        title={initialTutorial.title}
        isSaving={isSaving}
        hasChanges={hasChanges}
        saveStatus={saveStatus}
        onSave={handleSave}
      />

      <div className="border-b bg-white px-4 py-3">
        <AudioPlayer audioUrl={audioUrl} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <StepSidebar
          steps={steps}
          selectedStepId={selectedStepId}
          onSelectStep={handleSelectStep}
        />

        <StepViewer
          step={selectedStep}
          stepNumber={selectedStepIndex + 1}
          totalSteps={totalSteps}
          onTextChange={handleTextChange}
          onPrevious={goToPreviousStep}
          onNext={goToNextStep}
          hasPrevious={selectedStepIndex > 0}
          hasNext={selectedStepIndex < steps.length - 1}
        />
      </div>
    </div>
  );
}
