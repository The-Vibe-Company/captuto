/**
 * Types and schema for AI-powered tutorial generation using Claude.
 */

/**
 * A generated step instruction for a tutorial.
 */
export interface GeneratedStep {
  /** The ID of the source this step describes */
  sourceId: string;
  /** Generated instruction text for this step (1-3 sentences) */
  textContent: string;
}

/**
 * The complete generated content for a tutorial.
 */
export interface GeneratedTutorialContent {
  /** A concise, descriptive title for the tutorial */
  title: string;
  /** A 1-2 sentence description of what this tutorial teaches */
  description: string;
  /** Generated instructions for each step */
  steps: GeneratedStep[];
}

/**
 * Response from the generate-tutorial API endpoint.
 */
export interface GenerateTutorialResponse {
  success: true;
  generated: GeneratedTutorialContent;
  metadata: {
    modelUsed: string;
    inputTokens: number;
    outputTokens: number;
    processingTimeMs: number;
  };
}

/**
 * Error response from the generate-tutorial API endpoint.
 */
export interface GenerateTutorialErrorResponse {
  success: false;
  error: string;
  code:
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'NO_SOURCES'
    | 'RATE_LIMITED'
    | 'GENERATION_FAILED'
    | 'INTERNAL_ERROR';
}

/**
 * JSON Schema for Claude's tool input.
 * Used with tools parameter for structured output.
 */
export const TUTORIAL_GENERATION_SCHEMA = {
  name: 'tutorial_content',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        description: 'A concise, descriptive title for the tutorial (max 100 characters)',
      },
      description: {
        type: 'string' as const,
        description: 'A 1-2 sentence description of what this tutorial teaches',
      },
      steps: {
        type: 'array' as const,
        description: 'Generated instructions for each step in order',
        items: {
          type: 'object' as const,
          properties: {
            sourceId: {
              type: 'string' as const,
              description: 'The ID of the source this step describes (must match a provided source ID)',
            },
            textContent: {
              type: 'string' as const,
              description: 'Clear, actionable instruction for this step (1-3 sentences)',
            },
          },
          required: ['sourceId', 'textContent'] as string[],
          additionalProperties: false,
        },
      },
    },
    required: ['title', 'description', 'steps'] as string[],
    additionalProperties: false,
  },
};

/**
 * System prompt for tutorial generation.
 */
export const GENERATION_SYSTEM_PROMPT = `You are an expert technical writer creating step-by-step tutorials.

Your task is to analyze screenshots of a user's workflow and generate clear, actionable tutorial content.

Guidelines:
- Detect the language from the transcription (if provided) and generate content in the SAME language
- If no transcription, detect the language from the UI screenshots and use that language
- Write in second person ("Click the button" / "Cliquez sur le bouton")
- Be specific about UI elements (use element names, button text when available)
- Keep instructions concise but complete (1-3 sentences per step)
- Focus on WHAT to do, not WHY (unless context helps understanding)
- If click coordinates are provided, reference the clicked element
- Generate a descriptive title that explains what the tutorial teaches
- Write a brief description summarizing the tutorial's purpose

For each step, describe what action the user should take based on:
1. The screenshot showing the current state
2. The click position and element being interacted with (if available)
3. Any transcription/narration from the user (if available)
4. The URL context (if available)`;
