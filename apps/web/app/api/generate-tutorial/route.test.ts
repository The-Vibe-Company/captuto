import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockAnthropicResponse, createMockGeneratedContent } from '@/test/helpers/mock-anthropic';
import { createJsonRequest } from '@/test/helpers/mock-request';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/anthropic', () => ({
  getAnthropicClient: vi.fn(),
  GENERATION_MODEL: 'claude-test-model',
  GENERATION_CONFIG: { maxTokens: 4096, temperature: 0.3 },
}));

import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { POST } from './route';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockGetAnthropicClient = getAnthropicClient as ReturnType<typeof vi.fn>;

const mockTutorial = {
  id: 'tut-1',
  user_id: 'user-123',
  title: 'Test Tutorial',
  description: 'A test',
};

const mockSource = {
  id: 'src-1',
  screenshot_url: 'screenshots/img.png',
  click_x: 100,
  click_y: 200,
  viewport_width: 1920,
  viewport_height: 1080,
  click_type: 'click',
  url: 'https://example.com',
  element_info: null,
  order_index: 0,
  timestamp_start: null,
};

function createMockSupabase({
  user = { id: 'user-123' },
  authError = null,
  tutorial = mockTutorial,
  tutorialError = null,
  sources = [mockSource],
  sourcesError = null,
  steps = [],
  stepsError = null,
  signedUrl = 'https://signed.url/img.png',
}: {
  user?: { id: string } | null;
  authError?: unknown;
  tutorial?: unknown;
  tutorialError?: unknown;
  sources?: unknown[];
  sourcesError?: unknown;
  steps?: unknown[];
  stepsError?: unknown;
  signedUrl?: string;
} = {}) {
  let fromCallCount = 0;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // tutorials query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: tutorial,
                error: tutorialError,
              }),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        // sources query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: sources,
                error: sourcesError,
              }),
            }),
          }),
        };
      }
      // steps query
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: steps,
              error: stepsError,
            }),
          }),
        }),
      };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl },
          error: null,
        }),
      }),
    },
  };
}

