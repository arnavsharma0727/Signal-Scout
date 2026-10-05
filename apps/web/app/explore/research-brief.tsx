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
import { saveResearchBrief } from "../briefs/actions";

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
  onRemove,
  onAssess,
  onClear,
}: {
  evidence: ResearchEvidence[];
  initialTopic: string;
  authAvailable: boolean;
  saveEnabled: boolean;
  onRemove: (id: string) => void;
  onAssess: (id: string, assessment: "supports" | "contradicts" | "context" | undefined) => void;
  onClear: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [workingThesis, setWorkingThesis] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [disconfirmingEvidence, setDisconfirmingEvidence] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);
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
  }))), [evidence]);
  const excludedCount = useMemo(() => countExcludedPrivateEvidence(evidence), [evidence]);
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
      setNotice("Brief copied to clipboard. It has not been sent to Signal Scout.");
    } catch {
      setNotice("Clipboard access was unavailable. Use Download Markdown instead.");
    }
  }

  function downloadBrief() {
    const blob = new Blob([markdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const slug = topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    anchor.download = `signal-scout-brief${slug ? `-${slug}` : ""}.md`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Markdown downloaded to this device. It has not been sent to Signal Scout.");
  }

  function clearDraft() {
    if (!window.confirm("Clear the selected evidence and all notebook notes from this page? This cannot be undone.")) return;
    onClear();
    setTopic("");
    setWorkingThesis("");
    setAlternatives("");
    setDisconfirmingEvidence("");
    setNotice("The in-memory brief was cleared.");
  }

  return (
    <section id="research-brief" className="panel mt-8 p-5 md:p-7" aria-labelledby="research-brief-title">
      <div className="eyebrow">Temporary, in-page workspace</div>
      <h2 id="research-brief-title" className="mt-2 text-xl font-semibold">Build a research brief</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Add source links deliberately, assign each item a supporting, contradicting, or contextual role yourself, then write your hypothesis, alternatives, and disconfirmation test. These are your assessments, not automated sentiment or verified facts. The draft stays in this page unless you explicitly save it below. Exporting or copying sends it only to your device or clipboard.
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
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <label className="text-xs text-muted">
                    Researcher assessment
                    <select
                      className="ml-2 rounded border border-line bg-white px-2 py-1 text-xs text-ink"
                      value={item.researcherAssessment ?? ""}
                      onChange={(event) => onAssess(
                        item.id,
                        event.target.value
                          ? event.target.value as "supports" | "contradicts" | "context"
                          : undefined,
                      )}
                    >
                      <option value="">Unassessed</option>
                      <option value="supports">Supports thesis</option>
                      <option value="contradicts">Contradicts thesis</option>
                      <option value="context">Context only</option>
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
        <h3 className="mt-2 font-semibold">{readiness.readyForHumanReview ? "Checklist met — ready for human review" : "Not yet ready for lead review"}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">This local checklist does not confirm a lead or validate that selected sources support the same claim. Inspect and judge each original source. Nothing is published to the public signal queue.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {readiness.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-xs leading-5">
              <span aria-label={check.passed ? "Complete" : "Incomplete"} className="mono w-4 shrink-0 font-semibold">{check.passed ? "✓" : "—"}</span>
              <span><strong>{check.label}</strong><span className="block text-muted">{check.detail}</span></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" onClick={downloadBrief} disabled={!evidence.length}>Download Markdown</button>
        <button className="btn" type="button" onClick={copyBrief} disabled={!evidence.length}>Copy Markdown</button>
        <button className="btn" type="button" onClick={clearDraft} disabled={!evidence.length && !topic && !workingThesis && !alternatives && !disconfirmingEvidence}>Clear page draft</button>
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
            : <>Your draft is not being sent or saved. Copy or download it to keep a local copy; page notes disappear when you leave or reload. Account storage requires deployment authentication to be configured.</>}
        </p>
      </form>
      {notice && <p role="status" className="mt-3 text-xs text-muted">{notice}</p>}
    </section>
  );
}
