"use client";

import { FormEvent, useRef, useState } from "react";
import {
  comparePublicHashtag,
  compareTrendingHashtags,
  MASTODON_INSTANCES,
  MastodonInstance,
  MastodonSample,
  MastodonServerView,
  MastodonTrendView,
} from "../../lib/mastodon-public";
import type { ResearchEvidence } from "../../lib/research-brief";

function plainText(html: string) {
  const withBreaks = html.replace(/<\s*\/(p|div|li)\s*>/gi, "\n").replace(/<\s*br\s*\/?>/gi, "\n");
  const parsed = new DOMParser().parseFromString(withBreaks, "text/html");
  return (parsed.body.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export default function MastodonSearch({
  onAdd,
  selectedIds,
}: {
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: ReadonlySet<string>;
}) {
  const [tag, setTag] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const [instance, setInstance] = useState<MastodonInstance>("mastodon.social");
  const [compareServers, setCompareServers] = useState(false);
  const [views, setViews] = useState<MastodonServerView[]>([]);
  const [samples, setSamples] = useState<MastodonSample[]>([]);
  const [trendViews, setTrendViews] = useState<MastodonTrendView[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [error, setError] = useState("");
  const [trendError, setTrendError] = useState("");

  async function loadTrends() {
    if (loadingTrends) return;
    setLoadingTrends(true);
    setTrendError("");
    try {
      const result = await compareTrendingHashtags();
      setTrendViews(result);
      if (result.every((view) => view.error)) setTrendError("No selected instance made public trend suggestions available.");
    } catch (cause) {
      setTrendViews([]);
      setTrendError(cause instanceof Error ? cause.message : "Trend suggestions are temporarily unavailable.");
    } finally {
      setLoadingTrends(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const result = await comparePublicHashtag(
        tag,
        fetch,
        Date.now(),
        compareServers ? MASTODON_INSTANCES.map(({ host }) => host) : [instance],
      );
      setViews(result.views);
      setSamples(result.samples);
      if (result.views.every((view) => view.error)) {
        setError("Every selected server view was unavailable. No login or workaround is attempted.");
      }
    } catch (cause) {
      setViews([]);
      setSamples([]);
      setError(cause instanceof Error ? cause.message : "The public timeline is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel mt-8 p-5 md:p-7">
      <div className="eyebrow">Live public social posts · Mastodon federated view</div>
      <h2 className="mt-2 text-xl font-semibold">Explore a hashtag</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        One request returns up to 20 newest public posts known to the selected server for that hashtag.
        The fediverse has no complete global timeline; server, moderation, language, and hashtag choices
        shape what appears. Posts can overlap across servers and can include relays, RSS syndication, and
        automated accounts. Server choice is not a country proxy, and returned counts do not measure how
        many people discussed a topic.
      </p>
      <div className="mt-5 border-y border-line py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Discover hashtags trending on these servers</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
              One public request per server. Each instance selects its own trending tags from roughly the past week; these are topic prompts, not global or country-level popularity signals. Lists and tags can overlap, and are not combined or stored. Selecting a tag fills the search below.
            </p>
          </div>
          <button className="btn" type="button" onClick={loadTrends} disabled={loadingTrends}>
            {loadingTrends ? "Loading suggestions…" : "Load topic suggestions"}
          </button>
        </div>
        {trendError && <p role="alert" className="mt-3 text-sm">{trendError}</p>}
        {trendViews.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {trendViews.map((view) => (
              <section key={view.host} className="border-t border-line pt-3" aria-label={`Trending tags on ${view.host}`}>
                <h4 className="text-xs font-semibold">{view.host}</h4>
                {view.error ? (
                  <p className="mt-2 text-xs text-muted">Unavailable: {view.error}</p>
                ) : view.tags.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {view.tags.map((suggestion) => (
                      <li key={suggestion.name}>
                        <button
                          className="border border-line px-2 py-1 text-xs underline underline-offset-2 hover:border-ink"
                          type="button"
                          onClick={() => {
                            setTag(suggestion.name);
                            searchInput.current?.focus();
                          }}
                          aria-label={`Use hashtag ${suggestion.name} in the live post search`}
                        >
                          #{suggestion.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">No tags returned.</p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="mastodon-hashtag">Hashtag</label>
        <input
          id="mastodon-hashtag"
          ref={searchInput}
          className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-2.5 outline-none focus:border-ink"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          minLength={1}
          maxLength={50}
          placeholder="e.g. climate, economics, AI"
          required
        />
        <label className="sr-only" htmlFor="mastodon-instance">Mastodon server</label>
        {!compareServers && (
          <select
            id="mastodon-instance"
            className="rounded border border-line bg-white px-3 py-2.5 outline-none focus:border-ink"
            value={instance}
            onChange={(event) => setInstance(event.target.value as MastodonInstance)}
          >
            {MASTODON_INSTANCES.map((server) => <option key={server.host} value={server.host}>{server.label}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={compareServers} onChange={(event) => setCompareServers(event.target.checked)} />
          Compare four server views
        </label>
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
          {loading ? "Loading…" : compareServers ? "Compare samples" : "Load server sample"}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm">{error}</p>}
      {!error && searched && !loading && samples.length === 0 && (
        <p className="mt-4 text-sm text-muted">No public posts were returned for this hashtag.</p>
      )}
      {views.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {views.map((view) => (
            <span className="border border-line px-2 py-1 text-xs text-muted" key={view.host}>
              {view.host}: {view.error ? "unavailable" : `${view.returnedCount} posts returned`}
            </span>
          ))}
          {views.length > 1 && <span className="self-center text-xs text-muted">Counts can overlap; do not sum as conversation volume.</span>}
        </div>
      )}
      {samples.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {samples.map(({ post, seenVia }) => (
            <li key={post.id} className="py-5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted">
                <a className="font-medium text-ink underline" href={post.authorUrl} target="_blank" rel="noreferrer">
                  {post.authorName}
                </a>
                <span>@{post.authorHandle}</span>
                <span>· {post.originServer}</span>
                <span>· returned by {seenVia.join(", ")}</span>
                {post.accountMarkedAutomated && <span>· account marked automated</span>}
                <span>· {post.language ?? "language undeclared"}</span>
                <span>· <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time></span>
              </div>
              {post.contentWarning ? (
                <p className="mt-3 text-sm leading-6 text-muted">
                  Content warning: {post.contentWarning}.{" "}
                  <a className="underline text-ink" href={post.url} target="_blank" rel="noreferrer">Open original post</a>
                </p>
              ) : (
                <p className="mt-3 whitespace-pre-line text-sm leading-6">{plainText(post.contentHtml)}</p>
              )}
              <a className="mt-3 inline-block text-xs underline text-muted" href={post.url} target="_blank" rel="noreferrer">
                View original post on {post.originServer}
              </a>
              <button
                className="ml-4 text-xs underline text-muted"
                type="button"
                disabled={selectedIds.has(`mastodon:${post.url}`)}
                onClick={() => onAdd({
                  id: `mastodon:${post.url}`,
                  title: `Public Mastodon post by @${post.authorHandle}`,
                  url: post.url,
                  source: `Mastodon · ${post.originServer}`,
                  evidenceClass: "social discussion",
                  language: post.language ?? "Not declared",
                  timeLabel: "Posted",
                  timeValue: post.createdAt,
                  context: `Returned by ${seenVia.join(", ")} (server views may overlap)`,
                  attribution: "Author-owned content; no blanket license implied",
                  attributionUrl: post.authorUrl,
                })}
              >
                {selectedIds.has(`mastodon:${post.url}`) ? "Added to brief" : "Add link to brief"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
