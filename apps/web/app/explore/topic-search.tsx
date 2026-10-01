"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  DISCUSSION_COMMUNITIES,
  LiveDiscussionItem,
  searchLiveDiscussion,
} from "../../lib/live-topic-search";
import type { ResearchEvidence } from "../../lib/research-brief";

export default function TopicSearch({
  initialTopic,
  onAdd,
  selectedIds,
}: {
  initialTopic: string;
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: ReadonlySet<string>;
}) {
  const [topic, setTopic] = useState("");
  const [site, setSite] = useState<string>(DISCUSSION_COMMUNITIES[0].site);
  const [items, setItems] = useState<LiveDiscussionItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      setItems(await searchLiveDiscussion(topic, site));
    } catch (cause) {
      setItems([]);
      setError(cause instanceof Error ? cause.message : "The live source is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel mt-8 p-5 md:p-7">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block text-sm font-medium">
          Topic or phrase
          <input
            className="mt-2 block w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            minLength={3}
            maxLength={80}
            placeholder="e.g. housing affordability"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Community
          <select
            className="mt-2 block w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink"
            value={site}
            onChange={(event) => setSite(event.target.value)}
          >
            {DISCUSSION_COMMUNITIES.map((community) => (
              <option key={community.site} value={community.site}>
                {community.label} · {community.language}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search live"}
        </button>
      </form>

      {error && <p role="alert" className="mt-5 border-t border-line pt-4 text-sm">{error}</p>}
      {!error && searched && !loading && items.length === 0 && (
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          No recent items with verifiable CC BY-SA 4.0 attribution were returned for this query and community.
          That does not mean the topic is absent from wider conversation.
        </p>
      )}
      {items.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-semibold">{items.length} licensed questions returned</h2>
            <span className="text-xs text-muted">{items[0].community} · {items[0].language}</span>
          </div>
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <a
                  className="font-medium leading-6 underline decoration-line underline-offset-4"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.title}
                </a>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{item.community}</span>
                  <span>·</span>
                  <span>By <a className="underline" href={item.authorUrl} target="_blank" rel="noreferrer">{item.author}</a></span>
                  <span>·</span>
                  <a className="underline" href={item.licenseUrl} target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
                  <span>·</span>
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time>
                </div>
                {item.tags.length > 0 && (
                  <p className="mt-2 text-xs text-muted">Tags: {item.tags.join(" · ")}</p>
                )}
                <button
                  className="mt-2 text-xs underline text-muted"
                  type="button"
                  disabled={selectedIds.has(`stackexchange:${item.url}`)}
                  onClick={() => onAdd({
                    id: `stackexchange:${item.url}`,
                    title: item.title,
                    url: item.url,
                    source: item.community,
                    evidenceClass: "expert Q&A",
                    language: item.language,
                    timeLabel: "Published",
                    timeValue: item.createdAt,
                    attribution: `Author: ${item.author}`,
                    attributionUrl: item.authorUrl,
                    licenseName: "CC BY-SA 4.0",
                    licenseUrl: item.licenseUrl,
                  })}
                >
                  {selectedIds.has(`stackexchange:${item.url}`) ? "Added to brief" : "Add to brief"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
