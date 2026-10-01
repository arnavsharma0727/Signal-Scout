"use client";

import { useEffect, useMemo, useState } from "react";
import { topicFromFragment, type ResearchEvidence } from "../../lib/research-brief";
import GdeltSearch from "./gdelt-search";
import LemmySearch from "./lemmy-search";
import MastodonSearch from "./mastodon-search";
import TopicSearch from "./topic-search";
import WikimediaTalkSearch from "./wikimedia-talk-search";
import ResearchBrief from "./research-brief";

export default function ExploreWorkspace() {
  const [evidence, setEvidence] = useState<ResearchEvidence[]>([]);
  const [initialTopic, setInitialTopic] = useState("");
  const selectedIds = useMemo(() => new Set(evidence.map(({ id }) => id)), [evidence]);

  useEffect(() => {
    const topic = topicFromFragment(window.location.hash);
    setInitialTopic(topic);
    if (topic) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  function addEvidence(item: ResearchEvidence) {
    setEvidence((current) => current.some(({ id }) => id === item.id) ? current : [...current, item]);
  }

  function removeEvidence(id: string) {
    setEvidence((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <ResearchBrief
        initialTopic={initialTopic}
        evidence={evidence}
        onRemove={removeEvidence}
        onClear={() => setEvidence([])}
      />
      <div className="mt-8 border-t border-line pt-5 text-sm text-muted">
        Review a result’s original source, then explicitly add its citation to the brief.
      </div>
      <TopicSearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
      <GdeltSearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
      <MastodonSearch onAdd={addEvidence} selectedIds={selectedIds} />
      <LemmySearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
      <WikimediaTalkSearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
    </>
  );
}
