"use client";

import { FormEvent, useState } from "react";
import { compareLemmyInstances, LemmyView } from "../../lib/lemmy-public";
import type { ResearchEvidence } from "../../lib/research-brief";

export default function LemmySearch({
  onAdd,
  selectedIds,
}: {
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: ReadonlySet<string>;
}) {
  const [query, setQuery] = useState("");
  const [views, setViews] = useState<LemmyView[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsConfirmed, setTermsConfirmed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const next = await compareLemmyInstances(query);
      setViews(next);
      if (next.every(({ error: issue }) => issue)) setError("All selected Lemmy instances were unavailable.");
    } catch (cause) {
      setViews([]);
      setError(cause instanceof Error ? cause.message : "Public forum search is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  const totalReturned = views.reduce((count, view) => count + view.returnedCount, 0);
  const seenUrls = new Set<string>();

  return (
    <section className="panel mt-8 p-5 md:p-7">
      <div className="eyebrow">Live public forum search · Lemmy federation</div>
      <h2 className="mt-2 text-xl font-semibold">Search community discussions</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Search up to 20 newest matching posts returned by lemmy.world’s public federated index. This is one incomplete
        server view, not a global timeline or a country-level sample. Returned counts are not measures of attention.
        Bot-marked, NSFW, removed, and stale results are filtered. Titles and author attribution are shown transiently;
        post bodies are discarded from the app’s result model and are never stored or added to the research brief.
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        Search runs from your browser without login. lemmy.world receives the query and your network request.
        Review the <a className="underline text-ink" href="https://join-lemmy.org/docs/contributors/04-api.html" target="_blank" rel="noreferrer">Lemmy API documentation</a>,
        <a className="underline text-ink" href="https://legal.lemmy.world/tos/" target="_blank" rel="noreferrer"> lemmy.world terms</a>.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="lemmy-query">Search phrase</label>
        <input
          id="lemmy-query"
          className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-2.5 outline-none focus:border-ink"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={100}
          placeholder="e.g. inflation, central bank, supply chain"
          required
        />
        <label className="flex items-center gap-2 text-xs leading-5 text-muted sm:max-w-xs">
          <input
            type="checkbox"
            checked={termsConfirmed}
            onChange={(event) => setTermsConfirmed(event.target.checked)}
            required
          />
          I am at least 18 (or the higher local minimum age) and agree to the linked terms before searching.
        </label>
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
          {loading ? "Searching instances…" : "Search Lemmy"}
        </button>
      </form>
      {error && <p role="alert" className="mt-5 border-t border-line pt-4 text-sm">{error}</p>}
      {searched && !loading && !error && totalReturned === 0 && (
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          No matching recent posts were returned from these instances. This does not indicate that the topic is absent elsewhere.
        </p>
      )}
      {views.length > 0 && (
        <div className="mt-6 space-y-6 border-t border-line pt-5">
          {views.map((view) => (
            <section key={view.host} aria-label={`Search results from ${view.host}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">{view.host}</h3>
                <span className="text-xs text-muted">
                  {view.error ? `Unavailable: ${view.error}` : `${view.returnedCount} returned · one server view`}
                </span>
              </div>
              {!view.error && view.posts.length > 0 && (
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {view.posts.map((post) => {
                    const alreadySeen = seenUrls.has(post.url);
                    seenUrls.add(post.url);
                    return (
                      <li key={`${view.host}:${post.id}`} className="py-4">
                        <a className="font-medium underline decoration-line underline-offset-4" href={post.url} target="_blank" rel="noreferrer">
                          {post.title}
                        </a>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                          <span>c/{post.community}</span>
                          <span>
                            <a className="underline text-ink" href={post.authorUrl ?? post.url} target="_blank" rel="noreferrer">{post.author}</a>
                          </span>
                          <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleString()}</time>
                          {alreadySeen && <span>also returned by another selected instance</span>}
                          <button
                            className="underline text-ink"
                            type="button"
                            disabled={selectedIds.has(`lemmy:${post.url}`)}
                            onClick={() => onAdd({
                              id: `lemmy:${post.url}`,
                              title: post.title,
                              url: post.url,
                              source: `Lemmy · ${view.host} / c/${post.community}`,
                              evidenceClass: "social discussion",
                              language: post.languageId === null ? "not provided" : `Lemmy language id ${post.languageId}`,
                              timeLabel: "Published",
                              timeValue: post.publishedAt,
                              attribution: `Lemmy author: ${post.author}`,
                              attributionUrl: post.authorUrl ?? post.url,
                            })}
                          >
                            Add citation to brief
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