describe('POST /api/generate-tutorial', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch for image fetching and transcription
    global.fetch = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/transcribe')) {
        return Promise.resolve({
          ok: false,
          status: 404,
        });
      }
      // Image fetch
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('only analyzes selected sources in the requested timeline order', async () => {
    const sources = ['src-1', 'src-2', 'src-3'].map((id, index) => ({ ...mockSource, id, screenshot_url: `screenshots/${id}.png`, order_index: index }));
    mockCreateClient.mockResolvedValue(createMockSupabase({ sources }));
    const create = vi.fn().mockResolvedValue(createMockAnthropicResponse(createMockGeneratedContent({ steps: [{ sourceId: 'src-1', textContent: 'Open the dashboard' }] })));
    mockGetAnthropicClient.mockReturnValue({ messages: { create } });
    const response = await POST(createJsonRequest('http://localhost/api/generate-tutorial', 'POST', { tutorialId: 'tut-1', sourceIds: ['src-3', 'src-1'] }));
    expect(response.status).toBe(200);
    const prompt = JSON.stringify(create.mock.calls[0][0].messages);
    expect(prompt).not.toContain('src-2');
    expect(prompt.indexOf('src-3')).toBeLessThan(prompt.indexOf('src-1'));
  });

  it.each([['src-1', 'src-3'], ['src-3', 'src-1']])('keeps narration aligned when selecting %s then %s', async (first, second) => {
    const sources = ['src-1', 'src-2', 'src-3'].map((id, index) => ({ ...mockSource, id, timestamp_start: index * 10000 }));
    mockCreateClient.mockResolvedValue(createMockSupabase({ sources }));
    vi.mocked(global.fetch).mockImplementation(async () => ({ ok: true, json: async () => ({ segments: [
      { start: 1, end: 2, transcript: 'First-screen narration' },
      { start: 11, end: 12, transcript: 'Excluded-screen narration' },
      { start: 21, end: 22, transcript: 'Third-screen narration' },
    ] }), arrayBuffer: async () => new ArrayBuffer(8) }) as Response);
    const create = vi.fn().mockResolvedValue(createMockAnthropicResponse(createMockGeneratedContent({ steps: [{ sourceId: first, textContent: 'Selected screen' }] })));
    mockGetAnthropicClient.mockReturnValue({ messages: { create } });
    const response = await POST(createJsonRequest('http://localhost/api/generate-tutorial', 'POST', { tutorialId: 'tut-1', sourceIds: [first, second] }));
    expect(response.status).toBe(200);
    const prompt = JSON.stringify(create.mock.calls[0][0].messages);
    expect(prompt).toContain('First-screen narration');
    expect(prompt).toContain('Third-screen narration');
    expect(prompt).not.toContain('Excluded-screen narration');
  });

  it.each([{ sourceIds: [] }, { sourceIds: ['not-in-this-guide'] }])('rejects unavailable or empty source selection $sourceIds', async ({ sourceIds }) => {
    mockCreateClient.mockResolvedValue(createMockSupabase());
    const response = await POST(createJsonRequest('http://localhost/api/generate-tutorial', 'POST', { tutorialId: 'tut-1', sourceIds }));
    expect(response.status).toBe(400);
    expect(mockGetAnthropicClient).not.toHaveBeenCalled();
  });

  it('does not generate when existing steps cannot be loaded', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase({ stepsError: { message: 'database unavailable' } }));
    const response = await POST(createJsonRequest('http://localhost/api/generate-tutorial', 'POST', { tutorialId: 'tut-1' }));
    expect(response.status).toBe(500);
    expect(mockGetAnthropicClient).not.toHaveBeenCalled();
  });

  it('rejects AI output that reintroduces an excluded screen', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase({ sources: [mockSource, { ...mockSource, id: 'src-2' }] }));
    mockGetAnthropicClient.mockReturnValue({ messages: { create: vi.fn().mockResolvedValue(createMockAnthropicResponse(createMockGeneratedContent({ steps: [{ sourceId: 'src-2', textContent: 'Excluded capture' }] }))) } });
    const response = await POST(createJsonRequest('http://localhost/api/generate-tutorial', 'POST', { tutorialId: 'tut-1', sourceIds: ['src-1'] }));
    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe('GENERATION_FAILED');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ user: null, authError: { message: 'Not authenticated' } })
    );

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase()
    );

    const request = new Request('http://localhost/api/generate-tutorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 when tutorialId is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase()
    );

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      {}
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing tutorialId');
  });

  it('returns 404 when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        tutorial: null,
        tutorialError: { message: 'Not found' },
      })
    );

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'nonexistent' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 403 when user is not the owner', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        tutorial: { ...mockTutorial, user_id: 'other-user' },
      })
    );

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when no sources are found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ sources: [] })
    );

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('NO_SOURCES');
  });

  it('calls Claude API and returns generated content', async () => {
    const generatedContent = createMockGeneratedContent({ steps: [{ sourceId: 'src-1', textContent: 'Open the dashboard' }] });
    const mockAnthropicResponse = createMockAnthropicResponse(generatedContent);

    mockCreateClient.mockResolvedValue(createMockSupabase());
    mockGetAnthropicClient.mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue(mockAnthropicResponse),
      },
    });

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.generated.title).toBe('How to Create a New Project');
    expect(data.generated.steps).toHaveLength(1);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.modelUsed).toBe('claude-test-model');
    expect(data.metadata.inputTokens).toBe(1500);
    expect(data.metadata.outputTokens).toBe(350);
  });

  it('returns 500 when Claude returns no tool_use block', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase());
    mockGetAnthropicClient.mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'I cannot generate that.' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    });

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('GENERATION_FAILED');
  });

  it('returns 500 when generated content has invalid structure', async () => {
    const invalidContent = { title: '', description: '', steps: 'not-an-array' };
    const mockAnthropicResponse = createMockAnthropicResponse(invalidContent);

    mockCreateClient.mockResolvedValue(createMockSupabase());
    mockGetAnthropicClient.mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue(mockAnthropicResponse),
      },
    });

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('GENERATION_FAILED');
  });

  it('returns metadata with processing time', async () => {
    const generatedContent = createMockGeneratedContent({ steps: [{ sourceId: 'src-1', textContent: 'Open the dashboard' }] });
    const mockAnthropicResponse = createMockAnthropicResponse(generatedContent);

    mockCreateClient.mockResolvedValue(createMockSupabase());
    mockGetAnthropicClient.mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue(mockAnthropicResponse),
      },
    });

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(data.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('returns 500 on unexpected error inside try block', async () => {
    // The error must occur inside the try block (after createClient resolves).
    // Simulate by having auth.getUser throw.
    const mockClient = createMockSupabase();
    mockClient.auth.getUser = vi.fn().mockRejectedValue(new Error('Unexpected DB crash'));
    mockCreateClient.mockResolvedValue(mockClient);

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('returns 429 on rate limit error', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase());
    mockGetAnthropicClient.mockReturnValue({
      messages: {
        create: vi.fn().mockRejectedValue(new Error('rate_limit exceeded')),
      },
    });

    const request = createJsonRequest(
      'http://localhost/api/generate-tutorial',
      'POST',
      { tutorialId: 'tut-1' }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe('RATE_LIMITED');
  });
});
