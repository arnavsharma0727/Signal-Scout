import ResearchDesk from "../research-desk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Research desk | Signal Scout" };

/** Keep old bookmarks working while presenting a single primary workflow. */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ save?: string }> }) {
  const { save = "" } = await searchParams;
  return <ResearchDesk saveStatus={save} />;
}
