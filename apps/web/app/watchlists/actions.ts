'use server';

import { parse } from 'csv-parse/sync';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';

async function requireUser() {
  if (!authConfigured()) redirect('/login?error=disabled');
  const db = await authServerClient();
  if (!db) redirect('/login?error=disabled');
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/login');
  return { db, user };
}

export async function signOut() {
  const db = await authServerClient();
  if (db) await db.auth.signOut();
  redirect('/');
}

export async function createWatchlist(formData: FormData) {
  const { db, user } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  if (!name || name.length > 80) redirect('/watchlists?error=name');
  const { error } = await db.from('watchlists').insert({ name, user_id: user.id, is_public: false });
  if (error) redirect('/watchlists?error=create');
  revalidatePath('/watchlists');
}

export async function addTicker(formData: FormData) {
  const { db } = await requireUser();
  const watchlistId = String(formData.get('watchlist_id') ?? '');
  const ticker = String(formData.get('ticker') ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,24}$/.test(ticker)) redirect('/watchlists?error=ticker');
  const [{ data: list }, { data: company }] = await Promise.all([
    db.from('watchlists').select('id').eq('id', watchlistId).maybeSingle(),
    db.from('companies').select('id').eq('ticker', ticker).eq('is_active', true).maybeSingle(),
  ]);
  if (!list || !company) redirect('/watchlists?error=notfound');
  const { error } = await db.from('watchlist_companies').upsert(
    { watchlist_id: list.id, company_id: company.id },
    { onConflict: 'watchlist_id,company_id', ignoreDuplicates: true },
  );
  if (error) redirect('/watchlists?error=add');
  revalidatePath('/watchlists');
}

export async function removeTicker(formData: FormData) {
  const { db } = await requireUser();
  const watchlistId = String(formData.get('watchlist_id') ?? '');
  const companyId = String(formData.get('company_id') ?? '');
  await db.from('watchlist_companies').delete().eq('watchlist_id', watchlistId).eq('company_id', companyId);
  revalidatePath('/watchlists');
}

export async function deleteWatchlist(formData: FormData) {
  const { db } = await requireUser();
  const watchlistId = String(formData.get('watchlist_id') ?? '');
  await db.from('watchlists').delete().eq('id', watchlistId);
  revalidatePath('/watchlists');
}

export async function importTickers(formData: FormData) {
  const { db } = await requireUser();
  const watchlistId = String(formData.get('watchlist_id') ?? '');
  const file = formData.get('file');
  const { data: list } = await db.from('watchlists').select('id').eq('id', watchlistId).maybeSingle();
  if (!list || !(file instanceof File) || file.size > 100_000) redirect('/watchlists?error=file');
  let tickers: string[];
  try {
    const rows = parse(await file.text(), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: false }) as Record<string, unknown>[];
    if (!rows.length || !Object.keys(rows[0]).some((key) => key.toLowerCase() === 'ticker')) redirect('/watchlists?error=csv');
    tickers = rows.map((row) => {
      const key = Object.keys(row).find((column) => column.toLowerCase() === 'ticker');
      return String(key ? row[key] ?? '' : '').trim().toUpperCase();
    }).filter(Boolean);
  } catch {
    redirect('/watchlists?error=csv');
  }
  if (!tickers.length || tickers.length > 200 || tickers.some((ticker) => !/^[A-Z0-9._-]{1,24}$/.test(ticker))) redirect('/watchlists?error=csv');
  const { data: companies } = await db.from('companies').select('id,ticker').in('ticker', [...new Set(tickers)]).eq('is_active', true);
  const members = (companies ?? []).map((company) => ({ watchlist_id: list.id, company_id: company.id }));
  if (members.length) {
    const { error } = await db.from('watchlist_companies').upsert(members, { onConflict: 'watchlist_id,company_id', ignoreDuplicates: true });
    if (error) redirect('/watchlists?error=import');
  }
  const missing = tickers.filter((ticker) => !(companies ?? []).some((company) => company.ticker === ticker));
  revalidatePath('/watchlists');
  redirect(`/watchlists?imported=${members.length}&missing=${encodeURIComponent(missing.slice(0, 20).join(','))}`);
}
