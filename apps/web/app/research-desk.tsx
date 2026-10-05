import Link from "next/link";
import ExploreWorkspace from "./explore/explore-workspace";
import { authConfigured, authServerClient } from "../lib/supabase-auth-server";
import { recentPublisherEvidence } from "../lib/public-data";

export default async function ResearchDesk({ saveStatus = "" }: { saveStatus?: string }) {
  const auth = authConfigured() ? await authServerClient() : null;
  const { data: { user } } = auth
    ? await auth.auth.getUser()
    : { data: { user: null } };
  const publisherEvidence = await recentPublisherEvidence();

  return (
    <div className="min-h-screen">
      <header className="shell flex min-h-16 items-center justify-between border-b border-line">
        <Link href="/" className="flex items-center gap-3" aria-label="Signal Scout research desk">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-line text-xs font-bold" aria-hidden="true">SS</span>
          <span className="font-bold tracking-tight">SIGNAL SCOUT</span>
        </Link>
        <Link href="/sources" className="text-sm text-muted underline underline-offset-4">Sources &amp; method</Link>
      </header>

      <main className="shell max-w-screen-xl pb-20 pt-10 md:pt-14">
        {saveStatus === "invalid" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">The brief could not be saved. Check that its fields meet the stated limits, then try again.</p>}
        {saveStatus === "limit" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">This account has reached the limit of 100 saved briefs.</p>}
        {saveStatus === "unavailable" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">Private saving is temporarily unavailable. Your in-page draft has not been saved.</p>}
        <div className="mx-auto max-w-5xl">
          <div className="eyebrow">International conversation research</div>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Find a conversation. Follow its evidence.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Search public discussion and reporting around one topic, inspect each original source, then assemble a research brief. Samples are incomplete and query-selected; Signal Scout does not infer what a whole country thinks.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-xs text-muted">
            <span>Leads surface only when evidence gates are met</span>
            <span>Searches are live and source-specific</span>
            <span>Research only · no buy/sell recommendations</span>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-5xl">
          <ExploreWorkspace
            authAvailable={authConfigured()}
            saveEnabled={Boolean(user)}
            publisherEvidence={publisherEvidence}
          />
        </div>

        <section className="mx-auto mt-10 flex max-w-5xl flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Signal review</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Review source-backed observations and the evidence thresholds before treating anything as a lead.</p>
          </div>
          <Link className="btn shrink-0" href="/candidates">Open signal review</Link>
        </section>
      </main>
    </div>
  );
}
