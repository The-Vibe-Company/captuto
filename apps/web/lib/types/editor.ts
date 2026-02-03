import type { Tables } from '@/lib/supabase/types';

export type Tutorial = Tables<'tutorials'>;
export type Step = Tables<'steps'>;

export interface StepWithSignedUrl extends Omit<Step, 'annotations'> {
  signedScreenshotUrl: string | null;
  // Annotations are parsed from JSON to typed array
  annotations?: Annotation[] | null;
}

export interface TutorialWithSteps {
  tutorial: Tutorial;
  steps: StepWithSignedUrl[];
}

// Annotation types for screenshot markup
export type AnnotationType = 'circle' | 'arrow' | 'text' | 'blur' | 'highlight';

export interface Annotation {
  id: string;
  type: AnnotationType;
  // Position relative (0-1) for responsive rendering
  x: number;
  y: number;
  // Dimensions for circle/blur/highlight (relative 0-1)
  width?: number;
  height?: number;
  // For arrows: end point (relative 0-1)
  endX?: number;
  endY?: number;
  // For text annotations
  content?: string;
  // Style options
  color?: string;
}

export interface StepWithAnnotations extends StepWithSignedUrl {
  annotations?: Annotation[];
}
