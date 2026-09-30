"use client";

import { FormEvent, useState } from "react";
import { MASTODON_INSTANCES, MastodonInstance, MastodonPublicPost, searchPublicHashtag } from "../../lib/mastodon-public";

function plainText(html: string) {
  const withBreaks = html.replace(/<\s*\/(p|div|li)\s*>/gi, "\n").replace(/<\s*br\s*\/?>/gi, "\n");
  const parsed = new DOMParser().parseFromString(withBreaks, "text/html");
  return (parsed.body.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export default function MastodonSearch() {
  const [tag, setTag] = useState("");
  const [instance, setInstance] = useState<MastodonInstance>("mastodon.social");
  const [posts, setPosts] = useState<MastodonPublicPost[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      setPosts(await searchPublicHashtag(tag, fetch, Date.now(), instance));
    } catch (cause) {
      setPosts([]);
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
        automated accounts. Server choice is not a country proxy, and counts do not measure how many
        people discussed a topic.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="mastodon-hashtag">Hashtag</label>
        <input
          id="mastodon-hashtag"
          className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-2.5 outline-none focus:border-ink"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          minLength={1}
          maxLength={50}
          placeholder="e.g. climate, economics, AI"
          required
        />
        <label className="sr-only" htmlFor="mastodon-instance">Mastodon server</label>
        <select
          id="mastodon-instance"
          className="rounded border border-line bg-white px-3 py-2.5 outline-none focus:border-ink"
          value={instance}
          onChange={(event) => setInstance(event.target.value as MastodonInstance)}
        >
          {MASTODON_INSTANCES.map((server) => <option key={server.host} value={server.host}>{server.label}</option>)}
        </select>
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
          {loading ? "Loading…" : "Load server sample"}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm">{error}</p>}
      {!error && searched && !loading && posts.length === 0 && (
        <p className="mt-4 text-sm text-muted">No public posts were returned for this hashtag.</p>
      )}
      {posts.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {posts.map((post) => (
            <li key={post.id} className="py-5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted">
                <a className="font-medium text-ink underline" href={post.authorUrl} target="_blank" rel="noreferrer">
                  {post.authorName}
                </a>
                <span>@{post.authorHandle}</span>
                <span>· {post.originServer}</span>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
