import Link from "next/link";
import SiteHeader from "../../components/site-header";

const sections = [
  {
    title: "Start with one question",
    body: "Search a concrete topic across selected public discussion and reporting sources. Each connector has its own query, language, date window, and result cap. Results are separate samples—not a census, market-wide measure, or proxy for a country. Enter equivalent phrases yourself; Atlas does not translate or infer stance.",
  },
  {
    title: "Check original evidence",
    body: "Open each cited source and record whether it supports, contradicts, or contextualizes your thesis. Add a source-specific note and attest that you checked the original, date, and context. Displayed bylines are labels, not verified identities; separate operators or labels do not prove independent people or perspectives.",
  },
  {
    title: "Qualify a research prompt",
    body: "A submission needs at least three current, eligible stored citations from two or more reviewed operators; conversation evidence plus reporting or expert analysis; at least two attributed conversation records without one byline label dominating the sample; supporting and contradicting evidence; a substantive alternative explanation; and a disconfirmation test. A passing checklist is a procedural floor, not proof that evidence is true, representative, independent, causal, or financially material.",
  },
  {
    title: "Publish only by choice",
    body: "If sign-in and the production schema are configured, the researcher can review an explicit disclosure and publish. The server reloads the cited source records, checks the source allowlist, rights metadata, freshness, attribution, and links, then activates the lead only after every citation is attached. The author can withdraw it later. Browser-only social search results cannot be promoted into the shared queue; they remain local to the researcher.",
  },
];

export default function Methodology() {
  return (
    <div className="min-h-screen">
      <SiteHeader action={<Link href="/">← Research desk</Link>} />
      <main className="shell max-w-5xl py-10 md:py-14">
        <header className="max-w-3xl">
          <div className="eyebrow">How review works</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            From conversation to a traceable research prompt
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Atlas helps a researcher find a discussion, inspect its sources,
            and document a tentative thesis alongside counter-evidence. It does not
            generate buy/sell calls or automatically declare a market signal.
          </p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map(({ title, body }, index) => (
            <section className="panel p-6 md:p-7" key={title}>
              <div className="eyebrow">Step {index + 1}</div>
              <h2 className="mt-2 text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 border-y border-line py-5">
          <h2 className="text-lg font-semibold">A small, selected sample stays a small, selected sample</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
            Source coverage depends on public access, operator terms, language,
            indexing, query choice, feed activity, and API limits. Counts describe
            records Atlas actually received; they do not estimate public
            opinion or investor attention. News, specialist Q&amp;A, and forums are
            different evidence classes and should not be pooled as if they had the
            same audience. No thesis should be treated as causal or actionable
            without outside verification.
          </p>
        </section>

        <p className="mt-6 text-sm text-muted">
          See the <Link className="underline underline-offset-4" href="/sources">source register</Link> for
          current connectors, licensing rules, and coverage limitations.
        </p>
      </main>
    </div>
  );
}
