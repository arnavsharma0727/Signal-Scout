import Link from "next/link";
import ExploreWorkspace from "./explore-workspace";
import { authConfigured, authServerClient } from "../../lib/supabase-auth-server";

export const metadata = { title: "Explore live discussion | Signal Scout" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ save?: string }> }) {
  const { save } = await searchParams;
  const auth = authConfigured() ? await authServerClient() : null;
  const { data: { user } } = auth ? await auth.auth.getUser() : { data: { user: null } };
  return (
    <main className="shell min-h-screen py-12">
      <header className="flex items-center justify-between border-b border-line pb-6">
        <Link href="/" className="font-extrabold">SIGNAL SCOUT</Link>
        <Link href="/" className="text-sm text-muted">← Briefing</Link>
      </header>
      <div className="max-w-3xl">
        <div className="eyebrow mb-4 mt-12">Live source exploration</div>
        <h1 className="text-4xl font-semibold tracking-tight">Explore selected public discussions.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          Search global news, expert Q&amp;A, federated social and forum discussions, and encyclopedia article discussions. Each
          source has different coverage and rights; these samples are not representative public
          opinion or verified thesis leads. Inspect the linked original discussions.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          A topic opened from Lead review prefills phrase-based searches and the brief. The handoff stays
          in the URL fragment, which is not sent in the HTTP request; Mastodon searches require a hashtag.
        </p>
        {save === "invalid" && <p role="alert" className="mt-4 text-sm">The brief could not be saved. Check that the topic and notes are within the stated limits, then try again.</p>}
        {save === "limit" && <p role="alert" className="mt-4 text-sm">This account has reached the limit of 100 saved briefs.</p>}
        {save === "unavailable" && <p role="alert" className="mt-4 text-sm">Private saving is temporarily unavailable. Your in-page draft has not been saved.</p>}
        <ExploreWorkspace authAvailable={authConfigured()} saveEnabled={Boolean(user)} />
        <aside className="mt-8 border-t border-line pt-5 text-xs leading-5 text-muted">
          Searches run directly in your browser against the selected provider. Signal Scout’s server
          does not receive or store on-demand queries or results. Citations explicitly added to the
          brief stay in page memory unless you choose to save. Saving sends your notes and only
          link-only citations from the reviewed allowlist to your private account; titles, excerpts,
          contributor names, search queries, and links from other sources are omitted. Copies/downloads
          stay on your device. Stack Exchange results are limited to items
          explicitly marked CC BY-SA 4.0. Mastodon posts remain the authors’ content and are shown
          transiently with their original links; no blanket content license is implied. GDELT
          headlines are transient and linked to their publishers, with GDELT attribution. Wikimedia
          search results are transient snippets with links to the talk-page history for attribution.
          Lemmy searches show titles, author attribution, dates, communities, and original links only;
          post bodies are discarded. Wikinews returns only recent article titles and links after a
          live edition-license check; it is community reporting, not forum discussion. Instance
          views are incomplete and not country proxies.{" "}
          <Link className="underline text-ink" href="/sources">Source details</Link> ·{" "}
          <Link className="underline text-ink" href="/privacy">Privacy</Link>
        </aside>
      </div>
    </main>
  );
}
