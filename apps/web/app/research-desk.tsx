import Link from "next/link";
import ExploreWorkspace from "./explore/explore-workspace";
import { authConfigured, authServerClient, githubOAuthEnabled } from "../lib/supabase-auth-server";
import { recentPublisherEvidence } from "../lib/public-data";
import SiteHeader from "../components/site-header";

export default async function ResearchDesk({ saveStatus = "" }: { saveStatus?: string }) {
  const auth = authConfigured() ? await authServerClient() : null;
  const authAvailable = await githubOAuthEnabled();
  const { data: { user } } = auth
    ? await auth.auth.getUser()
    : { data: { user: null } };
  const publisherEvidence = await recentPublisherEvidence();

  return (
    <div className="min-h-screen">
      <SiteHeader action={<Link href="/sources" className="underline underline-offset-4">Sources &amp; method</Link>} />

      <main className="shell pb-20 pt-10 md:pt-14">
        {saveStatus === "invalid" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">The brief could not be saved. Check that its fields meet the stated limits, then try again.</p>}
        {saveStatus === "limit" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">This account has reached the limit of 100 saved briefs.</p>}
        {saveStatus === "unavailable" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">Private saving is temporarily unavailable. Your in-page draft has not been saved.</p>}
        <div>
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

        <div className="mt-8">
          <ExploreWorkspace
            authAvailable={authAvailable}
            saveEnabled={Boolean(user)}
            publisherEvidence={publisherEvidence}
          />
        </div>

        <section className="mt-10 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
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
