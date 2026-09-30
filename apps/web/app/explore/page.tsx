import Link from "next/link";
import TopicSearch from "./topic-search";

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
        <h1 className="text-4xl font-semibold tracking-tight">Search a topic in public discussion.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          Search the last 30 days of one Stack Exchange community at a time. This is expert Q&amp;A,
          not a representative social feed or a verified thesis lead. Use results as starting points
          and inspect the original discussion.
        </p>
        <TopicSearch />
        <aside className="mt-8 border-t border-line pt-5 text-xs leading-5 text-muted">
          The search runs directly in your browser against the Stack Exchange public API. Signal Scout
          does not receive or store your query or these results. Only items explicitly marked CC BY-SA
          4.0 are shown, with author, community, original question, and license attribution.{" "}
          <Link className="underline text-ink" href="/sources">Source details</Link> ·{" "}
          <Link className="underline text-ink" href="/privacy">Privacy</Link>
        </aside>
      </div>
    </main>
  );
}
