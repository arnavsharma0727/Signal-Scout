import ExploreWorkspace from "./explore/explore-workspace";
import SiteHeader from "../components/site-header";

export default function ResearchDesk() {
  return (
    <div className="research-shell min-h-screen">
      <SiteHeader />
      <main className="shell">
        <ExploreWorkspace />
      </main>
    </div>
  );
}
