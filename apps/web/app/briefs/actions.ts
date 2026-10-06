'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authConfigured, authServerClient } from '../../lib/supabase-auth-server';
import { preparePrivateEvidenceLinks } from '../../lib/private-research-brief';
import { serverSupabase } from '../../lib/server-supabase';
import { preparePublicLeadSubmission, type LeadSourceDocument, type ReviewedLeadCitation } from '../../lib/research-lead-submission';

async function requireBriefUser(next: '/briefs' | '/explore' | '/candidates' = '/briefs') {
  if (!authConfigured()) redirect('/login?error=disabled');
  const db = await authServerClient();
  if (!db) redirect('/login?error=disabled');
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect(`/login?next=${encodeURIComponent(next)}`);
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

/** Publish only after an authenticated researcher explicitly requests it and server checks the stored evidence again. */
export async function publishEvidenceQualifiedLead(formData: FormData) {
  const { user } = await requireBriefUser('/explore');
  if (formData.get('publish_confirmation') !== 'yes') redirect('/explore?lead=invalid#research-brief');
  const db = serverSupabase();
  if (!db) redirect('/explore?lead=unavailable#research-brief');
  const topic = note(formData, 'topic', 160);
  const workingThesis = note(formData, 'working_thesis', 2000);
  const alternatives = note(formData, 'alternatives', 2000);
  const disconfirmingEvidence = note(formData, 'disconfirming_evidence', 2000);
  const rawCitations = formData.get('reviewed_evidence');
  if (!topic || workingThesis === null || alternatives === null || disconfirmingEvidence === null ||
      typeof rawCitations !== 'string' || rawCitations.length > 100_000) {
    redirect('/explore?lead=invalid#research-brief');
  }

  let parsed: unknown;
  try { parsed = JSON.parse(rawCitations); } catch { redirect('/explore?lead=invalid#research-brief'); }
  const citations = parseReviewedCitations(parsed);
  if (!citations) redirect('/explore?lead=invalid#research-brief');

  const { data: documents, error: documentError } = await db.from('source_documents')
    .select('id,source_type,source_name,source_domain,language_code,title_original,source_url,published_at,raw_metadata_json')
    .in('id', citations.map(({ documentId }) => documentId));
  if (documentError || !documents || documents.length !== citations.length) {
    redirect('/explore?lead=ineligible#research-brief');
  }
  const submission = preparePublicLeadSubmission({
    topic, workingThesis, alternatives, disconfirmingEvidence, citations,
    documents: documents as LeadSourceDocument[],
  });
  if (!submission) redirect('/explore?lead=ineligible#research-brief');

  const { count, error: limitError } = await db.from('research_leads')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id).eq('status', 'active');
  if (limitError) redirect('/explore?lead=unavailable#research-brief');
  if ((count ?? 0) >= 10) redirect('/explore?lead=limit#research-brief');

  const { data: existing, error: duplicateCheckError } = await db.from('research_leads')
    .select('id,verified_evidence_json')
    .eq('created_by', user.id).eq('status', 'active').eq('topic', topic).limit(20);
  if (duplicateCheckError) redirect('/explore?lead=unavailable#research-brief');
  const incomingIds = [...citations.map(({ documentId }) => documentId)].sort();
  const duplicate = (existing ?? []).find((lead) => {
    const saved = Array.isArray(lead.verified_evidence_json) ? lead.verified_evidence_json : [];
    const savedIds = saved.map((item) => item && typeof item === 'object' && 'documentId' in item && typeof item.documentId === 'string' ? item.documentId : '').sort();
    return savedIds.length === incomingIds.length && savedIds.every((id, index) => id === incomingIds[index]);
  });
  if (duplicate) redirect('/candidates?published=duplicate');

  const { data: draft, error: insertError } = await db.from('research_leads')
    .insert({ ...submission.lead, created_by: user.id })
    .select('id').single();
  if (insertError || !draft) redirect('/explore?lead=unavailable#research-brief');

  const { error: linksError } = await db.from('research_lead_documents').insert(
    submission.evidence.map(({ documentId, relationshipType }) => ({
      research_lead_id: draft.id,
      document_id: documentId,
      relationship_type: relationshipType,
    })),
  );
  if (linksError) {
    await db.from('research_leads').delete().eq('id', draft.id).eq('status', 'draft');
    redirect('/explore?lead=unavailable#research-brief');
  }

  const { error: publishError } = await db.from('research_leads')
    .update({ status: 'active' }).eq('id', draft.id).eq('created_by', user.id).eq('status', 'draft');
  if (publishError) {
    await db.from('research_leads').delete().eq('id', draft.id).eq('status', 'draft');
    redirect('/explore?lead=unavailable#research-brief');
  }
  revalidatePath('/candidates');
  revalidatePath(`/divergences/${draft.id}`);
  redirect('/candidates?published=1');
}

/** Authors can withdraw only their own public lead; the record is retained for audit, but leaves the public queue. */
export async function withdrawResearchLead(formData: FormData) {
  const { user } = await requireBriefUser('/candidates');
  const db = serverSupabase();
  const id = formData.get('id');
  if (!db || typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) redirect('/candidates?withdrawn=unavailable');
  const { data, error } = await db.from('research_leads')
    .update({ status: 'withdrawn' })
    .eq('id', id).eq('created_by', user.id).eq('status', 'active')
    .select('id').maybeSingle();
  if (error || !data) redirect('/candidates?withdrawn=unavailable');
  revalidatePath('/candidates');
  redirect('/candidates?withdrawn=1');
}

function parseReviewedCitations(value: unknown): ReviewedLeadCitation[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 40) return null;
  const citations: ReviewedLeadCitation[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.documentId !== 'string' ||
        !['supports', 'contradicts', 'context'].includes(String(row.assessment)) ||
        typeof row.sourceObservation !== 'string' || row.researcherVerifiedOriginal !== true) return null;
    citations.push({
      documentId: row.documentId,
      assessment: row.assessment as ReviewedLeadCitation['assessment'],
      sourceObservation: row.sourceObservation,
      researcherVerifiedOriginal: true,
    });
  }
  return citations;
}
