'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';
import { preparePrivateEvidenceLinks } from '../../lib/private-research-brief';

async function requireBriefUser() {
  if (!authConfigured()) redirect('/login?error=disabled');
  const db = await authServerClient();
  if (!db) redirect('/login?error=disabled');
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/login?next=%2Fbriefs');
  return { db, user };
}

function note(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length <= maxLength ? cleaned : null;
}

export async function saveResearchBrief(formData: FormData) {
  const { db, user } = await requireBriefUser();
  const topic = note(formData, 'topic', 160);
  const workingThesis = note(formData, 'working_thesis', 2000);
  const alternatives = note(formData, 'alternatives', 2000);
  const disconfirmingEvidence = note(formData, 'disconfirming_evidence', 2000);
  const rawLinks = formData.get('evidence_links');
  const selectedCount = Number(formData.get('selected_count'));
  if (!topic || workingThesis === null || alternatives === null || disconfirmingEvidence === null
    || typeof rawLinks !== 'string' || rawLinks.length > 100_000
    || !Number.isInteger(selectedCount) || selectedCount < 0 || selectedCount > 1000) {
    redirect('/explore?save=invalid');
  }

  let parsedLinks: unknown;
  try { parsedLinks = JSON.parse(rawLinks); } catch { redirect('/explore?save=invalid'); }
  const evidenceLinks = preparePrivateEvidenceLinks(parsedLinks);
  const { count, error: countError } = await db.from('research_briefs')
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (countError) redirect('/explore?save=unavailable');
  if ((count ?? 0) >= 100) redirect('/explore?save=limit');

  const { error } = await db.from('research_briefs').insert({
    user_id: user.id,
    topic,
    working_thesis: workingThesis,
    alternatives,
    disconfirming_evidence: disconfirmingEvidence,
    evidence_links: evidenceLinks,
    excluded_evidence_count: Math.max(0, selectedCount - evidenceLinks.length),
  });
  if (error) redirect('/explore?save=unavailable');
  revalidatePath('/briefs');
  redirect('/briefs?saved=1');
}

export async function deleteResearchBrief(formData: FormData) {
  const { db, user } = await requireBriefUser();
  const id = formData.get('id');
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) redirect('/briefs?error=delete');
  const { error } = await db.from('research_briefs').delete().eq('id', id).eq('user_id', user.id);
  if (error) redirect('/briefs?error=delete');
  revalidatePath('/briefs');
  redirect('/briefs?deleted=1');
}
