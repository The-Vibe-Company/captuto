import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'Cache-Control': 'no-store' };
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const statsSchema = z.object({
  total_users: count,
  new_users_1d: count,
  new_users_7d: count,
  active_users_1d: count,
  active_users_7d: count,
}).strict();

export async function GET(request: Request) {
  const token = process.env.STATS_TOKEN;
  const authorization = request.headers.get('authorization');
  // Fail closed with 401 when unconfigured; compare fixed-size digests so token
  // lengths (including multibyte input) never make timingSafeEqual throw.
  if (!token || !authorization?.startsWith('Bearer ') || !timingSafeEqual(
    createHash('sha256').update(authorization.slice(7)).digest(),
    createHash('sha256').update(token).digest(),
  )) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  }

  try {
    const { data, error } = await createAdminClient().rpc('get_usage_stats' as never);
    const parsed = statsSchema.safeParse(data);
    if (error || !parsed.success) {
      return Response.json({ error: 'Stats unavailable' }, { status: 503, headers });
    }
    return Response.json(parsed.data, { headers });
  } catch {
    return Response.json({ error: 'Stats unavailable' }, { status: 503, headers });
  }
}
