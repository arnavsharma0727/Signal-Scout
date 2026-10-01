"use client";

import type { ResearchEvidence } from "../../lib/research-brief";

export default function LicensedPublisherEvidence({
  items,
  onAdd,
  selectedIds,
}: {
  items: ResearchEvidence[];
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: Set<string>;
}) {
  return (
    <section className="mt-8 border-t border-line pt-6" aria-labelledby="publisher-evidence-title">
      <div className="eyebrow">Recent international feeds · last 72 hours</div>
      <h2 id="publisher-evidence-title" className="mt-2 text-xl font-semibold">Reporting, expert analysis, and community topics</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        Publisher RSS/Atom items collected by the scheduled feed job. Only original titles, dates, links, and required attribution metadata are shown. These feeds have uneven language and geographic coverage; they do not measure audience attention. Each publisher is one source operator, regardless of how many editions appear.
      </p>
      {items.length ? (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {items.map(item => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <a className="font-medium underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {item.source} · {item.evidenceClass} · {item.language} · {new Date(item.timeValue).toLocaleString()}
                </p>
                <p className="text-xs leading-5 text-muted">
                  {item.attribution ? `By ${item.attribution} · ` : ""}{item.context} · operator: {item.sourceOperatorLabel}
                  {item.licenseName && item.licenseUrl ? <> · <a className="underline" href={item.licenseUrl} target="_blank" rel="noreferrer">{item.licenseName}</a></> : null}
                  {item.attributionUrl ? <> · <a className="underline" href={item.attributionUrl} target="_blank" rel="noreferrer">attribution policy</a></> : null}
                </p>
              </div>
              <button className="btn shrink-0" type="button" disabled={selectedIds.has(item.id)} onClick={() => onAdd(item)}>
                {selectedIds.has(item.id) ? "Added to brief" : "Add to brief"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-y border-line py-4 text-sm text-muted">No eligible feed items are currently stored from the last 72 hours. This may mean a feed was quiet, ingestion did not run, or the strict rights/attribution checks rejected its metadata; it does not mean there was no discussion.</p>
      )}
      <p className="mt-3 text-xs leading-5 text-muted">Titles are displayed unmodified with source links. Article bodies, summaries, media, and forum post text are not included in this brief feed.</p>
    </section>
  );
}
