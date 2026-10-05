"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  DISCUSSION_COMMUNITIES,
} from "../../lib/live-topic-search";
import { WIKIMEDIA_TALK_WIKIS } from "../../lib/wikimedia-talk";
import { LEMMY_INSTANCES, LemmyInstance } from "../../lib/lemmy-public";
import { MASTODON_INSTANCES, MastodonInstance } from "../../lib/mastodon-public";
import {
  runResearchSweep,
  ResearchSweepSourceResult,
} from "../../lib/research-sweep";
import type { ResearchEvidence } from "../../lib/research-brief";

export default function ResearchSweep({
  initialTopic,
  onAdd,
  selectedIds,
  onSearchTopic,
}: {
  initialTopic: string;
  onAdd: (item: ResearchEvidence) => void;
  selectedIds: ReadonlySet<string>;
  onSearchTopic: (topic: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [gdelt, setGdelt] = useState(false);
  const [stackExchangeSites, setStackExchangeSites] = useState<string[]>([DISCUSSION_COMMUNITIES[0].site]);
  const [stackExchangeTerms, setStackExchangeTerms] = useState<Record<string, string>>({});
  const [lemmy, setLemmy] = useState(false);
  const [lemmyInstances, setLemmyInstances] = useState<LemmyInstance[]>([LEMMY_INSTANCES[0].host]);
  const [lemmyTermsAccepted, setLemmyTermsAccepted] = useState(false);
  const [mastodonEnabled, setMastodonEnabled] = useState(false);
  const [mastodonTermsAccepted, setMastodonTermsAccepted] = useState(false);
  const [bluesky, setBluesky] = useState(true);
  const [mastodonHashtag, setMastodonHashtag] = useState("");
  const [mastodonInstance, setMastodonInstance] = useState<MastodonInstance>("mastodon.social");
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
    onSearchTopic(query.trim());
    try {
      setResults(await runResearchSweep(query, {
        gdelt,
        stackExchangeQueries: stackExchangeSites.map((site) => ({
          site,
          query: stackExchangeTerms[site] ?? query,
        })),
        lemmy,
        lemmyInstances,
        lemmyTermsAccepted,
        mastodon: mastodonEnabled ? { hashtag: mastodonHashtag, instance: mastodonInstance } : undefined,
        mastodonTermsAccepted,
        bluesky,
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
        Searches go directly from this browser to public sources, except GDELT, which uses a first-party no-store bridge because its API blocks browser cross-origin calls. For Stack Exchange, enter an equivalent phrase separately for each language; Signal Scout does not auto-translate. Result sets keep their own window, query, count, and limitations—counts are not comparable audience measures and are never pooled or stored. Select citations one by one for your brief.
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
            <input className="mt-1" type="checkbox" checked={bluesky} onChange={(event) => setBluesky(event.target.checked)} />
            <span><strong>Bluesky public search</strong><span className="block text-xs text-muted">No account or API key · up to 25 newest indexed posts in 7 days · post text is not retained</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={gdelt} onChange={(event) => setGdelt(event.target.checked)} />
            <span><strong>GDELT news</strong><span className="block text-xs text-muted">Multilingual news index · optional · can be slow or rate-limited · up to 25 results</span></span>
          </label>
          <fieldset className="grid gap-2 border-y border-line py-3 text-sm leading-5">
            <legend className="font-medium">Stack Exchange · choose up to four communities</legend>
            <p className="text-xs text-muted">Title-only searches, last 30 days; only items marked CC BY-SA 4.0 are shown. Enter equivalent localized phrases yourself. This is expert Q&amp;A, not general forum conversation.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DISCUSSION_COMMUNITIES.map((community) => {
                const checked = stackExchangeSites.includes(community.site);
                return (
                  <div key={community.site} className="rounded border border-line p-2 text-xs">
                    <label className="flex items-start gap-2">
                      <input
                        className="mt-0.5"
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && stackExchangeSites.length >= 4}
                        onChange={(event) => setStackExchangeSites((current) => event.target.checked
                          ? [...current, community.site]
                          : current.filter((site) => site !== community.site))}
                      />
                      <span>{community.label} · {community.language}</span>
                    </label>
                    {checked && (
                      <label className="mt-2 block text-[11px] text-muted">
                        Search phrase to send to this community
                        <input
                          className="mt-1 block w-full rounded border border-line bg-white px-2 py-1.5"
                          value={stackExchangeTerms[community.site] ?? query}
                          onChange={(event) => setStackExchangeTerms((current) => ({ ...current, [community.site]: event.target.value }))}
                          minLength={3}
                          maxLength={80}
                          placeholder={`Search phrase in ${community.language}`}
                          aria-label={`Search phrase for ${community.label}`}
                          required
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={lemmy} onChange={(event) => { setLemmy(event.target.checked); setLemmyTermsAccepted(false); }} />
            <span><strong>Lemmy public forums</strong><span className="block text-xs text-muted">Select one or more separate server indexes · up to 20 newest posts each within 7 days · short text previews shown transiently</span></span>
          </label>
          {lemmy && (
            <fieldset className="ml-6 grid gap-2 text-xs">
              <legend className="sr-only">Lemmy instances to search</legend>
              {LEMMY_INSTANCES.map((instance) => (
                <label key={instance.host} className="flex items-start gap-2">
                  <input
                    className="mt-0.5"
                    type="checkbox"
                    checked={lemmyInstances.includes(instance.host)}
                    onChange={(event) => {
                      setLemmyInstances((current) => event.target.checked
                        ? [...current, instance.host]
                        : current.filter((host) => host !== instance.host));
                      setLemmyTermsAccepted(false);
                    }}
                  />
                  <span>
                    {instance.label}{" · "}
                    <a className="underline" href={instance.legalUrl} target="_blank" rel="noreferrer">legal information</a>
                    {" · "}
                    <a className="underline" href={instance.privacyUrl} target="_blank" rel="noreferrer">privacy</a>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={mastodonEnabled} onChange={(event) => { setMastodonEnabled(event.target.checked); setMastodonTermsAccepted(false); }} />
            <span className="min-w-0 flex-1">
              <strong>Mastodon public hashtag</strong><span className="block text-xs text-muted">One server’s up-to-20 newest public posts · hashtag search, not phrase search · short text previews shown transiently</span>
              <input
                className="mt-2 block w-full rounded border border-line bg-white px-2 py-1.5 text-xs text-ink"
                value={mastodonHashtag}
                onChange={(event) => setMastodonHashtag(event.target.value)}
                minLength={1}
                maxLength={50}
                placeholder="Hashtag (e.g. inflation)"
                aria-label="Mastodon hashtag"
                disabled={!mastodonEnabled}
                required={mastodonEnabled}
              />
              <select
                className="mt-2 block w-full rounded border border-line bg-white px-2 py-1.5 text-xs text-ink"
                value={mastodonInstance}
                onChange={(event) => { setMastodonInstance(event.target.value as MastodonInstance); setMastodonTermsAccepted(false); }}
                disabled={!mastodonEnabled}
                aria-label="Mastodon server"
              >
                {MASTODON_INSTANCES.map((server) => (
                  <option key={server.host} value={server.host}>{server.label}</option>
                ))}
              </select>
            </span>
          </label>
          {mastodonEnabled && (
            <label className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input className="mt-1" type="checkbox" checked={mastodonTermsAccepted} onChange={(event) => setMastodonTermsAccepted(event.target.checked)} required />
              <span>I reviewed the selected server’s rules and privacy information at <a className="underline" href={`https://${mastodonInstance}`} target="_blank" rel="noreferrer">{mastodonInstance}</a> and confirm I may access its public timeline. Signal Scout does not accept terms for me.</span>
            </label>
          )}
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
              I reviewed the legal/privacy links for each checked instance and affirm I meet its applicable age requirements before sending the search query.
            </span>
          </label>
        )}
        {mastodonEnabled && (
          <p className="text-xs leading-5 text-muted">
            Mastodon servers are not country proxies. Posts remain their authors’ content. Short plain-text previews are shown only in this browser for manual review; selecting a citation strips the post text. No post text is sent to Signal Scout or saved.
          </p>
        )}
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
          {loading ? "Searching selected sources…" : "Run source sweep"}
        </button>
      </form>
      <p className="mt-3 text-xs leading-5 text-muted">Public Bluesky, Mastodon, and Lemmy text appears transiently in this browser for manual review; selecting a citation strips the text, and only its link, attribution, date, and language can enter your brief. Searches and results are not sent to Signal Scout’s server or saved. These query-selected samples are incomplete and not representative. See <a className="underline" href="https://docs.bsky.app/docs/api/app-bsky-feed-search-posts" target="_blank" rel="noreferrer">Bluesky API documentation</a>.</p>
      {error && <p role="alert" className="mt-4 text-sm">{error}</p>}
      {searched && !loading && results.length > 0 && (
        <div className="mt-6 grid gap-6 border-t border-line pt-5 md:grid-cols-2">
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
                      {item.transientPreview && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6" lang={item.language === "not provided" ? undefined : item.language}>
                          {item.transientPreview}
                        </p>
                      )}
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
