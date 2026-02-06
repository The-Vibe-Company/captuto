import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('recording-uuid-123'),
});

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

// Helper to create a mock Request with JSON body
function createMockRequest(body: object): Request {
  return new Request('http://localhost:3678/api/recordings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Helper to create a valid recording payload
function createValidPayload() {
  return {
    recording: {
      title: 'Test Desktop Recording',
      duration: 167,
      started_at: '2026-02-06T10:30:00Z',
      macos_version: '15.3',
      screen_resolution: '2560x1600',
      apps_used: ['com.google.Chrome', 'com.microsoft.VSCode'],
    },
    steps: [
      {
        order_index: 0,
        timestamp: 3.2,
        action_type: 'click' as const,
        screenshot_key: 'user-123/tutorial-123/0.png',
        click_x: 0.45,
        click_y: 0.32,
        viewport_width: 2560,
        viewport_height: 1600,
        app_bundle_id: 'com.google.Chrome',
        app_name: 'Google Chrome',
        window_title: 'GitHub - Pull Requests',
        url: 'https://github.com/org/repo/pulls',
        element_info: {
          role: 'AXButton',
          title: 'New pull request',
        },
        auto_caption: "Click the 'New pull request' button",
      },
      {
        order_index: 1,
        timestamp: 8.1,
        action_type: 'type' as const,
        screenshot_key: 'user-123/tutorial-123/1.png',
        app_bundle_id: 'com.microsoft.VSCode',
        app_name: 'Visual Studio Code',
        window_title: 'index.ts - my-project',
        auto_caption: 'Type in the editor',
      },
    ],
  };
}

describe('POST /api/recordings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any);

    const request = createMockRequest(createValidPayload());
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when body is not valid JSON', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const request = new Request('http://localhost:3678/api/recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('returns 400 when recording metadata is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const request = createMockRequest({ steps: [{ order_index: 0, timestamp: 0, action_type: 'click', screenshot_key: 'x.png' }] });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing recording metadata');
  });

  it('returns 400 when steps array is empty', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const request = createMockRequest({
      recording: { duration: 10, started_at: '2026-02-06T10:30:00Z' },
      steps: [],
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No steps provided');
  });

  it('returns 400 when duration is invalid', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const request = createMockRequest({
      recording: { duration: -5, started_at: '2026-02-06T10:30:00Z' },
      steps: [{ order_index: 0, timestamp: 0, action_type: 'click', screenshot_key: 'x.png' }],
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid recording duration');
  });

  it('returns 200 and creates tutorial with sources for valid desktop recording', async () => {
    const mockTutorial = {
      id: 'tutorial-123',
      user_id: 'user-123',
      title: 'Test Desktop Recording',
      status: 'processing',
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockTutorial,
          error: null,
        }),
      }),
    });

    const mockSourcesInsert = vi.fn().mockResolvedValue({
      error: null,
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'tutorials') {
          return { insert: mockInsert };
        }
        if (table === 'sources') {
          return { insert: mockSourcesInsert };
        }
        return {};
      }),
    } as any);

    const request = createMockRequest(createValidPayload());
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorialId).toBe('tutorial-123');
    expect(body.recordingId).toBe('recording-uuid-123');
    expect(body.status).toBe('processing');
    expect(body.sourcesCreated).toBe(2);
    expect(body.editorUrl).toBe('/editor/tutorial-123');

    // Verify tutorial was created with correct data
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      title: 'Test Desktop Recording',
      status: 'processing',
    });

    // Verify sources were created with desktop-specific fields
    expect(mockSourcesInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tutorial_id: 'tutorial-123',
          order_index: 0,
          app_bundle_id: 'com.google.Chrome',
          app_name: 'Google Chrome',
          window_title: 'GitHub - Pull Requests',
          action_type: 'click',
          auto_caption: "Click the 'New pull request' button",
          recording_id: 'recording-uuid-123',
          click_x: 1152,  // 0.45 * 2560
          click_y: 512,   // 0.32 * 1600
        }),
        expect.objectContaining({
          tutorial_id: 'tutorial-123',
          order_index: 1,
          app_bundle_id: 'com.microsoft.VSCode',
          app_name: 'Visual Studio Code',
          action_type: 'type',
          recording_id: 'recording-uuid-123',
        }),
      ])
    );
  });

  it('uses default title when none provided', async () => {
    const mockTutorial = {
      id: 'tutorial-456',
      user_id: 'user-123',
      title: 'Desktop Recording',
      status: 'processing',
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockTutorial,
          error: null,
        }),
      }),
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'tutorials') {
          return { insert: mockInsert };
        }
        if (table === 'sources') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    } as any);

    const payload = createValidPayload();
    delete (payload.recording as any).title;
    const request = createMockRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Desktop Recording',
      })
    );
  });

  it('returns 500 when tutorial creation fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB error', code: 'PGRST000' },
            }),
          }),
        }),
      }),
    } as any);

    const request = createMockRequest(createValidPayload());
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to create tutorial');
  });

  it('succeeds even when sources insertion fails', async () => {
    const mockTutorial = {
      id: 'tutorial-789',
      user_id: 'user-123',
      title: 'Test',
      status: 'processing',
    };

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'tutorials') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockTutorial,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'sources') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { message: 'Sources insert failed' },
            }),
          };
        }
        return {};
      }),
    } as any);

    const request = createMockRequest(createValidPayload());
    const response = await POST(request);

    // Should still succeed - sources failure is non-fatal
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorialId).toBe('tutorial-789');
  });
});
