'use client';

import { useMemo, useState } from 'react';
import type {
  Annotation,
  AnnotationType,
  StepWithSignedUrl,
  Tutorial,
  SourceWithSignedUrl,
} from '@/lib/types/editor';
import type { SaveStatus } from '../EditorClient';
import type { NewStepType } from '../DocEditor';
import './studio.css';
import { StudioTopBar } from './StudioTopBar';
import { Timeline } from './Timeline';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { FocusMode } from './FocusMode';
import { playheadSteps } from './helpers';

interface StudioEditorProps {
  tutorial: Tutorial;
  sources: SourceWithSignedUrl[];
  steps: StepWithSignedUrl[];
  saveStatus: SaveStatus;
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onTitleChange: (title: string) => void;
  onStepCaptionChange: (stepId: string, caption: string) => void;
  onStepDescriptionChange: (stepId: string, description: string) => void;
  onStepAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onStepUrlChange: (stepId: string, url: string) => void;
  onStepShowUrlChange: (stepId: string, showUrl: boolean) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (next: StepWithSignedUrl[]) => void;
  onAddStep: (type: NewStepType, afterStepId?: string | null) => void;
  onGenerateClick?: () => void;
  isGenerating?: boolean;
}

export function StudioEditor({
  tutorial,
  sources,
  steps,
  saveStatus,
  selectedStepId,
  onSelectStep,
  onTitleChange,
  onStepCaptionChange,
  onStepDescriptionChange,
  onStepAnnotationsChange,
  onStepUrlChange,
  onStepShowUrlChange,
  onDeleteStep,
  onReorderSteps,
  onAddStep,
  onGenerateClick,
  isGenerating,
}: StudioEditorProps) {
  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null
  );
  const [focusOpen, setFocusOpen] = useState(false);

  const screenshots = useMemo(() => playheadSteps(steps), [steps]);
  const step = useMemo(
    () => steps.find((s) => s.id === selectedStepId) || null,
    [steps, selectedStepId]
  );
  const stepIdx = step ? screenshots.findIndex((s) => s.id === step.id) : -1;

  const handleSelectStep = (id: string) => {
    onSelectStep(id);
    setSelectedAnnotationId(null);
  };

  return (
    <div
      className="studio"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--studio-canvas-bg)',
      }}
    >
      <StudioTopBar
        tutorial={tutorial}
        saveStatus={saveStatus}
        onTitleChange={onTitleChange}
        onGenerateClick={onGenerateClick}
        isGenerating={isGenerating}
        hasSourcesForGeneration={sources.length > 0}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <Timeline
          steps={steps}
          selectedStepId={selectedStepId}
          onSelectStep={handleSelectStep}
          onReorderSteps={onReorderSteps}
          onAddStepAfter={(id) => onAddStep('text', id)}
        />

        <Canvas
          step={step}
          screenshots={screenshots}
          selectedStepId={selectedStepId}
          onSelectStep={handleSelectStep}
          onTitleChange={onStepCaptionChange}
          onCaptionChange={onStepDescriptionChange}
          onAnnotationsChange={onStepAnnotationsChange}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onOpenFocus={() => step && setFocusOpen(true)}
        />

        <Inspector
          step={step}
          stepIdx={stepIdx}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationsChange={onStepAnnotationsChange}
          onUrlChange={onStepUrlChange}
          onShowUrlChange={onStepShowUrlChange}
          onTitleChange={onStepCaptionChange}
          onDeleteStep={onDeleteStep}
        />

        {focusOpen && step && (
          <FocusMode
            step={step}
            stepIdx={stepIdx}
            screenshots={screenshots}
            onAnnotationsChange={onStepAnnotationsChange}
            onPrev={() =>
              stepIdx > 0 && handleSelectStep(screenshots[stepIdx - 1].id)
            }
            onNext={() =>
              stepIdx < screenshots.length - 1 &&
              handleSelectStep(screenshots[stepIdx + 1].id)
            }
            onClose={() => setFocusOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
