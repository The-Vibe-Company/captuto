import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export const GENERATION_MODEL = 'claude-opus-4-5-20251101';

export const GENERATION_CONFIG = {
  maxTokens: 4096,
  temperature: 0.3, // Lower temperature for consistent outputs
} as const;
