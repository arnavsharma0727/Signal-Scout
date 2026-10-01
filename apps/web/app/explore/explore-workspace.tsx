"use client";

import { useMemo, useState } from "react";
import type { ResearchEvidence } from "../../lib/research-brief";
import GdeltSearch from "./gdelt-search";
import LemmySearch from "./lemmy-search";
import MastodonSearch from "./mastodon-search";
import TopicSearch from "./topic-search";
import WikimediaTalkSearch from "./wikimedia-talk-search";
import ResearchBrief from "./research-brief";

export default function ExploreWorkspace() {
  const [evidence, setEvidence] = useState<ResearchEvidence[]>([]);
  const selectedIds = useMemo(() => new Set(evidence.map(({ id }) => id)), [evidence]);

  function addEvidence(item: ResearchEvidence) {
    setEvidence((current) => current.some(({ id }) => id === item.id) ? current : [...current, item]);
  }

  function removeEvidence(id: string) {
    setEvidence((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <ResearchBrief
        evidence={evidence}
        onRemove={removeEvidence}
        onClear={() => setEvidence([])}
      />
      <div className="mt-8 border-t border-line pt-5 text-sm text-muted">
        Review a result’s original source, then explicitly add its citation to the brief.
      </div>
      <TopicSearch onAdd={addEvidence} selectedIds={selectedIds} />
      <GdeltSearch onAdd={addEvidence} selectedIds={selectedIds} />
      <MastodonSearch onAdd={addEvidence} selectedIds={selectedIds} />
      <LemmySearch onAdd={addEvidence} selectedIds={selectedIds} />
      <WikimediaTalkSearch onAdd={addEvidence} selectedIds={selectedIds} />
    </>
  );
}
