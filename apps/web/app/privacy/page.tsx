import Link from "next/link";

export const metadata = { title: "Privacy | Signal Scout" };

export default function Privacy() {
  return (
    <main className="shell min-h-screen py-16">
      <header className="flex items-center justify-between border-b border-line pb-6">
        <Link href="/" className="font-extrabold">
          SIGNAL SCOUT
        </Link>
        <Link href="/" className="text-sm text-muted">
          ← Signal Scout
        </Link>
      </header>
      <article className="max-w-3xl">
        <div className="eyebrow mb-4 mt-12">Privacy</div>
        <h1 className="text-4xl font-extrabold">
          How this prototype handles data
        </h1>
        <p className="mt-3 text-sm text-muted">
          Last updated: September 30, 2026
        </p>
        <section className="mt-8 space-y-6 leading-7 text-muted">
          <p>
            Signal Scout currently has no enabled user accounts, contact forms,
            advertising pixels, or product analytics. The site may receive
            ordinary server and hosting logs when you visit.
          </p>
          <p>
            The current discussion connector stores selected Stack Exchange
            question titles, links, publication times, community/language, tags,
            and the public author name/profile needed for attribution. It does
            not retain question or answer bodies. Other configured source types
            may have different fields, so check the source registry for current
            collection details.
          </p>
          <p>
            The live Explore search sends the topic and selected community
            directly from your browser to the Stack Exchange public API. Signal
            Scout's server does not receive or store that query or those search
            results. Stack Exchange receives the API request and may process its
            associated technical data under its own policies. The browser
            temporarily displays only results marked CC BY-SA 4.0, with links
            and attribution.
          </p>
          <p>
            Explore can also request a public hashtag timeline directly from
            mastodon.social. That provider receives the hashtag and the
            visitor's network request; Signal Scout's server does not receive
            or persist the query, returned posts, author handles, or post text.
            Public posts are temporarily displayed in the browser with author
            and original-post links. Content warnings are respected; a warned
            post's body is not shown in the app.
          </p>
          <p>
            The app is hosted by Vercel and uses Supabase for server-side data
            storage. These providers process requests and stored data to operate
            the service under their own terms and privacy policies. Server
            credentials are not sent to your browser.
          </p>
          <p>
            There is no automatic expiration schedule; source records otherwise
            remain until an operator removes them. An operator-only takedown
            mechanism can delete an item and directly linked evidence after
            review. It retains SHA-256 content/URL fingerprints to prevent
            recollection and a content-free audit entry; those fingerprints do
            not reveal the source text but remain subject to a future retention
            decision. Source providers may separately change or remove their
            content.
          </p>
          <p>
            This prototype is informational and may change. Do not submit
            private, sensitive, or personal information to a public GitHub
            issue. To report a concern about a collected public item, see the{" "}
            <Link className="underline text-ink" href="/contact">
              contact page
            </Link>
            ; that page is not a private intake channel.
          </p>
        </section>
      </article>
    </main>
  );
}
