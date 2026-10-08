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
import { isPublishableResearcherLinkedCitation } from "../../lib/researcher-linked-source";
import { reviewedLinkSourceForUrl } from "../../lib/news-source-operators";

const EVIDENCE_CLASSES: ResearchEvidenceClass[] = [
  "expert Q&A",
  "social discussion",
  "news coverage",
  "editorial discussion",
  "expert analysis",
  "community forum",
  "official company disclosure",
  "survey research",
];

export default function ResearchBrief({
  evidence,
  initialTopic,
  authAvailable,
  saveEnabled,
  localStorageAvailable,
  leadStatus = "",
  onRemove,
  onAdd,
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
  onAdd: (item: ResearchEvidence) => void;
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
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDate, setLinkDate] = useState("");
  const [linkError, setLinkError] = useState("");
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
  const isStoredPublisherCitation = (id: string) =>
    /^publisher:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const externalPublicationEvidence = publicationEvidence.filter(isPublishableResearcherLinkedCitation);
  const hasPublishableSources = publicationEvidence.length >= 3 && publicationEvidence.every(({ id }) =>
    isStoredPublisherCitation(id) || externalPublicationEvidence.some((item) => item.id === id));
  const publicEvidencePacket = JSON.stringify(publicationEvidence.filter(({ id }) => isStoredPublisherCitation(id)).map((item) => ({
    documentId: item.id.slice("publisher:".length),
    assessment: item.researcherAssessment,
    sourceObservation: item.researcherNote,
    researcherVerifiedOriginal: item.researcherVerifiedOriginal === true,
  })));
  const externalEvidencePacket = JSON.stringify(externalPublicationEvidence.map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    timeValue: item.timeValue,
    language: item.language,
    attribution: item.attribution,
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
        ? "Lead dossier copied to clipboard. It has not been published or sent to Atlas."
        : "Research brief copied to clipboard. It has not been sent to Atlas.");
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
    anchor.download = `atlas-${readiness.readyForHumanReview ? "lead-dossier" : "brief"}${slug ? `-${slug}` : ""}.md`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(readiness.readyForHumanReview
      ? "Human-reviewed lead dossier downloaded to this device. It has not been published or sent to Atlas."
      : "Research brief downloaded to this device. It has not been sent to Atlas.");
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

  function addReviewedLink() {
    const source = reviewedLinkSourceForUrl(linkUrl.trim());
    let url: URL;
    try { url = new URL(linkUrl.trim()); } catch { setLinkError("Enter a valid HTTPS article link from a reviewed publisher or issuer."); return; }
    const published = Date.parse(`${linkDate}T12:00:00.000Z`);
    const age = Date.now() - published;
    if (!source || url.protocol !== "https:" || url.username || url.password || url.port ||
        url.search || url.hash || url.pathname.length < 2) {
      setLinkError("That link is not an allowlisted article URL. Use a clean, first-party article link without tracking parameters.");
      return;
    }
    if (!linkDate || !Number.isFinite(published) || age < -5 * 60_000 || age > 30 * 86400000) {
      setLinkError("Enter the original publication date; only items from the last 30 days can be added.");
      return;
    }
    const urlText = url.toString();
    const company = source.provider === "companylink";
    const survey = source.provider === "surveylink";
    onAdd({
      id: `${source.provider}:${urlText}`,
      title: company ? `Link-only company disclosure from ${source.label}`
        : survey ? `Link-only survey report from ${source.label}` : `Link-only report from ${source.label}`,
      url: urlText,
      source: source.label,
      evidenceClass: company ? "official company disclosure" : survey ? "survey research" : "news coverage",
      language: "not provided",
      timeLabel: "Publication date (researcher entered)",
      timeValue: new Date(published).toISOString(),
      context: company
        ? "Issuer statement; company claims are not independent verification"
        : survey
          ? "Survey report link only; headline, report content, and byline are not stored"
          : "First-party publisher link only; headline, article text, and byline are not stored",
      attribution: `Source: ${source.label}`,
      sourceOperatorKey: source.key,
      sourceOperatorLabel: source.label,
    });
    setLinkError("");
    setLinkUrl("");
    setLinkDate("");
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
        Add source links deliberately, mark each recent item as supporting, contradicting, context, or not relevant, then write your hypothesis, alternatives, and disconfirmation test. Unassessed or unrelated items cannot count toward the qualification checks. These are your judgments, not automated sentiment or verified facts. Citations and notes are autosaved only in this browser; they are sent to Atlas only if you explicitly save a private brief or publish a qualifying lead. Exporting or copying sends them only to your device or clipboard.
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
        <div className="max-w-3xl border-b border-line pb-5">
          <h3 className="font-semibold">Add a verified publisher link</h3>
          <p className="mt-1 text-xs leading-5 text-muted">For current reporting, survey research, or a reviewed issuer announcement missing from the feed. Only allowlisted first-party URLs qualify. Atlas stores the link, source label, and date you enter—not the headline, report/article body, or byline. Open the original yourself and document what it contributes below.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
            <label className="block text-xs font-medium text-muted">Clean article URL
              <input className="mt-1 block w-full rounded border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-ink" type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://publisher.example/article" />
            </label>
            <label className="block text-xs font-medium text-muted">Original publication date
              <input className="mt-1 block w-full rounded border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-ink" type="date" value={linkDate} onChange={(event) => setLinkDate(event.target.value)} />
            </label>
            <button className="btn" type="button" onClick={addReviewedLink}>Add link</button>
          </div>
          {linkError && <p className="mt-2 text-xs text-muted" role="alert">{linkError}</p>}
        </div>
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
              <li key={item.id} className="grid min-w-0 gap-3 py-4 md:grid-cols-[minmax(0,1fr)_15rem] md:items-start md:gap-6">
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
                <div className="flex min-w-0 flex-col items-start gap-2 md:items-end">
                  <label className="w-full text-xs text-muted md:text-right">
                    Relevance / thesis assessment
                    <select
                      className="mt-1 block w-full rounded border border-line bg-white px-2 py-2 text-xs text-ink"
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
                  <button className="text-xs underline text-muted md:self-end" type="button" onClick={() => onRemove(item.id)}>Remove</button>
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
            Publishing shares your thesis, alternatives, disconfirmation test, source links, public byline labels, and source-specific notes with anyone using Atlas. Bluesky, Mastodon, Lemmy, and added publisher/survey/issuer links are stored only as links plus minimal citation metadata; post text, headlines, report/article text, and bylines are not stored. A Stack Exchange question is rechecked at publication and is shared only when its current license is CC BY-SA 4.0, with its original title, author attribution/profile, and license; its body is not stored. These source records are public. The result is a researcher-reviewed prompt, not an independently verified finding or investment recommendation.
          </p>
          {!hasPublishableSources ? (
            <p className="mt-3 text-sm leading-6 text-muted">This checklist passes, but one or more citations is not an approved stored record or a supported public social permalink. Keep or export the local dossier; it cannot be published to the shared queue.</p>
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
              <input type="hidden" name="reviewed_external_evidence" value={externalEvidencePacket} />
              <label className="flex items-start gap-2 text-xs leading-5 text-muted">
                <input className="mt-1 shrink-0" type="checkbox" name="publish_confirmation" value="yes" required />
                <span>I understand this publishes my thesis, notes, source links, and public attribution labels to the shared lead queue. Social post text and added publisher headlines/report text are excluded; an eligible Stack Exchange question title and CC BY-SA attribution are public.</span>
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
            ? <>Saving sends this topic and your notes to Atlas and Supabase, plus link-only citations from approved sources. {privateLinks.length} citation(s) will be kept; {excludedCount} other selected item(s) will be omitted. Titles, excerpts, contributor names, social posts, and search queries are not saved. You must be signed in; saved briefs are private and not public leads.</>
            : <>Your draft is not sent to Atlas. Browser-local autosave is {localAutosaveStatus === "unavailable" ? "unavailable; download your draft before leaving this page." : localAutosaveStatus === "active" ? "active on this device; it is not synced and can be lost if browser data is cleared." : "being checked."} Account storage requires deployment authentication to be configured.</>}
        </p>
      </form>
      {notice && <p role="status" className="mt-3 text-xs text-muted">{notice}</p>}
    </section>
  );
}
