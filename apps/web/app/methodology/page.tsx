import Link from "next/link";
import { METHODOLOGY } from "../../lib/methodology-config";

const sections = [
  {
    title: "What is live",
    body: "Signal Scout is currently an international evidence-collection and review prototype. It displays eligible collected source items and descriptive exact-tag observations when available. It does not currently calculate validated topic trends, classify stance, rank evidence-qualified live leads, or produce investment conclusions. No Korean investor-discussion feed is configured.",
  },
  {
    title: "Collection and sampling limits",
    body: "Feeds are selected and incomplete. Platform audiences, language, query terms, syndication, and publication times can bias what appears. A displayed count is a count of collected records, not a measure of what a market or population believes. News and public discussion are separate source classes and must not be pooled.",
  },
  {
    title: "Daily descriptive metrics",
    body: `A metric is labeled descriptive only after at least ${METHODOLOGY.dailyMetrics.minimumUniqueHashesForDescriptiveOnly} unique content hashes and ${METHODOLOGY.dailyMetrics.minimumIndependentDomainsForDescriptiveOnly} independent domains in the entity/market/source-class/day group. A trailing baseline remains null until ${METHODOLOGY.dailyMetrics.minimumPriorObservedDaysForBaseline} prior observed days exist, within a ${METHODOLOGY.dailyMetrics.baselineWindowDays}-day window. These are implementation thresholds, not validation of representativeness or statistical significance. Topic and stance values remain null until a validated classification process exists.`,
  },
  {
    title: "Dormant comparative research parameters",
    body: "The codebase contains helper functions and versioned parameters for a possible future comparative workflow. They are not currently run to publish comparisons or qualified leads. Minimum local evidence alone cannot establish a cross-source difference; matched windows and source classes, adequate evidence on each side, deduplication, uncertainty control, and human review would still be required.",
  },
  {
    title: "Evidence and human review",
    body: "The local research-brief checklist requires every recent citation to be marked as supporting, contradicting, context, or not relevant. Unassessed and unrelated items do not count toward its minimum of three recent relevant citations, two reviewed source operators, or discussion-plus-reporting mix. At least one supporting and one contradicting item, an alternative explanation, and a disconfirmation test are also required. Passing means only ready for human review: it does not establish that sources support the same claim, represent a population, or qualify an automatically published lead. Entries retain source links and available publication/fetch times for inspection. No translation or inferred stance is generated.",
  },
];

export default function Methodology() {
  const weights = METHODOLOGY.divergence.priorityWeights;
  const displayedWeights = Object.entries(weights)
    .map(([name, value]) => `${name}: ${Math.round(value * 100)}%`)
    .join(" · ");

  return (
    <Page title="Methodology" eyebrow="What the current release measures">
      <div className="grid gap-5 md:grid-cols-2">
        {sections.map(({ title, body }) => (
          <section className="panel p-7" key={title}>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-3 leading-7 text-muted">{body}</p>
          </section>
        ))}
      </div>
      <section className="panel mt-5 p-7">
        <h2 className="text-xl font-bold">Discussion observations</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          The research queue lists exact Stack Exchange question tags found on
          individually CC BY-SA 4.0-licensed questions published in the last
          72 hours. Each tag's recent share of this sample is shown against a
          median daily share across prior observed publication days in a
          30-day archive; missing days are not zero-filled, and the baseline
          stays unavailable until 14 observed days exist. API queries are
          selected in advance and coverage is limited to the listed
          communities and languages. This is a one-platform descriptive
          comparison, not a validated trend, independent-publisher
          corroboration, public-opinion measure, or investment lead. Tags and
          titles remain untranslated; matching across languages is not
          inferred.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          A sample-level review flag is an exploratory prompt only. It requires
          at least {METHODOLOGY.discussionReview.minimumRecentQuestions}{" "}
          exact-tag questions among {METHODOLOGY.discussionReview.minimumRecentSampleSize}{" "}
          recent questions, at least {METHODOLOGY.discussionReview.minimumCommunities}{" "}
          Stack Exchange communities, 14 prior observed days, and a share
          increase above the prior median of at least max(
          {METHODOLOGY.discussionReview.madMultiple}×MAD,{" "}
          {Math.round(METHODOLOGY.discussionReview.minimumShareIncrease * 100)}
          percentage points). It is not a significance test, cross-platform
          confirmation, or thesis lead.
        </p>
      </section>
      <section className="panel mt-5 p-7">
        <h2 className="text-xl font-bold">
          Method parameters and exploratory review gate
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Shared code configuration version {METHODOLOGY.version}. Daily
          descriptive gates:{" "}
          {METHODOLOGY.dailyMetrics.minimumUniqueHashesForDescriptiveOnly}{" "}
          unique hashes,{" "}
          {METHODOLOGY.dailyMetrics.minimumIndependentDomainsForDescriptiveOnly}{" "}
          independent domains, and{" "}
          {METHODOLOGY.dailyMetrics.minimumPriorObservedDaysForBaseline} prior
          observed days for a baseline.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          The discussion sample-level review gate uses the thresholds described
          above. A flag does not create or promote an evidence-qualified lead.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Dormant research-priority helper weights: {displayedWeights}. Its
          local evidence thresholds are weighted total ≥{" "}
          {METHODOLOGY.divergence.localMinimumWeightedTotal}, topic evidence ≥{" "}
          {METHODOLOGY.divergence.localMinimumTopicEvidence}, at least{" "}
          {METHODOLOGY.divergence.localMinimumIndependentSources} independent
          local sources, and average entity confidence ≥{" "}
          {METHODOLOGY.divergence.minimumAverageEntityConfidence}. These do not
          establish comparative eligibility, and no live leads are scored with
          them.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          The dormant matched-comparison helper requires the same entity, topic,
          classifier version, exact UTC window, and source class on both
          markets; at least {METHODOLOGY.divergence.minimumUniqueItemsPerMarket}{" "}
          unique items and{" "}
          {METHODOLOGY.divergence.minimumIndependentDomainsPerMarket}{" "}
          independent domains per market; and expected 2×2 table cell counts of
          at least {METHODOLOGY.divergence.minimumExpectedCellCount} before
          using its approximate two-proportion test. Benjamini–Hochberg
          correction uses q ≤ {METHODOLOGY.divergence.falseDiscoveryRateQ}.
          Timestamp ordering is chronology only, not causality. These are
          initial implementation guards—not validated operating thresholds—and
          no live comparison is produced.
        </p>
      </section>
      <p className="mt-8 text-sm text-muted">
        Signal Scout is a descriptive evidence-collection prototype, not a
        validated comparative research instrument or investment adviser. See{" "}
        <Link className="underline underline-offset-4" href="/sources">
          current source status
        </Link>
        .
      </p>
    </Page>
  );
}

function Page({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="shell flex h-20 items-center justify-between border-b border-line">
        <Link href="/" className="font-extrabold">
          SIGNAL SCOUT
        </Link>
        <Link href="/" className="text-sm text-muted">
          ← Signal Scout
        </Link>
      </header>
      <main className="shell py-16">
        <div className="eyebrow mb-4">{eyebrow}</div>
        <h1 className="mb-10 text-4xl font-extrabold tracking-tight">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
