import Link from "next/link";
import { METHODOLOGY } from "../../lib/methodology-config";

const sections = [
  {
    title: "What is live",
    body: "Signal Scout is currently an evidence-collection and review prototype. It displays eligible collected source items when available. It does not currently calculate a Korea-versus-U.S. conversation difference, classify stance, rank live leads, or produce investment conclusions. No cleared Korean investor-discussion feed is configured.",
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
    body: "The codebase contains helper functions and versioned parameters for a possible future divergence workflow. They are not currently run to publish comparisons or leads. Even if enabled later, minimum local evidence alone cannot establish a cross-market difference; matched windows and source classes, adequate evidence on both sides, deduplication, uncertainty control, and human review would still be required.",
  },
  {
    title: "Evidence and human review",
    body: "Entries retain source links and available publication/fetch times for inspection. Source availability and metadata vary. No translation or inferred stance is currently generated. Check the original source, seek contradictory information, and treat missing evidence as an evidence gap—not evidence that discussion is absent.",
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
        <h2 className="text-xl font-bold">
          Implemented parameters (not a live signal)
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
