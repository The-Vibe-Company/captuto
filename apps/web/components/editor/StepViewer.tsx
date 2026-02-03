'use client';

import { Button } from '@/components/ui/button';
import { RichTextEditor } from './RichTextEditor';
import { AnnotatedScreenshot } from './AnnotatedScreenshot';
import type { Annotation, StepWithSignedUrl } from '@/lib/types/editor';
import { MousePointerClick, ArrowRight, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface StepViewerProps {
  step: StepWithSignedUrl | null;
  stepNumber: number;
  totalSteps: number;
  annotations: Annotation[];
  onTextChange: (text: string) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function StepViewer({
  step,
  stepNumber,
  totalSteps,
  annotations,
  onTextChange,
  onAnnotationsChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext
}: StepViewerProps) {
  if (!step) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Sélectionnez une étape pour l'éditer</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      {/* Step header with navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
            {stepNumber}
          </span>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {step.click_type === 'navigation' ? (
              <>
                <ArrowRight className="h-4 w-4" />
                <span>Navigation</span>
              </>
            ) : (
              <>
                <MousePointerClick className="h-4 w-4" />
                <span>Clic</span>
              </>
            )}
          </div>
          <span className="text-sm text-gray-400">
            Étape {stepNumber} sur {totalSteps}
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPrevious}
            title="Étape précédente (↑ ou K)"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
            title="Étape suivante (↓ ou J)"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Screenshot with annotations */}
      <div className="mb-6">
        <AnnotatedScreenshot
          screenshotUrl={step.signedScreenshotUrl}
          stepNumber={stepNumber}
          annotations={annotations}
          onAnnotationsChange={onAnnotationsChange}
          clickX={step.click_x}
          clickY={step.click_y}
          viewportWidth={step.viewport_width}
          viewportHeight={step.viewport_height}
        />
      </div>

      {/* URL */}
      {step.url && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm">
          <ExternalLink className="h-4 w-4 text-gray-400" />
          <span className="truncate text-gray-600">{step.url}</span>
        </div>
      )}

      {/* Rich text editor */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Description de l'étape
        </label>
        <RichTextEditor
          content={step.text_content || ''}
          onChange={onTextChange}
          placeholder="Décrivez cette étape... (ex: Cliquez sur le bouton 'Connexion' en haut à droite)"
        />
      </div>
    </div>
  );
}
