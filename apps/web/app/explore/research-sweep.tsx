"use client";

import { FormEvent, useEffect, useState } from "react";
import { DISCUSSION_COMMUNITIES } from "../../lib/live-topic-search";
import { LEMMY_INSTANCES, type LemmyInstance } from "../../lib/lemmy-public";
import { runResearchSweep, ResearchSweepSourceResult } from "../../lib/research-sweep";

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
  const [lemmyEnabled, setLemmyEnabled] = useState(false);
  const [lemmyInstances, setLemmyInstances] = useState<LemmyInstance[]>([LEMMY_INSTANCES[0].host]);
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
        stackExchangeQueries: communities.map((site) => ({ site, query: topic })),
        lemmy: lemmyEnabled,
        lemmyInstances,
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
          placeholder="Search an industry, company, or market interest"
          autoComplete="off"
          required
        />
        <button className="btn btn-primary market-search-button" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {searched && (
        <details className="search-refine">
          <summary>Refine community coverage</summary>
          <p>Choose up to four Stack Exchange communities. Communities are separate specialist samples, not a measure of public opinion.</p>
          <fieldset className="search-community-options">
            <legend>Expert communities · title search, latest 30 days</legend>
            {DISCUSSION_COMMUNITIES.map((community) => {
              const checked = communities.includes(community.site);
              return (
                <label key={community.site}>
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
              );
            })}
          </fieldset>
          <fieldset className="search-lemmy-options">
            <legend>Public federated forums · Lemmy</legend>
            <label className="search-lemmy-toggle">
              <input type="checkbox" checked={lemmyEnabled} onChange={(event) => { setLemmyEnabled(event.target.checked); setLemmyTermsAccepted(false); }} />
              Include Lemmy public forum posts
            </label>
            {lemmyEnabled && <>
              <div className="search-lemmy-instances">
                {LEMMY_INSTANCES.map((instance) => (
                  <label key={instance.host}>
                    <input
                      type="checkbox"
                      checked={lemmyInstances.includes(instance.host)}
                      disabled={lemmyInstances.includes(instance.host) && lemmyInstances.length === 1}
                      onChange={(event) => {
                        setLemmyInstances((current) => event.target.checked
                          ? [...current, instance.host]
                          : current.filter((host) => host !== instance.host));
                        setLemmyTermsAccepted(false);
                      }}
                    />
                    {instance.label}
                    <span><a href={instance.legalUrl} target="_blank" rel="noreferrer">Terms</a> · <a href={instance.privacyUrl} target="_blank" rel="noreferrer">Privacy</a></span>
                  </label>
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
      {searched && loading && <p className="search-status" role="status">Searching live sources for “{query}”…</p>}
      {searched && !loading && !error && (
        <div className="market-results">
          <div className="market-results-heading">
            <div>
              <p className="eyebrow">Live results</p>
              <h2>What people are saying</h2>
            </div>
            <p>Separate source samples · not a measure of worldwide opinion</p>
          </div>
          <div className="market-results-grid">
            {results.map((result) => <SourceResults key={result.key} result={result} />)}
          </div>
          <p className="search-limits">These are public, provider-returned results—not a representative poll. A post’s language or publisher country does not verify where its author or audience lives. Open original sources to read context. <a href="/sources">Sources &amp; limitations</a> · <a href="/privacy">Privacy</a>.</p>
        </div>
      )}
    </section>
  );
}

function SourceResults({ result }: { result: ResearchSweepSourceResult }) {
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? result.evidence : result.evidence.slice(0, 8);
  return (
    <section className="source-results" aria-label={result.label}>
      <header>
        <h3>{result.label}</h3>
        <span>{result.error ? "Unavailable" : `${result.evidence.length} results`}</span>
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
              {item.transientPreview && <p className="source-preview" lang={item.language === "not provided" ? undefined : item.language}>{item.transientPreview}</p>}
              <p className="source-meta">
                {item.source} · {item.language} · {item.timeLabel.toLowerCase()} {new Date(item.timeValue).toLocaleString()}
                {item.context ? ` · ${item.context}` : ""}
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
        <p className="source-empty">No matching results returned. That does not mean the topic is absent from this community.</p>
      )}
    </section>
  );
}
