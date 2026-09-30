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
          The live discussion sample is currently a small, English-language
          expert Q&amp;A feed from Stack Exchange. GDELT news discovery is
          configured but has not yet produced a successful live run. There is
          no validated topic classifier, trend detector, or qualified live
          thesis lead yet. Counts do not represent what a country or population
          believes.
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
