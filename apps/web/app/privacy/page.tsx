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
            Lead review can pass an observed topic to Explore in the URL
            fragment so the phrase fields are prefilled. Fragments are not part
            of the HTTP request, and Explore clears the fragment after reading
            it; the phrase is then sent directly to a source only if the
            visitor submits that source's search form.
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
            Explore can search one selected Wikipedia language edition for
            namespace-1 article talk pages. The topic goes directly from your
            browser to that wiki's public API; Signal Scout does not receive
            or store the query or returned snippets. The wiki receives the
            request and associated network data under its own policies. Only
            matching pages edited in the previous 90 days are displayed, with
            links to the page history for contributor attribution. Search
            snippets may contain older text from a recently edited page.
          </p>
          <p>
            Explore can search lemmy.world for up to 20 newest matching posts.
            The topic is sent directly from your browser to that instance;
            Signal Scout does not receive the query or store the results.
            Results are limited to post title,
            original link, author attribution, community, date, and an optional
            language identifier; post bodies are discarded from the app result
            model. This is an incomplete federated index, not a global,
            country, or population sample. The instance operator may process
            request metadata under their own terms and privacy policies.
          </p>
          <p>
            Explore can also query GDELT’s public multilingual news index
            directly from the browser. GDELT receives the search phrase and
            optional publisher-country/language filters. The result headlines
            and links are displayed transiently; selected citations are not
            sent to Signal Scout’s server.
          </p>
          <p>
            The optional Mastodon trend-discovery action requests public tag
            suggestions directly from four configured Mastodon instances. The
            suggestions and brief are transient. The brief holds only citations
            a visitor explicitly selects and notes the visitor writes, in
            volatile page memory. It is erased
            on reload or navigation and is not placed in local storage, sent to
            Signal Scout, or saved to its database. Copying or downloading a
            Markdown brief is a visitor-initiated action to the local clipboard
            or device. A selected social post is represented by its original
            link and attribution metadata; post text is not copied into the
            brief.
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
