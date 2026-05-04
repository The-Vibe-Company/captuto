import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/flatten/cache', () => ({
  getFlattenedSignedUrl: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getFlattenedSignedUrl } from '@/lib/flatten/cache';
import { GET } from './route';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockGetFlattenedSignedUrl = getFlattenedSignedUrl as ReturnType<typeof vi.fn>;

function createMockClient({
  tutorialResult = { data: null, error: null },
  stepsResult = { data: null, error: null },
}: {
  tutorialResult?: { data: unknown; error: unknown };
  stepsResult?: { data: unknown; error: unknown };
} = {}) {
  let fromCallCount = 0;
  return {
    from: vi.fn().mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(tutorialResult),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(stepsResult),
          }),
        }),
      };
    }),
  };
}

const mockTutorial = {
  id: 'tut-1',
  title: 'Test Tutorial',
  description: 'A test',
  slug: 'test-slug',
  status: 'published',
  visibility: 'public',
  public_token: 'token-abc',
  published_at: '2024-01-01',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockStep = {
  id: 'step-1',
  tutorial_id: 'tut-1',
  source_id: 'src-1',
  order_index: 0,
  text_content: 'Click the button',
  step_type: 'click',
  annotations: null,
  created_at: '2024-01-01',
  sources: {
    id: 'src-1',
    screenshot_url: 'path/to/image.png',
    click_x: 100,
    click_y: 200,
    viewport_width: 1920,
    viewport_height: 1080,
    click_type: 'click',
    url: 'https://example.com',
    element_info: null,
  },
};

describe('GET /api/public/tutorials/token/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFlattenedSignedUrl.mockResolvedValue('https://signed.url/flat.png');
  });

  it('returns 404 when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: null, error: { message: 'Not found' } },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/bad-token');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'bad-token' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tutorial not found');
  });

  it('returns 404 when tutorial is private', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: {
          data: { ...mockTutorial, visibility: 'private' },
          error: null,
        },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tutorial not found');
  });

  it('returns tutorial for link_only visibility', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: {
          data: { ...mockTutorial, visibility: 'link_only' },
          error: null,
        },
        stepsResult: { data: [mockStep], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tutorial.visibility).toBe('link_only');
  });

  it('returns tutorial for public visibility', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [mockStep], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tutorial.id).toBe('tut-1');
    expect(data.tutorial.title).toBe('Test Tutorial');
    expect(data.steps).toHaveLength(1);
  });

  it('serves flattened screenshot URLs (never raw)', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [mockStep], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(data.steps[0].signedScreenshotUrl).toBe('https://signed.url/flat.png');
    expect(mockGetFlattenedSignedUrl).toHaveBeenCalledWith({
      originalPath: 'path/to/image.png',
      annotations: [],
    });
  });

  it('passes parsed annotations to the flatten pipeline (string JSON)', async () => {
    const annotations = [{ id: 'a', type: 'circle', x: 0.5, y: 0.5 }];
    const stepWithStringAnnotations = {
      ...mockStep,
      annotations: JSON.stringify(annotations),
    };

    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [stepWithStringAnnotations], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(mockGetFlattenedSignedUrl).toHaveBeenCalledWith({
      originalPath: 'path/to/image.png',
      annotations,
    });
    // Annotations are baked into the image; the API does NOT ship them.
    expect(data.steps[0].annotations).toBeNull();
  });

  it('parses element_info from string JSON', async () => {
    const stepWithStringInfo = {
      ...mockStep,
      sources: {
        ...mockStep.sources,
        element_info: JSON.stringify({ tag: 'input', text: 'Search' }),
      },
    };

    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [stepWithStringInfo], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(data.steps[0].element_info).toEqual({ tag: 'input', text: 'Search' });
  });

  it('never includes raw annotations in the response', async () => {
    const stepWithAnnotations = {
      ...mockStep,
      annotations: [{ id: 'a', type: 'blur', x: 0.1, y: 0.1, width: 0.2, height: 0.2 }],
    };
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [stepWithAnnotations], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(data.steps[0].annotations).toBeNull();
  });

  it('returns 500 when steps query fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: null, error: { message: 'DB error' } },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch tutorial content');
  });

  it('returns 500 on unexpected error', async () => {
    mockCreateClient.mockRejectedValue(new Error('Connection failed'));

    const request = new Request('http://localhost/api/public/tutorials/token/token-abc');
    const response = await GET(request as any, { params: Promise.resolve({ token: 'token-abc' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
