"use client";

import { FormEvent, useEffect, useState } from "react";
import { searchWikimediaTalk, WikimediaTalkPage, WIKIMEDIA_TALK_WIKIS } from "../../lib/wikimedia-talk";
import type { ResearchEvidence } from "../../lib/research-brief";

function plainText(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return (parsed.body.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 360);
}

export default function WikimediaTalkSearch({
  initialTopic,
  onAdd,
  selectedIds,
}: {
  initialTopic: string;
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: ReadonlySet<string>;
}) {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("en");
  const [pages, setPages] = useState<WikimediaTalkPage[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      setPages(await searchWikimediaTalk(topic, language));
    } catch (cause) {
      setPages([]);
      setError(cause instanceof Error ? cause.message : "The selected wiki is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel mt-8 p-5 md:p-7">
      <div className="eyebrow">Live editorial discussion · Wikimedia talk pages</div>
      <h2 className="mt-2 text-xl font-semibold">Search article discussions</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Search one language edition for matching, non-archived talk pages edited in the last 90
        days. These are discussions about improving encyclopedia articles—not a general-purpose
        forum. The snippet may quote older text on a recently edited page; the date is the page’s
        latest edit, not a post count or proof of new discussion.
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        Requests follow the <a className="underline text-ink" href="https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy" target="_blank" rel="noreferrer">Wikimedia API access policy</a> and
        <a className="underline text-ink" href="https://foundation.wikimedia.org/wiki/Terms_of_Use?useformat=mobile" target="_blank" rel="noreferrer"> Wikimedia Terms of Use</a>.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block text-sm font-medium">
          Topic or phrase
          <input
            className="mt-2 block w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            minLength={2}
            maxLength={100}
            placeholder="e.g. inflation"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Language
          <select
            className="mt-2 block w-full rounded border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-ink"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {WIKIMEDIA_TALK_WIKIS.map((wiki) => (
              <option key={wiki.language} value={wiki.language}>{wiki.wiki} · {wiki.label}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search talk pages"}
        </button>
      </form>
      {error && <p role="alert" className="mt-5 border-t border-line pt-4 text-sm">{error}</p>}
      {!error && searched && !loading && pages.length === 0 && (
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          No matching talk pages edited in the past 90 days were returned. This does not mean the
          topic is absent from other discussions or sources.
        </p>
      )}
      {pages.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {pages.map((page) => (
            <li key={page.pageId} className="py-5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted">
                <span>{page.wiki}</span>
                <span>· {page.language}</span>
                <span>· latest page edit <time dateTime={page.lastEditedAt}>{new Date(page.lastEditedAt).toLocaleString()}</time></span>
              </div>
              <a className="mt-2 block font-medium underline decoration-line underline-offset-4" href={page.url} target="_blank" rel="noreferrer">
                {page.title}
              </a>
              <p className="mt-3 text-sm leading-6 text-muted">{plainText(page.snippetHtml)}</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <a className="underline text-ink" href={page.historyUrl} target="_blank" rel="noreferrer">Page history, contributors, and applicable license</a>
                <button
                  className="underline"
                  type="button"
                  disabled={selectedIds.has(`wikimedia:${page.url}`)}
                  onClick={() => onAdd({
                    id: `wikimedia:${page.url}`,
                    title: page.title,
                    url: page.url,
                    source: page.wiki,
                    evidenceClass: "editorial discussion",
                    language: page.language,
                    timeLabel: "Latest page edit (not necessarily the snippet date)",
                    timeValue: page.lastEditedAt,
                    attribution: "Check contributors and the applicable content license",
                    attributionUrl: page.historyUrl,
                    sourceOperatorKey: "wikimedia",
                    sourceOperatorLabel: "Wikimedia projects",
                  })}
                >
                  {selectedIds.has(`wikimedia:${page.url}`) ? "Added to brief" : "Add link to brief"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
