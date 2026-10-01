import Link from "next/link";

export default function About() {
  return (
    <Page title="About Signal Scout" eyebrow="Purpose">
      <div className="panel max-w-3xl p-8">
        <p className="text-2xl font-semibold leading-9">
          From public conversation to a question worth researching.
        </p>
        <p className="mt-5 leading-7 text-muted">
          Signal Scout is an international research workspace for following
          public online discussion and reporting into evidence-linked research
          questions. Sources are shown with their original context, links, and
          coverage limits; news and discussion are not treated as interchangeable.
        </p>
        <p className="mt-5 leading-7 text-muted">
          Scheduled sources include licensed international Stack Exchange
          questions and attributed publisher reporting and analysis. Explore
          also offers visitor-triggered searches across four public Lemmy
          instances, four Mastodon server views, Stack Exchange, ten Wikimedia
          language editions, and GDELT news discovery. Access and result
          availability vary by source; read the Sources page for current health.
          Results stay tied to their source and language. No translation or
          cross-language semantic merge is inferred.
        </p>
        <p className="mt-5 leading-7 text-muted">
          Signal Scout is a conversation-to-research workspace, not a stock
          analyzer. It does not produce buy/sell recommendations. The current
          release does not have a validated topic classifier, population-level
          trend detector, or qualified automated thesis leads. Researchers can
          select citations, inspect the originals, and write a working thesis,
          alternatives, and a disconfirmation test themselves. Counts describe
          only the selected, incomplete samples—not what a country or
          population believes.
        </p>
      </div>
      <p className="mt-7 text-sm text-muted">
        For current data handling, see{" "}
        <Link className="underline" href="/privacy">
          Privacy
        </Link>
        . To report an issue, see{" "}
        <Link className="underline" href="/contact">
          Contact
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
