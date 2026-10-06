"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assessResearchLeadReadiness,
  createResearchBriefMarkdown,
  ResearchEvidence,
  ResearchEvidenceClass,
  summarizeEvidenceCoverage,
} from "../../lib/research-brief";
import { countExcludedPrivateEvidence, preparePrivateEvidenceLinks } from "../../lib/private-research-brief";
import { publishEvidenceQualifiedLead, saveResearchBrief } from "../briefs/actions";
import { LOCAL_RESEARCH_NOTES_KEY, parseLocalResearchNotes, serializeLocalResearchNotes } from "../../lib/local-research-draft";

const EVIDENCE_CLASSES: ResearchEvidenceClass[] = [
  "expert Q&A",
  "social discussion",
  "news coverage",
  "editorial discussion",
  "expert analysis",
  "community forum",
];

export default function ResearchBrief({
  evidence,
  initialTopic,
  authAvailable,
  saveEnabled,
  localStorageAvailable,
  leadStatus = "",
  onRemove,
  onAssess,
  onNote,
  onVerifyOriginal,
  onClear,
}: {
  evidence: ResearchEvidence[];
  initialTopic: string;
  authAvailable: boolean;
  saveEnabled: boolean;
  localStorageAvailable: boolean | null;
  leadStatus?: string;
  onRemove: (id: string) => void;
  onAssess: (id: string, assessment: "supports" | "contradicts" | "context" | "not relevant" | undefined) => void;
  onNote: (id: string, note: string) => void;
  onVerifyOriginal: (id: string, checked: boolean) => void;
  onClear: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [workingThesis, setWorkingThesis] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [disconfirmingEvidence, setDisconfirmingEvidence] = useState("");
  const [notice, setNotice] = useState("");
  const [localNotesReady, setLocalNotesReady] = useState(false);
  const [notesStorageAvailable, setNotesStorageAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_RESEARCH_NOTES_KEY);
      setNotesStorageAvailable(true);
      const notes = saved ? parseLocalResearchNotes(saved) : null;
      if (notes) {
        setTopic(notes.topic);
        setWorkingThesis(notes.workingThesis);
        setAlternatives(notes.alternatives);
        setDisconfirmingEvidence(notes.disconfirmingEvidence);
      }
    } catch {
      // Browser storage may be disabled; keep the live form usable.
      setNotesStorageAvailable(false);
    }
    setLocalNotesReady(true);
  }, []);
  useEffect(() => {
    if (!localNotesReady) return;
    try {
      window.localStorage.setItem(LOCAL_RESEARCH_NOTES_KEY, serializeLocalResearchNotes({
        topic, workingThesis, alternatives, disconfirmingEvidence,
      }));
      setNotesStorageAvailable(true);
    } catch {
      // Browser storage quota/private-mode errors leave the current form intact.
      setNotesStorageAvailable(false);
    }
  }, [topic, workingThesis, alternatives, disconfirmingEvidence, localNotesReady]);
  const counts = useMemo(() => EVIDENCE_CLASSES.map((evidenceClass) => ({
    evidenceClass,
    count: evidence.filter((item) => item.evidenceClass === evidenceClass).length,
  })), [evidence]);
  const coverage = useMemo(() => summarizeEvidenceCoverage(evidence), [evidence]);
  const readiness = useMemo(() => assessResearchLeadReadiness({
    topic, workingThesis, alternatives, disconfirmingEvidence, evidence,
  }), [topic, workingThesis, alternatives, disconfirmingEvidence, evidence]);
  const privateLinks = useMemo(() => preparePrivateEvidenceLinks(evidence.map((item) => ({
    url: item.url,
    language: item.language,
    publishedAt: item.timeValue,
    assessment: item.researcherAssessment,
    researcherNote: item.researcherNote,
  }))), [evidence]);
  const excludedCount = useMemo(() => countExcludedPrivateEvidence(evidence), [evidence]);
  const hasDraftContent = Boolean(
    evidence.length || topic.trim() || workingThesis.trim() || alternatives.trim() || disconfirmingEvidence.trim(),
  );
  const publicationEvidence = useMemo(() => evidence.filter((item) => {
    const published = Date.parse(item.timeValue);
    return Number.isFinite(published) && published <= Date.now() && Date.now() - published <= 30 * 86400000 &&
      item.researcherAssessment && item.researcherAssessment !== "not relevant";
  }), [evidence]);
  const hasPublishableStoredSources = publicationEvidence.length >= 3 && publicationEvidence.every(({ id }) =>
    /^publisher:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
  const publicEvidencePacket = JSON.stringify(publicationEvidence.map((item) => ({
    documentId: item.id.slice("publisher:".length),
    assessment: item.researcherAssessment,
    sourceObservation: item.researcherNote,
    researcherVerifiedOriginal: item.researcherVerifiedOriginal === true,
  })));
  const localAutosaveStatus = localStorageAvailable === false || notesStorageAvailable === false
    ? "unavailable"
    : localStorageAvailable === true && notesStorageAvailable === true
      ? "active"
      : "checking";
  const markdown = () => createResearchBriefMarkdown({
    topic,
    workingThesis,
    alternatives,
    disconfirmingEvidence,
    evidence,
    exportedAt: new Date().toISOString(),
  });

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(markdown());
      setNotice(readiness.readyForHumanReview
        ? "Lead dossier copied to clipboard. It has not been published or sent to Signal Scout."
        : "Research brief copied to clipboard. It has not been sent to Signal Scout.");
    } catch {
      setNotice("Clipboard access was unavailable. Use the download action instead.");
    }
  }

  function downloadBrief() {
    const blob = new Blob([markdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const slug = topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    anchor.download = `signal-scout-${readiness.readyForHumanReview ? "lead-dossier" : "brief"}${slug ? `-${slug}` : ""}.md`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(readiness.readyForHumanReview
      ? "Human-reviewed lead dossier downloaded to this device. It has not been published or sent to Signal Scout."
      : "Research brief downloaded to this device. It has not been sent to Signal Scout.");
  }

  function clearDraft() {
    if (!window.confirm("Clear the selected evidence and all notebook notes from this page? This cannot be undone.")) return;
    onClear();
    setTopic("");
    setWorkingThesis("");
    setAlternatives("");
    setDisconfirmingEvidence("");
    try {
      window.localStorage.removeItem(LOCAL_RESEARCH_NOTES_KEY);
    } catch {
      // The in-page state is cleared even if storage is unavailable.
    }
    setNotice("The in-memory brief was cleared.");
  }

  return (
    <section id="research-brief" className="panel mt-8 p-5 md:p-7" aria-labelledby="research-brief-title">
      {leadStatus && <p role={leadStatus === "published" ? "status" : "alert"} className="mb-4 border-y border-line py-3 text-sm leading-6">
        {leadStatus === "published" ? "Your researcher-reviewed lead is now public in the shared queue." :
          leadStatus === "duplicate" ? "An identical lead from this account is already in the public queue." :
            leadStatus === "ineligible" ? "Nothing was published. One or more citations is not a current, stored, rights-reviewed source record, or the server-side evidence checks did not pass." :
              leadStatus === "limit" ? "This account has reached the limit of 10 active public leads." :
                leadStatus === "disabled" ? "Public lead submission requires owner-configured sign-in; your local dossier is unchanged." :
                  leadStatus === "unavailable" ? "The public lead could not be saved. No lead was activated; your local dossier is unchanged." :
                    "The lead could not be published. Check the form and try again."}
      </p>}
      <div className="eyebrow">Saved in this browser · not synced</div>
      <h2 id="research-brief-title" className="mt-2 text-xl font-semibold">Build a research brief</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Add source links deliberately, mark each recent item as supporting, contradicting, context, or not relevant, then write your hypothesis, alternatives, and disconfirmation test. Unassessed or unrelated items cannot count toward the qualification checks. These are your judgments, not automated sentiment or verified facts. Citations and notes are autosaved only in this browser; they are sent to Signal Scout only if you explicitly save a private brief or publish a qualifying lead. Exporting or copying sends them only to your device or clipboard.
      </p>

      <div className="mt-5 grid gap-4">
        <label className="block text-sm font-medium">
          Topic
          <input className="mt-2 block w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} placeholder="What are you investigating?" />
        </label>
        <label className="block text-sm font-medium">
          Working thesis — your words, not an automated conclusion
          <textarea className="mt-2 block min-h-20 w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink" value={workingThesis} onChange={(event) => setWorkingThesis(event.target.value)} maxLength={2000} placeholder="What tentative explanation might fit the selected evidence?" />
        </label>
        <label className="block text-sm font-medium">
          Alternative explanations and counter-evidence
          <textarea className="mt-2 block min-h-20 w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink" value={alternatives} onChange={(event) => setAlternatives(event.target.value)} maxLength={2000} placeholder="What else could explain this? What conflicts with it?" />
        </label>
        <label className="block text-sm font-medium">
          What would change my mind?
          <textarea className="mt-2 block min-h-20 w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink" value={disconfirmingEvidence} onChange={(event) => setDisconfirmingEvidence(event.target.value)} maxLength={2000} placeholder="What evidence or observation would disconfirm the thesis?" />
        </label>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Selected source links ({evidence.length})</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted" aria-label="Evidence types selected">
            {counts.filter(({ count }) => count > 0).map(({ evidenceClass, count }) => (
              <span key={evidenceClass}>{evidenceClass}: {count}</span>
            ))}
          </div>
        </div>
        {evidence.length ? (
          <ul className="mt-3 divide-y divide-line">
            {evidence.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <a className="font-medium underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {item.source} · {item.evidenceClass} · {item.language} · {item.timeLabel}: {new Date(item.timeValue).toLocaleString()}
                    {item.context ? ` · ${item.context}` : ""}
                    {item.attribution ? ` · ${item.attribution}` : ""}
                  </p>
                  <label className="mt-2 block text-xs leading-5 text-muted">
                    Source-specific observation · paraphrase what you checked in the original
                    <textarea
                      className="mt-1 block min-h-16 w-full resize-y rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
                      value={item.researcherNote ?? ""}
                      onChange={(event) => onNote(item.id, event.target.value.slice(0, 1000))}
                      maxLength={1000}
                      rows={2}
                      placeholder="What does this source actually contribute to the thesis? Keep it in your own words."
                    />
                  </label>
                  {item.researcherAssessment !== "not relevant" && (
                    <label className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted">
                      <input
                        className="mt-1 shrink-0"
                        type="checkbox"
                        checked={item.researcherVerifiedOriginal === true}
                        onChange={(event) => onVerifyOriginal(item.id, event.target.checked)}
                      />
                      <span>I opened and checked this original source, date, and context.</span>
                    </label>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <label className="text-xs text-muted">
                    Relevance / thesis assessment
                    <select
                      className="ml-2 rounded border border-line bg-white px-2 py-1 text-xs text-ink"
                      value={item.researcherAssessment ?? ""}
                      onChange={(event) => onAssess(
                        item.id,
                        event.target.value
                          ? event.target.value as "supports" | "contradicts" | "context" | "not relevant"
                          : undefined,
                      )}
                    >
                      <option value="">Unassessed</option>
                      <option value="supports">Supports thesis</option>
                      <option value="contradicts">Contradicts thesis</option>
                      <option value="context">Context only</option>
                      <option value="not relevant">Not relevant — excluded from checks</option>
                    </select>
                  </label>
                  <button className="text-xs underline text-muted" type="button" onClick={() => onRemove(item.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No evidence selected. Use “Add to brief” on a live result below.</p>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4" aria-live="polite">
        <h3 className="font-semibold">Selected-sample coverage</h3>
        {evidence.length ? (
          <>
            <p className="mt-2 text-sm leading-6 text-muted">
              {coverage.sourceLabels.length} source labels · {coverage.languages.length} languages · {coverage.evidenceClasses.length} evidence classes
              {` · ${coverage.knownOperatorLabels.length} reviewed source operators`}
              {coverage.earliest && coverage.latest
                ? ` · ${new Date(coverage.earliest).toLocaleDateString()}–${new Date(coverage.latest).toLocaleDateString()}`
                : " · publication dates unavailable"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {coverage.sourceLabels.join(" · ")} · {coverage.languages.join(" · ")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Researcher-assigned: {coverage.researcherAssessments.map(({ assessment, count }) => `${assessment} ${count}`).join(" · ") || "none"} · {coverage.unassessedCount} unassessed
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Discussion/Q&amp;A bylines: {coverage.conversationItemsWithByline}/{coverage.conversationItemCount} links carry a recognized display label · {coverage.distinctConversationBylineLabels} distinct labels · largest repeated label group {coverage.largestConversationBylineGroup}. Labels do not verify separate people.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Reviewed operators: {coverage.knownOperatorLabels.join(" · ") || "none"} · {coverage.unresolvedOperatorItemCount} item(s) with unresolved operator identity. A recognized operator is an audit aid, not proof of independent coverage.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Coverage appears here after you deliberately select source evidence.</p>
        )}
        <p className="mt-2 text-xs leading-5 text-muted">
          Descriptive inventory only: source labels, languages, and item counts do not establish independent ownership, representative reach, or a market-level signal.
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4" aria-live="polite">
        <div className="eyebrow">Evidence qualification</div>
        <h3 className="mt-2 font-semibold">{readiness.readyForHumanReview ? "Local review bar complete — lead dossier ready" : "Not yet ready for lead review"}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">The checklist records your source assessments, original-source attestations, and concentration in the selected conversation sample. It cannot independently verify what a source says or who an author is, prove representativeness or causation, or generate a lead automatically. A passing dossier can be deliberately submitted for server-side verification when sign-in and publication are configured.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {readiness.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-xs leading-5">
              <span aria-label={check.passed ? "Complete" : "Incomplete"} className="mono w-4 shrink-0 font-semibold">{check.passed ? "✓" : "—"}</span>
              <span><strong>{check.label}</strong><span className="block text-muted">{check.detail}</span></span>
            </li>
          ))}
        </ul>
      </div>

      {readiness.readyForHumanReview && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="eyebrow">Shared lead queue</div>
          <h3 className="mt-2 font-semibold">Publish this researcher-reviewed lead?</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Publishing shares your thesis, alternatives, disconfirmation test, source links, and source-specific notes with anyone using Signal Scout. It uses only current, rights-reviewed records stored in the product; visitor-triggered social results remain private to your local dossier. Your click is an explicit publication action. The result is a researcher-authored prompt, not an independently verified finding or investment recommendation.
          </p>
          {!hasPublishableStoredSources ? (
            <p className="mt-3 text-sm leading-6 text-muted">This checklist passes, but the selected citations are not all from the product’s stored, rights-reviewed source feed. Keep or export the local dossier; it cannot be published to the shared queue.</p>
          ) : !authAvailable ? (
            <p className="mt-3 text-sm leading-6 text-muted">Publishing is unavailable until the project owner enables account sign-in. Your local dossier remains usable and private.</p>
          ) : !saveEnabled ? (
            <a className="btn btn-primary mt-3" href="/login?next=%2Fexplore">Sign in to publish</a>
          ) : (
            <form action={publishEvidenceQualifiedLead} className="mt-3 max-w-2xl space-y-3">
              <input type="hidden" name="topic" value={topic} />
              <input type="hidden" name="working_thesis" value={workingThesis} />
              <input type="hidden" name="alternatives" value={alternatives} />
              <input type="hidden" name="disconfirming_evidence" value={disconfirmingEvidence} />
              <input type="hidden" name="reviewed_evidence" value={publicEvidencePacket} />
              <label className="flex items-start gap-2 text-xs leading-5 text-muted">
                <input className="mt-1 shrink-0" type="checkbox" name="publish_confirmation" value="yes" required />
                <span>I understand this publishes my thesis, notes, and approved citations to the shared public lead queue.</span>
              </label>
              <button className="btn btn-primary" type="submit">Publish to shared lead queue</button>
            </form>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" onClick={downloadBrief} disabled={!hasDraftContent}>{readiness.readyForHumanReview ? "Download lead dossier" : "Download research brief"}</button>
        <button className="btn" type="button" onClick={copyBrief} disabled={!hasDraftContent}>{readiness.readyForHumanReview ? "Copy lead dossier" : "Copy research brief"}</button>
        <button className="btn" type="button" onClick={clearDraft} disabled={!hasDraftContent}>Clear page draft</button>
      </div>
      <form action={saveResearchBrief} className="mt-5 border-t border-line pt-4">
        <input type="hidden" name="topic" value={topic} />
        <input type="hidden" name="working_thesis" value={workingThesis} />
        <input type="hidden" name="alternatives" value={alternatives} />
        <input type="hidden" name="disconfirming_evidence" value={disconfirmingEvidence} />
        <input type="hidden" name="evidence_links" value={JSON.stringify(privateLinks)} />
        <input type="hidden" name="selected_count" value={evidence.length} />
        <div className="flex flex-wrap items-center gap-3">
          {saveEnabled
            ? <button className="btn btn-primary" type="submit" disabled={!topic.trim()}>Save privately to my account</button>
            : authAvailable
              ? <a className="btn btn-primary" href="/login?next=%2Fbriefs">Sign in to save</a>
              : <span className="text-sm text-muted">Private saving is not enabled on this deployment.</span>}
          {authAvailable && <a className="text-sm underline underline-offset-2" href="/briefs">My saved briefs</a>}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          {authAvailable
            ? <>Saving sends this topic and your notes to Signal Scout and Supabase, plus link-only citations from approved sources. {privateLinks.length} citation(s) will be kept; {excludedCount} other selected item(s) will be omitted. Titles, excerpts, contributor names, social posts, and search queries are not saved. You must be signed in; saved briefs are private and not public leads.</>
            : <>Your draft is not sent to Signal Scout. Browser-local autosave is {localAutosaveStatus === "unavailable" ? "unavailable; download your draft before leaving this page." : localAutosaveStatus === "active" ? "active on this device; it is not synced and can be lost if browser data is cleared." : "being checked."} Account storage requires deployment authentication to be configured.</>}
        </p>
      </form>
      {notice && <p role="status" className="mt-3 text-xs text-muted">{notice}</p>}
    </section>
  );
}
