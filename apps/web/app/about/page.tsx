import Link from "next/link";
import SiteHeader from "../../components/site-header";

export default function About() {
  return (
    <Page title="About Signal Scout" eyebrow="Purpose">
      <div className="panel max-w-3xl p-8">
        <p className="text-2xl font-semibold leading-9">
          From public conversation to a question worth researching.
        </p>
        <p className="mt-5 leading-7 text-muted">
          Signal Scout is a search tool for seeing how a market interest appears
          across selected public communities and multilingual reporting. Search
          results link to their original sources and keep each source sample
          separate; news and discussion are not treated as interchangeable.
        </p>
        <p className="mt-5 leading-7 text-muted">
          Live search uses public Hacker News and Stack Exchange endpoints,
          three reachable Lemmy instances when selected, and headline search
          across twelve Global Voices editions. Provider access and results can
          change; unavailable sources are removed from the active search and
          listed with their observed status on the Sources page. Language or
          publisher location does not establish where a speaker or audience is.
        </p>
        <p className="mt-5 leading-7 text-muted">
          Signal Scout is a market-interest search engine, not a stock analyzer.
          It does not produce buy/sell recommendations or measure what a country
          believes. Results are incomplete provider samples, not representative
          surveys; open the original sources to inspect context.
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
      <SiteHeader action={<Link href="/">← Research desk</Link>} />
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
