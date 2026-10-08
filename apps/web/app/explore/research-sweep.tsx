"use client";

import { FormEvent, useEffect, useState } from "react";
import { DISCUSSION_COMMUNITIES } from "../../lib/live-topic-search";
import { LEMMY_INSTANCES, type LemmyInstance } from "../../lib/lemmy-public";
import { runResearchSweep, ResearchSweepSourceResult } from "../../lib/research-sweep";
import { buildPerspectiveSnapshot } from "../../lib/perspective-snapshot";

const DEFAULT_COMMUNITIES = ["economics", "quant", "money"];

export default function ResearchSweep({
  initialTopic,
  onSearchTopic,
}: {
  initialTopic: string;
  onSearchTopic: (topic: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<string[]>(DEFAULT_COMMUNITIES);
  const [localizedQueries, setLocalizedQueries] = useState<Record<string, string>>({});
  const [lemmyEnabled, setLemmyEnabled] = useState(false);
  const [lemmyInstances, setLemmyInstances] = useState<LemmyInstance[]>([LEMMY_INSTANCES[0].host]);
  const [lemmyQueries, setLemmyQueries] = useState<Record<string, string>>({});
  const [lemmyTermsAccepted, setLemmyTermsAccepted] = useState(false);
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
    const topic = query.trim();
    setLoading(true);
    setSearched(true);
    setError("");
    onSearchTopic(topic);
    try {
      setResults(await runResearchSweep(topic, {
        hackerNews: true,
        globalVoices: true,
        bluesky: false,
        stackExchangeQueries: communities.map((site) => ({
          site,
          query: DISCUSSION_COMMUNITIES.find((community) => community.site === site)?.language === "English"
            ? topic
            : localizedQueries[site]?.trim() ?? "",
        })),
        lemmy: lemmyEnabled,
        lemmyInstances,
        lemmyQueries: lemmyEnabled ? lemmyInstances.map((host) => ({
          host,
          query: lemmyQueries[host]?.trim() || topic,
        })) : undefined,
        lemmyTermsAccepted,
      }));
    } catch (cause) {
      setResults([]);
      setError(cause instanceof Error ? cause.message : "The search could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`market-search ${searched ? "market-search--results" : "market-search--landing"}`} aria-label="Search global market conversations">
      {searched && <h1 id="search-title" className="sr-only">Search results for {query}</h1>}

      <form id="market-query-form" onSubmit={submit} className={`market-search-form ${searched ? "market-search-form--compact" : ""}`}>
        <label className="sr-only" htmlFor="market-query">Search a market interest</label>
        <input
          id="market-query"
          className="market-query-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={100}
          placeholder="Search a market, company, or idea"
          autoComplete="off"
          required
        />
        <button className="btn btn-primary market-search-button" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <p className="market-attribution">By: Arnav Sharma UVA30'</p>

      {searched && (
        <details className="search-refine">
          <summary>Refine community coverage</summary>
          <p>Choose up to four Stack Exchange communities. Enter a phrase in each selected language; the app does not silently translate or treat specialist Q&amp;A as public opinion.</p>
          <fieldset className="search-community-options">
            <legend>Expert communities · title search, latest 30 days</legend>
            {DISCUSSION_COMMUNITIES.map((community) => {
              const checked = communities.includes(community.site);
              return (
                <div className="search-community-option" key={community.site}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && communities.length >= 4}
                      onChange={(event) => setCommunities((current) => event.target.checked
                        ? [...current, community.site]
                        : current.filter((site) => site !== community.site))}
                    />
                    {community.label} <span>{community.language}</span>
                  </label>
                  {checked && community.language !== "English" && (
                    <input
                      className="search-localized-query"
                      aria-label={`Search phrase in ${community.language}`}
                      placeholder={`Phrase in ${community.language}`}
                      value={localizedQueries[community.site] ?? ""}
                      minLength={3}
                      maxLength={80}
                      required
                      onChange={(event) => setLocalizedQueries((current) => ({ ...current, [community.site]: event.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </fieldset>
          <fieldset className="search-lemmy-options">
            <legend>Public federated forums · Lemmy</legend>
            <p>Each selected instance is searched separately. Use a local-language phrase for a broader cross-language view; results can overlap across federated servers.</p>
            <label className="search-lemmy-toggle">
              <input type="checkbox" checked={lemmyEnabled} onChange={(event) => { setLemmyEnabled(event.target.checked); setLemmyTermsAccepted(false); }} />
              Include Lemmy public forum posts
            </label>
            {lemmyEnabled && <>
              <div className="search-lemmy-instances">
                {LEMMY_INSTANCES.map((instance) => (
                  <div className="search-lemmy-instance" key={instance.host}>
                    <label>
                      <input
                        type="checkbox"
                        checked={lemmyInstances.includes(instance.host)}
                        disabled={lemmyInstances.includes(instance.host) && lemmyInstances.length === 1 || !lemmyInstances.includes(instance.host) && lemmyInstances.length >= 4}
                        onChange={(event) => {
                          setLemmyInstances((current) => event.target.checked
                            ? [...current, instance.host]
                            : current.filter((host) => host !== instance.host));
                          setLemmyTermsAccepted(false);
                        }}
                      />
                      {instance.label}
                      <span>{instance.languages} · <a href={instance.legalUrl} target="_blank" rel="noreferrer">Terms</a> · <a href={instance.privacyUrl} target="_blank" rel="noreferrer">Privacy</a></span>
                    </label>
                    {lemmyInstances.includes(instance.host) && instance.languages !== "Mixed / English" && (
                      <input
                        className="search-localized-query"
                        aria-label={`Lemmy search phrase for ${instance.label}`}
                        placeholder={`Phrase for ${instance.languages} communities`}
                        value={lemmyQueries[instance.host] ?? ""}
                        minLength={2}
                        maxLength={100}
                        required
                        onChange={(event) => setLemmyQueries((current) => ({ ...current, [instance.host]: event.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <label className="search-lemmy-consent">
                <input form="market-query-form" type="checkbox" checked={lemmyTermsAccepted} onChange={(event) => setLemmyTermsAccepted(event.target.checked)} required />
                I reviewed each selected server’s terms and privacy information and meet its applicable age rules.
              </label>
            </>}
          </fieldset>
          <button className="search-refine-submit" type="submit" form="market-query-form">Apply and search</button>
        </details>
      )}

      {error && <p role="alert" className="search-error">{error}</p>}
      {searched && loading && <div className="search-loading" role="status"><span className="search-spinner" aria-hidden="true" /> Searching recent conversations for <strong>“{query}”</strong> across live sources…</div>}
      {searched && !loading && !error && (
        <div className="market-results">
          <div className="market-results-heading">
            <div>
              <p className="eyebrow">Search results</p>
              <h2>Recent perspectives on “{query}”</h2>
            </div>
            <p>Discussion, specialist Q&amp;A, and reporting · shown separately</p>
          </div>
          <PerspectiveSnapshot results={results} />
          <div className="market-results-grid">
            {results.map((result) => <SourceResults key={result.key} result={result} />)}
          </div>
          <p className="search-limits">These public results are incomplete source samples, not a poll or a measure of any country’s opinion. Open the original links for context. <a href="/sources">How sources work</a> · <a href="/privacy">Privacy</a>.</p>
        </div>
      )}
    </section>
  );
}

function PerspectiveSnapshot({ results }: { results: ResearchSweepSourceResult[] }) {
  const snapshot = buildPerspectiveSnapshot(results);
  return (
    <section className="perspective-snapshot" aria-labelledby="perspective-snapshot-title">
      <header>
        <div>
          <p className="eyebrow">Before the sources</p>
          <h3 id="perspective-snapshot-title">A quick read across perspectives</h3>
        </div>
        <p>Evidence-linked snapshots, not an AI-generated consensus.</p>
      </header>
      <p className="perspective-snapshot-note">
        The English-language slice is a comparison point, not a verified U.S. view: these sources do not establish contributors’ location. Other views stay separate by source and language rather than being blended into one “global” take.
      </p>
      <div className="perspective-snapshot-grid">
        <PerspectiveGroup title="English-language baseline · not a U.S. sample" items={snapshot.englishMarketAngle} empty="No matching English-language discussion surfaced in this search." />
        {snapshot.otherPerspectives.map((group) => (
          <PerspectiveGroup key={`${group.source}:${group.language}`} title={`${group.source} · ${group.language}`} items={group.items} />
        ))}
        {!snapshot.otherPerspectives.length && (
          <p className="perspective-no-global">No separate international-language perspectives matched this phrase. Try a local-language equivalent in Refine community coverage; an empty result is not evidence that a view is absent.</p>
        )}
      </div>
    </section>
  );
}

function PerspectiveGroup({ title, items, empty }: { title: string; items: Array<{ title: string; url: string; transientPreview?: string }>; empty?: string }) {
  return (
    <article className="perspective-card">
      <header><h4>{title}</h4><span>{items.length} {items.length === 1 ? "match" : "matches"}</span></header>
      {items.length ? (
        <ul>{items.slice(0, 2).map((item) => (
          <li key={item.url}>
            <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
            {item.transientPreview && <p>{compactPreview(item.transientPreview)}</p>}
          </li>
        ))}</ul>
      ) : <p className="perspective-empty">{empty}</p>}
    </article>
  );
}

function SourceResults({ result }: { result: ResearchSweepSourceResult }) {
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? result.evidence : result.evidence.slice(0, 8);
  return (
    <section className="source-results" aria-label={result.label}>
      <header>
        <h3>{result.label}</h3>
        <span className={result.error ? "source-count source-count--error" : "source-count"}>{result.error ? "Unavailable" : `${result.evidence.length} ${result.evidence.length === 1 ? "result" : "results"}`}</span>
      </header>
      <p className="source-window">{result.window}</p>
      {result.error ? (
        <p className="source-empty">This source is temporarily unavailable. Other sources can still return results.</p>
      ) : result.evidence.length ? (
        <>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
              {item.transientPreview && <p className="source-preview" lang={item.language === "not provided" ? undefined : item.language}>{compactPreview(item.transientPreview)}</p>}
              <p className="source-meta">
                {item.source} · {item.language} · {item.timeLabel.toLowerCase()} {new Date(item.timeValue).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        {result.evidence.length > items.length && (
          <button className="show-more-results" type="button" onClick={() => setShowAll(true)}>
            Show all {result.evidence.length} results
          </button>
        )}
        </>
      ) : (
        <div className="source-empty">
          <span className="source-empty-mark" aria-hidden="true">↗</span>
          <div><strong>No matches this time</strong><p>Try a broader or alternate phrase. For Stack Exchange, you can also change the selected communities above. No matches here doesn’t mean the topic is absent.</p></div>
        </div>
      )}
    </section>
  );
}

function compactPreview(value: string) {
  const limit = 420;
  if (value.length <= limit) return value;
  const boundary = value.lastIndexOf(" ", limit);
  return `${value.slice(0, boundary > 280 ? boundary : limit).trimEnd()}…`;
}
