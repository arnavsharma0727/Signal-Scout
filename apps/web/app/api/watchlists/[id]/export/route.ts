import { NextResponse, type NextRequest } from 'next/server';
import { authConfigured, authServerClient } from '../../../../../lib/supabase-auth-server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authConfigured()) return new NextResponse('Not found', { status: 404 });
  const db = await authServerClient();
  const { data: { user } } = db ? await db.auth.getUser() : { data: { user: null } };
  if (!db || !user) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  const { data: list } = await db.from('watchlists').select('id,name').eq('id', id).maybeSingle();
  if (!list) return new NextResponse('Not found', { status: 404 });
  const { data: rows, error } = await db.from('watchlist_companies').select('company:companies(ticker,company_name_en)').eq('watchlist_id', id);
  if (error) return new NextResponse('Export unavailable', { status: 500 });
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const csv = ['ticker,company_name', ...(rows ?? []).map((row: any) => `${quote(row.company?.ticker ?? '')},${quote(row.company?.company_name_en ?? '')}`)].join('\r\n');
  const filename = String(list.name).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'watchlist';
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}.csv"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
