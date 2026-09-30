import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '../../../../lib/server-supabase';
import { recomputeEntityDailyMetrics } from '../../../../lib/recompute-metrics';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (request.headers.get('authorization') !== `Bearer ${secret}` && request.headers.get('x-cron-secret') !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = serverSupabase();
  if (!db) return NextResponse.json({ error: 'Supabase server configuration is missing' }, { status: 503 });

  try {
    const result = await recomputeEntityDailyMetrics(db);
    return NextResponse.json({ ...result, status: 'descriptive coverage only; no lead inference' });
  } catch {
    return NextResponse.json({ error: 'Metric recomputation failed; inspect server logs' }, { status: 500 });
  }
}
