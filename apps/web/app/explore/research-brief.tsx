"use client";

import { useMemo, useState } from "react";
import {
  createResearchBriefMarkdown,
  ResearchEvidence,
  ResearchEvidenceClass,
} from "../../lib/research-brief";

const EVIDENCE_CLASSES: ResearchEvidenceClass[] = [
  "expert Q&A",
  "social discussion",
  "news coverage",
  "editorial discussion",
];

export default function ResearchBrief({
  evidence,
  onRemove,
  onClear,
}: {
  evidence: ResearchEvidence[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [workingThesis, setWorkingThesis] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [disconfirmingEvidence, setDisconfirmingEvidence] = useState("");
  const [notice, setNotice] = useState("");
  const counts = useMemo(() => EVIDENCE_CLASSES.map((evidenceClass) => ({
    evidenceClass,
    count: evidence.filter((item) => item.evidenceClass === evidenceClass).length,
  })), [evidence]);
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
        Add source links deliberately, then write your own hypothesis, alternatives, and disconfirmation test. This draft exists only in this open page’s memory—no account, browser storage, or server save. Exporting or copying sends it only to your device or clipboard.
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
                <button className="shrink-0 text-xs underline text-muted" type="button" onClick={() => onRemove(item.id)}>Remove</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No evidence selected. Use “Add to brief” on a live result below.</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" onClick={downloadBrief} disabled={!evidence.length}>Download Markdown</button>
        <button className="btn" type="button" onClick={copyBrief} disabled={!evidence.length}>Copy Markdown</button>
        <button className="btn" type="button" onClick={clearDraft} disabled={!evidence.length && !topic && !workingThesis && !alternatives && !disconfirmingEvidence}>Clear page draft</button>
      </div>
      {notice && <p role="status" className="mt-3 text-xs text-muted">{notice}</p>}
    </section>
  );
}
