"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  DISCUSSION_COMMUNITIES,
} from "../../lib/live-topic-search";
import { WIKIMEDIA_TALK_WIKIS } from "../../lib/wikimedia-talk";
import {
  runResearchSweep,
  ResearchSweepSourceResult,
} from "../../lib/research-sweep";
import type { ResearchEvidence } from "../../lib/research-brief";

export default function ResearchSweep({
  initialTopic,
  onAdd,
  selectedIds,
}: {
  initialTopic: string;
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: ReadonlySet<string>;
}) {
  const [query, setQuery] = useState("");
  const [gdelt, setGdelt] = useState(true);
  const [stackExchangeSite, setStackExchangeSite] = useState<string>(DISCUSSION_COMMUNITIES[0].site);
  const [lemmy, setLemmy] = useState(false);
  const [lemmyTermsAccepted, setLemmyTermsAccepted] = useState(false);
  const [wikimediaLanguage, setWikimediaLanguage] = useState("");
  const [results, setResults] = useState<ResearchSweepSourceResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialTopic) setQuery(initialTopic);
  }, [initialTopic]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      setResults(await runResearchSweep(query, {
        gdelt,
        stackExchangeSite,
        lemmy,
        lemmyTermsAccepted,
        wikimediaLanguage,
      }));
    } catch (cause) {
      setResults([]);
      setError(cause instanceof Error ? cause.message : "The selected sources could not be searched.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel mt-8 p-5 md:p-7" aria-labelledby="research-sweep-title">
      <div className="eyebrow">Live, browser-only source sweep</div>
      <h2 id="research-sweep-title" className="mt-2 text-xl font-semibold">Search one topic across selected sources</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        This sends your phrase directly from this browser to each selected public API. Each result set keeps its own window, count, and limitations; these are not comparable audience measures and are never pooled or stored by Signal Scout. Select citations one by one for your brief.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="block text-sm font-medium">
          Topic or phrase
          <input
            className="mt-2 block w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={2}
            maxLength={100}
            placeholder="e.g. semiconductor export controls"
            required
          />
        </label>
        <div className="grid gap-3 border-y border-line py-4 md:grid-cols-2">
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={gdelt} onChange={(event) => setGdelt(event.target.checked)} />
            <span><strong>GDELT news</strong><span className="block text-xs text-muted">Multilingual news index · last 7 days · up to 25 results</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={Boolean(stackExchangeSite)} onChange={(event) => setStackExchangeSite(event.target.checked ? DISCUSSION_COMMUNITIES[0].site : "")} />
            <span className="min-w-0 flex-1">
              <strong>Stack Exchange</strong><span className="block text-xs text-muted">One selected community · title search · CC BY-SA results only · last 30 days</span>
              <select
                className="mt-2 block w-full rounded border border-line bg-white px-2 py-1.5 text-xs text-ink"
                value={stackExchangeSite}
                onChange={(event) => setStackExchangeSite(event.target.value)}
                disabled={!stackExchangeSite}
                aria-label="Stack Exchange community"
              >
                <option value="">Choose community</option>
                {DISCUSSION_COMMUNITIES.map((community) => (
                  <option key={community.site} value={community.site}>{community.label} · {community.language}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={lemmy} onChange={(event) => setLemmy(event.target.checked)} />
            <span><strong>Lemmy · lemmy.world</strong><span className="block text-xs text-muted">Federated public forum index · up to 20 newest posts within 7 days</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={Boolean(wikimediaLanguage)} onChange={(event) => setWikimediaLanguage(event.target.checked ? WIKIMEDIA_TALK_WIKIS[0].language : "")} />
            <span className="min-w-0 flex-1">
              <strong>Wikimedia talk pages</strong><span className="block text-xs text-muted">Collaborative editorial discussion · up to 20 pages edited within 90 days</span>
              <select
                className="mt-2 block w-full rounded border border-line bg-white px-2 py-1.5 text-xs text-ink"
                value={wikimediaLanguage}
                onChange={(event) => setWikimediaLanguage(event.target.value)}
                disabled={!wikimediaLanguage}
                aria-label="Wikimedia language edition"
              >
                <option value="">Choose edition</option>
                {WIKIMEDIA_TALK_WIKIS.map((wiki) => (
                  <option key={wiki.language} value={wiki.language}>{wiki.wiki}</option>
                ))}
              </select>
            </span>
          </label>
        </div>
        {lemmy && (
          <label className="flex items-start gap-2 text-xs leading-5 text-muted">
            <input className="mt-1" type="checkbox" checked={lemmyTermsAccepted} onChange={(event) => setLemmyTermsAccepted(event.target.checked)} required />
            <span>
              I meet the applicable minimum age and agree to the{" "}
              <a className="underline text-ink" href="https://legal.lemmy.world/tos/" target="_blank" rel="noreferrer">lemmy.world terms</a>
              {" "}and{" "}
              <a className="underline text-ink" href="https://legal.lemmy.world/privacy-policy/" target="_blank" rel="noreferrer">privacy policy</a>
              {" "}before sending this search to that instance.
            </span>
          </label>
        )}
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
          {loading ? "Searching selected sources…" : "Run source sweep"}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm">{error}</p>}
      {searched && !loading && results.length > 0 && (
        <div className="mt-6 space-y-6 border-t border-line pt-5">
          {results.map((result) => (
            <section key={result.key} aria-label={result.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{result.label}</h3>
                <span className="text-xs text-muted">
                  {result.error ? "Unavailable" : `${result.evidence.length} returned`} · {result.window}
                </span>
              </div>
              {result.error ? (
                <p className="mt-2 text-sm text-muted">{result.error}</p>
              ) : result.evidence.length ? (
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {result.evidence.map((item) => (
                    <li key={item.id} className="py-3">
                      <a className="font-medium underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                      <p className="mt-1 text-xs text-muted">
                        {item.source} · {item.evidenceClass} · {item.language} · {item.timeLabel}: {new Date(item.timeValue).toLocaleString()}
                        {item.context ? ` · ${item.context}` : ""}
                      </p>
                      <button
                        className="mt-2 text-xs underline text-muted"
                        type="button"
                        disabled={selectedIds.has(item.id)}
                        onClick={() => onAdd(item)}
                      >
                        {selectedIds.has(item.id) ? "Added to brief" : "Add citation to brief"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No eligible results in this source’s selected query/window. This is not evidence that the topic is absent elsewhere.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
