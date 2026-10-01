import Link from "next/link";
import ExploreWorkspace from "./explore-workspace";

export const metadata = { title: "Explore live discussion | Signal Scout" };

export default function ExplorePage() {
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
          Search global news, expert Q&amp;A, a federated social feed, and encyclopedia article discussions. Each
          source has different coverage and rights; these samples are not representative public
          opinion or verified thesis leads. Inspect the linked original discussions.
        </p>
        <ExploreWorkspace />
        <aside className="mt-8 border-t border-line pt-5 text-xs leading-5 text-muted">
          Searches run directly in your browser against the selected provider. Signal Scout’s server
          does not receive or store on-demand queries or results. Citations explicitly added to the
          brief exist only in page memory until you leave or reload; no browser storage or server save
          is used. Copies/downloads stay on your device. Stack Exchange results are limited to items
          explicitly marked CC BY-SA 4.0. Mastodon posts remain the authors’ content and are shown
          transiently with their original links; no blanket content license is implied. GDELT
          headlines are transient and linked to their publishers, with GDELT attribution. Wikimedia
          search results are transient snippets with links to the talk-page history for attribution.{" "}
          <Link className="underline text-ink" href="/sources">Source details</Link> ·{" "}
          <Link className="underline text-ink" href="/privacy">Privacy</Link>
        </aside>
      </div>
    </main>
  );
}
