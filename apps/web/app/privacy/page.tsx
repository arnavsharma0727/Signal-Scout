import Link from "next/link";
import SiteHeader from "../../components/site-header";

export const metadata = { title: "Privacy | Signal Scout" };

export default function Privacy() {
  return (
    <div className="min-h-screen">
      <SiteHeader action={<Link href="/">← Research desk</Link>} />
      <main className="shell py-16">
      <article className="max-w-3xl">
        <div className="eyebrow mb-4">Privacy</div>
        <h1 className="text-4xl font-extrabold">
          How this prototype handles data
        </h1>
        <p className="mt-3 text-sm text-muted">
          Last updated: October 6, 2026
        </p>
        <section className="mt-8 space-y-6 leading-7 text-muted">
          <p>
            Signal Scout has no advertising pixels or product analytics. If
            account sign-in is enabled, authenticated users can choose to save
            private research briefs. The site may receive ordinary server and
            hosting logs when you visit.
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
            The research brief autosaves your notes and deliberately selected
            citation metadata in this browser&apos;s local storage. This can
            include your topic, working thesis, alternative explanations,
            disconfirmation test, source title and link, publication time,
            source/language labels, attribution, license, and your assessment.
            The app strips transient social-post previews before storing a
            citation; a limited content-warning label may remain when needed
            to explain why a preview was withheld. The app does not save an
            unselected search result or maintain a search-history list. This
            local draft is not sent to Signal Scout, synced to an account, or
            backed up by the app. It remains in
            the browser until you use “Clear page draft” or clear this site&apos;s
            browser data. Anyone with access to the same browser profile may be
            able to access it.
          </p>
          <p>
            If you explicitly publish a reviewed lead, selected Bluesky,
            Mastodon, or Lemmy citations are stored in the shared evidence
            registry as a permalink, public byline, date/language, and your
            paraphrase; their post text is not stored. A Stack Exchange
            citation is rechecked against the public API before publication.
            If its current record is CC BY-SA 4.0, the shared registry stores
            its unmodified question title, link, date/language, author name and
            profile link, and license for attribution; question and answer
            bodies are not stored. These shared source records are publicly
            readable and are not deleted when a lead is withdrawn. Original
            providers receive revalidation requests and may process them under
            their own policies.
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
            through a first-party, no-store search endpoint because the
            provider blocks browser cross-origin requests. The topic and
            optional publisher-country/language filters pass through Vercel to
            GDELT; Signal Scout does not persist them or the results. Headlines
            and links are displayed transiently.
          </p>
          <p>
            Explore can query Bluesky’s public search API from the browser
            without an account or API key. The query is sent to api.bsky.app,
            not Signal Scout. Public post text is displayed transiently in
            the browser search results so a researcher can inspect the actual
            conversation. Selecting a citation strips the post text; only a
            public link, author handle, date, and language remain in the brief.
            Unselected search queries and results are not sent to Signal
            Scout&apos;s server or persisted as history. If you select a citation,
            its link and citation metadata are autosaved locally as described
            above; the post text is not. Search coverage is incomplete and is
            not representative of public opinion.
          </p>
          <p>
            The optional Mastodon trend-discovery action requests public tag
            suggestions directly from configured Mastodon instances. Search
            suggestions and unselected results remain transient in the browser.
            Selected citation metadata is autosaved only in this browser; it
            is not synced unless the visitor explicitly saves a brief. On
            account save, Signal Scout
            receives the visitor-written topic, thesis, alternatives,
            disconfirmation notes, source-specific paraphrase notes, plus
            link-only citations from a narrow reviewed source allowlist. The
            server independently checks every URL and strips tracking
            parameters; it does not save source titles, excerpts, social post
            links, post text, author handles, or search queries. The account
            owner can view and delete their saved briefs;
            row-level database policies prevent other users from reading them.
            The brief is not publicly shareable and is not an automated lead.
            Copying or downloading Markdown remains a visitor-initiated action
            to the local clipboard or device.
          </p>
          <p>
            Publishing a lead is a separate, explicit public action. For
            selected Bluesky, Mastodon, or Lemmy citations, Signal Scout stores
            and displays the public permalink, provider/host, displayed public
            byline, date, language, a generated citation label, and your own source-specific
            paraphrase. The post body and transient preview are discarded and
            are not stored or republished. These citation records are public
            in the public source registry as well as through the shared lead
            and remain under the source-record retention policy; withdrawing a lead hides it from the active
            queue but does not itself erase its source records. Other visitors
            can see the thesis, alternatives, disconfirmation test, links,
            attribution labels, and your review notes. Do not publish sensitive
            or private information.
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
    </div>
  );
}
