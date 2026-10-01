"use client";

import { useEffect, useMemo, useState } from "react";
import { topicFromFragment, type ResearchEvidence } from "../../lib/research-brief";
import GdeltSearch from "./gdelt-search";
import LemmySearch from "./lemmy-search";
import MastodonSearch from "./mastodon-search";
import TopicSearch from "./topic-search";
import WikimediaTalkSearch from "./wikimedia-talk-search";
import ResearchBrief from "./research-brief";
import ResearchSweep from "./research-sweep";
import LicensedPublisherEvidence from "./licensed-publisher-evidence";

export default function ExploreWorkspace({ authAvailable, saveEnabled, publisherEvidence }: { authAvailable: boolean; saveEnabled: boolean; publisherEvidence: ResearchEvidence[] }) {
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
        saveEnabled={saveEnabled}
        authAvailable={authAvailable}
        initialTopic={initialTopic}
        evidence={evidence}
        onAssess={(id, assessment) => setEvidence((current) =>
          current.map((item) => item.id === id
            ? { ...item, researcherAssessment: assessment }
            : item),
        )}
        onRemove={removeEvidence}
        onClear={() => setEvidence([])}
      />
      <ResearchSweep initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
      <LicensedPublisherEvidence items={publisherEvidence} onAdd={addEvidence} selectedIds={selectedIds} />
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
