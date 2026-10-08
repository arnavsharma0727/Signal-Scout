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
import { groupRepeatedPostText, hasSelectedRepeatedTextMember, summarizeConversationBylines, summarizeRepeatedPostText, type ResearchEvidence } from "../../lib/research-brief";

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
  const [gdelt, setGdelt] = useState(true);
  const [stackExchangeSites, setStackExchangeSites] = useState<string[]>([]);
  const [stackExchangeTerms, setStackExchangeTerms] = useState<Record<string, string>>({});
  const [lemmy, setLemmy] = useState(false);
  const [lemmyInstances, setLemmyInstances] = useState<LemmyInstance[]>([LEMMY_INSTANCES[0].host]);
  const [lemmyTermsAccepted, setLemmyTermsAccepted] = useState(false);
  const [mastodonEnabled, setMastodonEnabled] = useState(false);
  const [mastodonTermsAccepted, setMastodonTermsAccepted] = useState(false);
  const [bluesky, setBluesky] = useState(true);
  const [blueskyVariant, setBlueskyVariant] = useState("");
  const [mastodonHashtag, setMastodonHashtag] = useState("");
  const [mastodonInstance, setMastodonInstance] = useState<MastodonInstance>("mastodon.social");
  const [wikimediaLanguage, setWikimediaLanguage] = useState("");
  const [results, setResults] = useState<ResearchSweepSourceResult[]>([]);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(() => new Set());
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
    setExpandedSources(new Set());
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
        blueskyQueries: bluesky ? [query, ...(blueskyVariant.trim() ? [blueskyVariant.trim()] : [])] : [],
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
    <section className={`market-search ${searched ? "market-search--results" : "market-search--landing"}`} aria-labelledby="research-sweep-title">
      {!searched && <div className="market-search-copy">
        <div className="eyebrow">Signal Scout · global market conversations</div>
        <h1 id="research-sweep-title">What are people saying<br className="hidden sm:block" /> about your market?</h1>
        <p>Search current public conversation and reporting across sources. Follow the original evidence.</p>
      </div>}
      {searched && <h1 id="research-sweep-title" className="sr-only">Live market search results for {query}</h1>}
      <form onSubmit={submit} className={`market-search-form ${searched ? "market-search-form--compact" : ""}`}>
        <label className="sr-only" htmlFor="market-query">Search a market, industry, or topic</label>
        <input
          id="market-query"
          className="market-query-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={100}
          placeholder="Search any market, industry, or topic…"
          required
        />
        <button className="btn btn-primary market-search-button" type="submit" disabled={loading}>
          {loading ? "Searching live sources…" : "Search"}
        </button>
      </form>
      {!searched && <p className="market-search-note">Live API results · Bluesky conversation + global news index · last 7 days</p>}
      {searched && <form onSubmit={submit} className="source-options-form">
      <details className="source-options">
        <summary>Search options · add forums, expert Q&amp;A, or another language</summary>
        <p className="source-options-note">Searches are source-specific. Add an exact phrase in another language yourself; results remain separate and are not translated or pooled.</p>
        <div className="grid gap-3 border-y border-line py-4 md:grid-cols-2">
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={bluesky} onChange={(event) => setBluesky(event.target.checked)} />
            <span><strong>Bluesky public search</strong><span className="block text-xs text-muted">No account or API key · up to 25 newest indexed posts per phrase in 7 days · post text is not retained</span></span>
          </label>
          {bluesky && (
            <label className="ml-6 block text-xs text-muted">
              Equivalent phrase in another language (optional; enter it yourself)
              <input
                className="mt-1 block w-full rounded border border-line bg-white px-2 py-1.5 text-xs text-ink"
                value={blueskyVariant}
                onChange={(event) => setBlueskyVariant(event.target.value)}
                minLength={2}
                maxLength={100}
                placeholder="e.g. AI 데이터센터 전력"
              />
            </label>
          )}
          <label className="flex items-start gap-2 text-sm leading-6">
            <input className="mt-1" type="checkbox" checked={gdelt} onChange={(event) => setGdelt(event.target.checked)} />
            <span><strong>GDELT news</strong><span className="block text-xs text-muted">Multilingual news index · up to 25 results · may rate-limit</span></span>
          </label>
          <details className="md:col-span-2 rounded border border-line px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Add specialist sources · Q&amp;A, forums, and editorial pages</summary>
            <div className="mt-4 grid gap-4 border-t border-line pt-4">
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
          </details>
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
      </details>
      <button className="btn market-options-submit" type="submit" disabled={loading}>
        {loading ? "Searching…" : "Apply sources & search again"}
      </button>
      </form>}
      {searched && <p className="mt-3 text-xs leading-5 text-muted">Live searches are bounded and query-selected; post text appears only transiently in this browser and is not saved. Publisher/operator labels do not prove audience geography or independent coverage. See <a className="underline" href="https://docs.bsky.app/docs/api/app-bsky-feed-search-posts" target="_blank" rel="noreferrer">Bluesky API documentation</a>.</p>}
      {error && <p role="alert" className="mt-4 text-sm">{error}</p>}
      {searched && !loading && results.length > 0 && (
        <div className="market-results mt-8 border-t border-line pt-7">
          <div className="market-results-heading">
            <div><div className="eyebrow">Live source results</div><h2>Global views &amp; reporting</h2></div>
            <p>Separate source samples · not a measure of worldwide opinion</p>
          </div>
          <div className="mt-5 grid gap-7 border-t border-line pt-5 md:grid-cols-2">
          {results.map((result) => {
            const groups = groupRepeatedPostText(result.evidence);
            const expanded = expandedSources.has(result.key);
            const visibleGroups = expanded ? groups : groups.slice(0, 5);
            return <section key={result.key} aria-label={result.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{result.label}</h3>
                <span className="text-xs text-muted">
                  {result.error ? "Unavailable" : `${result.evidence.length} returned`} · {result.window}
                </span>
              </div>
              {result.error ? (
                <p className="mt-2 text-sm text-muted">{result.error}</p>
              ) : result.evidence.length ? (
                <>
                {(() => {
                  const bylines = summarizeConversationBylines(result.evidence);
                  const repeatedText = summarizeRepeatedPostText(result.evidence);
                  return <>
                    {bylines.itemCount > 0 && (
                      <p className="mt-2 text-xs leading-5 text-muted">
                        {bylines.attributedItemCount}/{bylines.itemCount} discussion/Q&amp;A links show a byline · {bylines.distinctBylineLabels} distinct labels · largest repeated label group {bylines.largestBylineGroup}. Labels do not verify separate people.
                      </p>
                    )}
                    {repeatedText.previewItemCount > 0 && (
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Same normalized post text (URLs omitted): {repeatedText.repeatedItemCount}/{repeatedText.previewItemCount} previews in repeat groups · largest group {repeatedText.largestRepeatedGroup}. Compared in-browser only; post text is not retained in the brief.
                      </p>
                    )}
                  </>;
                })()}
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {visibleGroups.map((group) => group.length === 1 ? (
                    <li key={group[0].id} className="py-3">
                      <a className="font-medium underline underline-offset-2" href={group[0].url} target="_blank" rel="noreferrer">{group[0].title}</a>
                      {group[0].transientPreview && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6" lang={group[0].language === "not provided" ? undefined : group[0].language}>
                          {group[0].transientPreview}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        {group[0].source} · {group[0].evidenceClass} · {group[0].language} · {group[0].timeLabel}: {new Date(group[0].timeValue).toLocaleString()}
                        {group[0].context ? ` · ${group[0].context}` : ""}
                      </p>
                      <button
                        className="mt-2 text-xs underline text-muted"
                        type="button"
                        disabled={selectedIds.has(group[0].id)}
                        onClick={() => onAdd(group[0])}
                      >
                        {selectedIds.has(group[0].id) ? "Added to brief" : "Add citation to brief"}
                      </button>
                    </li>
                  ) : (
                    <li key={group[0].id} className="py-3">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium">Same normalized post text · {group.length} posts · inspect each original</summary>
                        <p className="mt-2 text-xs leading-5 text-muted">Posts with the same normalized text count as one conversation item in the brief. Select at most one original link from this group; inspect the source before citing it.</p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6" lang={group[0].language === "not provided" ? undefined : group[0].language}>{group[0].transientPreview}</p>
                        <ul className="mt-2 divide-y divide-line border-t border-line">
                          {group.map((item) => (
                            <li key={item.id} className="py-3">
                              <a className="font-medium underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                              <p className="mt-1 text-xs text-muted">
                                {item.attribution ?? item.source} · {item.language} · {item.timeLabel}: {new Date(item.timeValue).toLocaleString()}
                              </p>
                              <button className="mt-2 text-xs underline text-muted" type="button" disabled={selectedIds.has(item.id) || hasSelectedRepeatedTextMember(group, selectedIds)} onClick={() => onAdd(item)}>
                                {selectedIds.has(item.id) ? "Added to brief" : hasSelectedRepeatedTextMember(group, selectedIds) ? "Repeated text already represented" : "Add citation to brief"}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
                {groups.length > 5 && (
                  <button
                    className="mt-3 text-xs font-medium underline underline-offset-2"
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedSources((current) => {
                      const next = new Set(current);
                      if (next.has(result.key)) next.delete(result.key);
                      else next.add(result.key);
                      return next;
                    })}
                  >
                    {expanded ? "Show fewer results" : `Show all ${result.evidence.length} results`}
                  </button>
                )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">No eligible results in this source’s selected query/window. This is not evidence that the topic is absent elsewhere.</p>
              )}
            </section>;
          })}
          </div>
        </div>
      )}
    </section>
  );
}
