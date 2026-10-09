import Link from "next/link";
import SiteHeader from "../../components/site-header";

const sections = [
  {
    title: "Search is a discovery step, not a poll",
    body: "Atlas sends a topic to a small set of public search providers and returns records that match their indexes. Each provider has its own coverage, ranking, language, and time window. Search counts describe returned records only; they do not measure how many people hold a view or how much attention a market is receiving.",
  },
  {
    title: "Keep evidence types separate",
    body: "Forum discussion, specialist Q&A, and community reporting answer different questions and attract different participants. Atlas presents them as separate source groups. A reporting headline is not a forum opinion, and a Stack Exchange answer is not a representative investor view.",
  },
  {
    title: "Read the original before drawing a conclusion",
    body: "Overview cards show short source excerpts or headlines, not a generated account of what a country thinks. Citation labels map to the source list below; open the original record to inspect its date, context, author attribution, and surrounding discussion. A displayed name or community label is not identity verification or proof of location.",
  },
  {
    title: "Compare like with like",
    body: "For a useful cross-region comparison, enter equivalent phrases and relevant local-language terms in the optional alternate-phrase field, then compare the same source type and time period. Atlas submits those phrases separately and labels each one; it does not invent aliases or silently translate a query. Language, publication edition, hosting country, and community are not reliable substitutes for a contributor's location.",
  },
];

export default function Methodology() {
  return (
    <div className="min-h-screen">
      <SiteHeader action={<Link href="/">← Search Atlas</Link>} />
      <main className="shell max-w-5xl py-10 md:py-14">
        <header className="max-w-3xl">
          <div className="eyebrow">Methodology</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            What a search result can—and cannot—tell you
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Atlas is a discovery tool for finding public conversations and
            reporting about a market topic across selected communities. It is
            not a census, sentiment index, investment recommendation, or
            automated thesis generator.
          </p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map(({ title, body }, index) => (
            <section className="panel p-6 md:p-7" key={title}>
              <div className="eyebrow">{String(index + 1).padStart(2, "0")}</div>
              <h2 className="mt-2 text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 border-y border-line py-5">
          <h2 className="text-lg font-semibold">Coverage is incomplete by design</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
            Results depend on public access, provider indexing, query wording,
            source activity, language, API limits, and the date window shown in
            each source group. Missing results do not establish that a topic is
            absent from a community. Search providers may rank, omit, or remove
            records, and independent-looking results may repeat the same
            underlying claim.
          </p>
        </section>

        <p className="mt-6 text-sm text-muted">
          See the <Link className="underline underline-offset-4" href="/sources">source register</Link> for
          current connectors and their specific limits.
        </p>
      </main>
    </div>
  );
}
