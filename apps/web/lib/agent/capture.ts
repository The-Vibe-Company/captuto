import { z } from 'zod';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { AgentError, TutorialService } from './service';
import type { RequestUser } from '@/lib/auth/request';

export const captureSourceSchema = z.object({
  tutorialId: z.string().uuid(),
  sourceId: z.string().uuid().describe('Stable capture UUID; reuse on retry.'),
  screenshot: z.string().min(1).max(5_000_000).describe('Base64 PNG or JPEG, at most 3 MB. Upload one viewport at a time.'),
  timestamp: z.number().finite().min(0),
  order: z.number().int().min(0).max(9999),
  action: z.enum(['click', 'navigation', 'tab_change', 'type', 'keyboard_shortcut', 'scroll', 'manual_marker']),
  url: z.string().url().max(8000),
  title: z.string().max(1000),
  caption: z.string().max(2000),
  click: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
}).strict();

export class CaptureService {
  constructor(private auth: RequestUser) {}

  async create(id: string, title: string, origin: string) {
    const { supabase, userId } = this.auth;
    const { data: existing, error: lookupError } = await supabase.from('tutorials').select('*').eq('id', id).maybeSingle();
    if (lookupError) throw new AgentError('Could not check capture', 500);
    if (existing && existing.user_id !== userId) throw new AgentError('Capture ID unavailable', 409);
    if (!existing) {
      const { error } = await supabase.from('tutorials').insert({ id, user_id: userId, title, status: 'draft' });
      if (error) throw new AgentError('Could not create capture; retry with the same ID', 409);
    }
    await new TutorialService(this.auth).editable(id);
    return { tutorialId: id, editorUrl: `${origin}/editor/${id}` };
  }

  async append(input: z.infer<typeof captureSourceSchema>) {
    const value = captureSourceSchema.parse(input);
    await new TutorialService(this.auth).editable(value.tutorialId);
    const image = Buffer.from(value.screenshot, 'base64');
    if (!image.length || image.length > 3 * 1024 * 1024) throw new AgentError('Screenshot must be at most 3 MB', 413);
    let metadata;
    try { metadata = await sharp(image, { limitInputPixels: 40_000_000 }).metadata(); }
    catch { throw new AgentError('Invalid screenshot'); }
    if (!['png', 'jpeg'].includes(metadata.format || '') || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw new AgentError('Expected a single PNG or JPEG viewport');
    const { screenshot: _, ...attributes } = value;
    const digest = createHash('sha256').update(image).update(JSON.stringify(attributes)).digest('hex');
    const { supabase, userId } = this.auth;
    const path = `${userId}/${value.tutorialId}/${value.sourceId}-${digest}.${metadata.format === 'png' ? 'png' : 'jpg'}`;
    const { data: existing, error: lookupError } = await supabase.from('sources').select('id,tutorial_id,screenshot_url').eq('id', value.sourceId).maybeSingle();
    if (lookupError) throw new AgentError('Could not check source', 500);
    if (existing) {
      if (existing.tutorial_id !== value.tutorialId || existing.screenshot_url !== path) throw new AgentError('Source ID already used with different content', 409);
      return { sourceId: existing.id, tutorialId: value.tutorialId, saved: true };
    }
    const { error: uploadError } = await supabase.storage.from('screenshots').upload(path, image, { contentType: `image/${metadata.format}`, upsert: true });
    if (uploadError) throw new AgentError('Could not upload screenshot; retry with the same source ID', 500);
    const { error } = await supabase.from('sources').insert({
      id: value.sourceId, tutorial_id: value.tutorialId, order_index: value.order,
      screenshot_url: path, timestamp_start: value.timestamp, action_type: value.action,
      click_type: value.action, url: value.url, window_title: value.title, auto_caption: value.caption,
      viewport_width: metadata.width, viewport_height: metadata.height,
      click_x: value.click ? Math.round(value.click.x * metadata.width) : null,
      click_y: value.click ? Math.round(value.click.y * metadata.height) : null,
      app_name: 'Browser', recording_id: value.tutorialId,
    });
    if (error) throw new AgentError('Could not save source; retry with the same source ID', 409);
    return { sourceId: value.sourceId, tutorialId: value.tutorialId, saved: true };
  }
}
