"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  GDELT_OUTLET_COUNTRIES,
  GDELT_OUTLET_LANGUAGES,
  GdeltOutletCountry,
  GdeltOutletLanguage,
  GdeltPublicArticle,
  searchGdeltNews,
} from "../../lib/gdelt-public";
import type { ResearchEvidence } from "../../lib/research-brief";

export default function GdeltSearch({
  initialTopic,
  onAdd,
  selectedIds,
}: {
  initialTopic: string;
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: ReadonlySet<string>;
}) {
  const [query, setQuery] = useState("");
  const [outletCountry, setOutletCountry] = useState<GdeltOutletCountry>("");
  const [outletLanguage, setOutletLanguage] = useState<GdeltOutletLanguage>("");
  const [articles, setArticles] = useState<GdeltPublicArticle[]>([]);
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
    setError("");
    setSearched(true);
    try {
      setArticles(await searchGdeltNews(query, fetch, Date.now(), outletCountry, outletLanguage));
    } catch (cause) {
      setArticles([]);
      setError(cause instanceof Error ? cause.message : "The global news index is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel mt-8 p-5 md:p-7">
      <div className="eyebrow">Global news index · GDELT</div>
      <h2 className="mt-2 text-xl font-semibold">Search recent international coverage</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Search GDELT’s multilingual news index for the last seven days, optionally narrowing by the
        publisher outlet’s country and original language. Country describes the outlet, not the
        audience or people discussing the topic. This is coverage discovery, not a complete news
        corpus, independent reporting count, or public-opinion measure. Your search is sent through
        Atlas’s first-party, no-store bridge to GDELT; neither the query nor results are saved
        by the app. GDELT may be slow or rate-limited.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="sr-only" htmlFor="gdelt-query">News search</label>
        <input
          id="gdelt-query"
          className="min-w-0 rounded border border-line bg-white px-3 py-2.5 outline-none focus:border-ink sm:col-span-2"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={3}
          maxLength={100}
          placeholder="e.g. semiconductor export controls"
          required
        />
        <label className="text-sm text-muted">
          Publisher outlet country
          <select className="mt-1 block w-full rounded border border-line bg-white px-3 py-2.5 text-ink" value={outletCountry} onChange={(event) => setOutletCountry(event.target.value as GdeltOutletCountry)}>
            {GDELT_OUTLET_COUNTRIES.map(({ value, label }) => <option key={value || "all"} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm text-muted">
          Original publication language
          <select className="mt-1 block w-full rounded border border-line bg-white px-3 py-2.5 text-ink" value={outletLanguage} onChange={(event) => setOutletLanguage(event.target.value as GdeltOutletLanguage)}>
            {GDELT_OUTLET_LANGUAGES.map(({ value, label }) => <option key={value || "all"} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="btn btn-primary justify-center sm:col-span-2" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search global news"}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm">{error}</p>}
      {!error && searched && !loading && articles.length === 0 && (
        <p className="mt-4 text-sm text-muted">No matching articles from the last seven days were returned.</p>
      )}
      {articles.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="mb-3 font-semibold">{articles.length} recent index results</h3>
          <ul className="divide-y divide-line">
            {articles.map((article) => (
              <li className="py-4 first:pt-0 last:pb-0" key={article.url + article.seenAt}>
                <a className="font-medium leading-6 underline decoration-line underline-offset-4" href={article.url} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
                <p className="mt-2 text-xs text-muted">
                  {article.domain} · {article.language} · source country: {article.sourceCountry}
                  {article.sourceOperatorLabel ? <> · reviewed publisher: {article.sourceOperatorLabel} (<a className="underline" href={article.sourceOperatorReferenceUrl} target="_blank" rel="noreferrer">publisher information</a>)</> : " · publisher operator not reviewed"}
                  {" · "}
                  <time dateTime={article.seenAt}>{new Date(article.seenAt).toLocaleString()}</time>
                </p>
                {(() => {
                  const id = `gdelt:${article.url}`;
                  return (
                    <button
                      className="mt-2 text-xs underline text-muted"
                      type="button"
                      disabled={selectedIds.has(id)}
                      onClick={() => onAdd({
                        id,
                        title: article.title,
                        url: article.url,
                        source: article.domain,
                        evidenceClass: "news coverage",
                        language: article.language,
                        timeLabel: "Indexed/seen",
                        timeValue: article.seenAt,
                        context: `Publisher country: ${article.sourceCountry} (outlet metadata, not audience geography)`,
                        attribution: "Headline belongs to publisher; indexed by GDELT",
                        attributionUrl: "https://www.gdeltproject.org/",
                        sourceOperatorKey: article.sourceOperatorKey,
                        sourceOperatorLabel: article.sourceOperatorLabel,
                      })}
                    >
                      {selectedIds.has(id) ? "Added to brief" : "Add to brief"}
                    </button>
                  );
                })()}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            {new Set(articles.map((article) => article.domain)).size} distinct publisher domains in this capped sample; only explicitly listed publishers receive a reviewed operator label, and this does not establish that two outlets independently reported the same claim. Indexed/discovered by GDELT; article links and headlines belong to their publishers.{" "}
            <a className="underline text-ink" href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer">GDELT Project</a>
          </p>
        </div>
      )}
    </section>
  );
}
