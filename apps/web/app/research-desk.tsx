import Link from "next/link";
import ExploreWorkspace from "./explore/explore-workspace";
import { authConfigured, authServerClient, githubOAuthEnabled } from "../lib/supabase-auth-server";
import { recentPublisherEvidence } from "../lib/public-data";
import SiteHeader from "../components/site-header";

export default async function ResearchDesk({ saveStatus = "", leadStatus = "" }: { saveStatus?: string; leadStatus?: string }) {
  const auth = authConfigured() ? await authServerClient() : null;
  const authAvailable = await githubOAuthEnabled();
  const { data: { user } } = auth
    ? await auth.auth.getUser()
    : { data: { user: null } };
  const publisherEvidence = await recentPublisherEvidence();

  return (
    <div className="research-shell min-h-screen">
      <SiteHeader action={<Link href="/sources" className="underline underline-offset-4">Sources &amp; method</Link>} />

      <main className="shell pb-20">
        {saveStatus === "invalid" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">The brief could not be saved. Check that its fields meet the stated limits, then try again.</p>}
        {saveStatus === "limit" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">This account has reached the limit of 100 saved briefs.</p>}
        {saveStatus === "unavailable" && <p role="alert" className="mx-auto mb-5 max-w-4xl border border-line p-3 text-sm">Private saving is temporarily unavailable. Your in-page draft has not been saved.</p>}
        <div className="min-h-[calc(100svh-64px)]">
          <ExploreWorkspace
            authAvailable={authAvailable}
            saveEnabled={Boolean(user)}
            publisherEvidence={publisherEvidence}
            leadStatus={leadStatus}
          />
        </div>
      </main>
    </div>
  );
}
