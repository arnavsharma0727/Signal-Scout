"use client";

import { FormEvent, useState } from "react";
import { GdeltPublicArticle, searchGdeltNews } from "../../lib/gdelt-public";

export default function GdeltSearch() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<GdeltPublicArticle[]>([]);
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
      setArticles(await searchGdeltNews(query));
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
        Search GDELT’s multilingual news index for the last seven days. This is coverage discovery,
        not a complete news corpus, independent reporting count, or public-opinion measure. Results
        are fetched directly by your browser and are not stored by Signal Scout.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="gdelt-query">News search</label>
        <input
          id="gdelt-query"
          className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-2.5 outline-none focus:border-ink"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={3}
          maxLength={100}
          placeholder="e.g. semiconductor export controls"
          required
        />
        <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
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
                  {article.domain} · {article.language} · source country: {article.sourceCountry} ·{" "}
                  <time dateTime={article.seenAt}>{new Date(article.seenAt).toLocaleString()}</time>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Indexed/discovered by GDELT; article links and headlines belong to their publishers.{" "}
            <a className="underline text-ink" href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer">GDELT Project</a>
          </p>
        </div>
      )}
    </section>
  );
}
