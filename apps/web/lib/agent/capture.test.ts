import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { CaptureService, captureSourceSchema } from './capture';
import { TutorialService } from './service';
import type { RequestUser } from '@/lib/auth/request';

const tutorialId = '11111111-1111-4111-a111-111111111111';
const sourceId = '22222222-2222-4222-a222-222222222222';
const input = { tutorialId, sourceId, timestamp: 0, order: 0, action: 'click' as const,
  url: 'https://example.test', title: 'Settings', caption: 'Open settings', click: { x: 0.2, y: 0.4 } };
function database(existing: unknown = null, uploadError: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const upload = vi.fn().mockResolvedValue({ error: uploadError });
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }) }), insert }));
  const auth = { userId: 'owner', supabase: { from, storage: { from: () => ({ upload }) } } } as unknown as RequestUser;
  return { auth, insert, upload };
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(TutorialService.prototype, 'editable').mockResolvedValue({ id: tutorialId } as never);
});
describe('autonomous captures', () => {
  it('uses actual image dimensions and stores normalized click metadata', async () => {
    const screenshot = (await sharp({ create: { width: 1000, height: 500, channels: 3, background: '#fff' } }).png().toBuffer()).toString('base64');
    const db = database();
    await new CaptureService(db.auth).append({ ...input, screenshot });
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ viewport_width: 1000, viewport_height: 500, click_x: 200, click_y: 200 }));
    expect(db.upload.mock.calls[0][2].contentType).toBe('image/png');
    const savedPath = db.insert.mock.calls[0][0].screenshot_url;
    const retry = database({ id: sourceId, tutorial_id: tutorialId, screenshot_url: savedPath });
    await expect(new CaptureService(retry.auth).append({ ...input, screenshot })).resolves.toMatchObject({ saved: true });
    expect(retry.insert).not.toHaveBeenCalled();
    expect(retry.upload).not.toHaveBeenCalled();
  });
  it('rejects invalid image bytes before storing anything', async () => {
    const db = database();
    await expect(new CaptureService(db.auth).append({ ...input, screenshot: Buffer.from('not an image').toString('base64') })).rejects.toThrow('Invalid screenshot');
    expect(db.upload).not.toHaveBeenCalled();
  });
  it('does not overwrite an existing or foreign source UUID', async () => {
    const screenshot = (await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer()).toString('base64');
    for (const existing of [{ id: sourceId, tutorial_id: 'foreign' }, { id: sourceId, tutorial_id: tutorialId, screenshot_url: 'different-image' }]) {
      const db = database(existing);
      await expect(new CaptureService(db.auth).append({ ...input, screenshot })).rejects.toThrow('Source ID');
      expect(db.upload).not.toHaveBeenCalled();
    }
  });
  it('does not report success or insert a source when storage fails', async () => {
    const screenshot = (await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer()).toString('base64');
    const db = database(null, { message: 'offline' });
    await expect(new CaptureService(db.auth).append({ ...input, screenshot })).rejects.toThrow('Could not upload');
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('validates coordinates and supported actions', () => {
    expect(captureSourceSchema.safeParse({ ...input, screenshot: 'x', click: { x: 2, y: 0 } }).success).toBe(false);
    expect(captureSourceSchema.safeParse({ ...input, screenshot: 'x', action: 'unsupported' }).success).toBe(false);
  });
});
