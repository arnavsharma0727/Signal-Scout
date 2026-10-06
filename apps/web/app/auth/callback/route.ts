import { NextResponse, type NextRequest } from 'next/server';
import { authServerClient } from '../../../lib/supabase-auth-server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') || '/watchlists';
  const safeNext = ['/watchlists', '/briefs', '/explore', '/candidates'].includes(next) ? next : '/watchlists';
  const supabase = await authServerClient();
  if (!supabase || !code) return NextResponse.redirect(new URL('/login?error=auth', request.url));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?error=auth', request.url));
  return NextResponse.redirect(new URL(safeNext, request.url));
}
