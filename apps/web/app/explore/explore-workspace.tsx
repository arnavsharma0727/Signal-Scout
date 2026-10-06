"use client";

import { useEffect, useMemo, useState } from "react";
import { citationWithoutTransientContent, topicFromFragment, type ResearchEvidence } from "../../lib/research-brief";
import GdeltSearch from "./gdelt-search";
import LemmySearch from "./lemmy-search";
import MastodonSearch from "./mastodon-search";
import TopicSearch from "./topic-search";
import WikimediaTalkSearch from "./wikimedia-talk-search";
import ResearchBrief from "./research-brief";
import ResearchSweep from "./research-sweep";
import LicensedPublisherEvidence from "./licensed-publisher-evidence";
import { LOCAL_RESEARCH_DRAFT_KEY, parseLocalEvidenceDraft, serializeLocalEvidenceDraft } from "../../lib/local-research-draft";

export default function ExploreWorkspace({ authAvailable, saveEnabled, publisherEvidence }: { authAvailable: boolean; saveEnabled: boolean; publisherEvidence: ResearchEvidence[] }) {
  const [evidence, setEvidence] = useState<ResearchEvidence[]>([]);
  const [localDraftReady, setLocalDraftReady] = useState(false);
  const [localStorageAvailable, setLocalStorageAvailable] = useState<boolean | null>(null);
  const [initialTopic, setInitialTopic] = useState("");
  const selectedIds = useMemo(() => new Set(evidence.map(({ id }) => id)), [evidence]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_RESEARCH_DRAFT_KEY);
      setLocalStorageAvailable(true);
      if (saved) {
        const restored = parseLocalEvidenceDraft(saved);
        if (restored) setEvidence(restored);
      }
    } catch {
      // Storage can be disabled by browser privacy settings; the in-page brief still works.
      setLocalStorageAvailable(false);
    }
    setLocalDraftReady(true);
  }, []);

  useEffect(() => {
    if (!localDraftReady) return;
    try {
      window.localStorage.setItem(LOCAL_RESEARCH_DRAFT_KEY, serializeLocalEvidenceDraft(evidence));
      setLocalStorageAvailable(true);
    } catch {
      // Storage quota/private-mode errors do not prevent the in-page brief from working.
      setLocalStorageAvailable(false);
    }
  }, [evidence, localDraftReady]);

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
    const citation = citationWithoutTransientContent(item);
    setEvidence((current) => current.some(({ id }) => id === citation.id) ? current : [...current, citation]);
  }

  function removeEvidence(id: string) {
    setEvidence((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <ResearchSweep initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} onSearchTopic={setInitialTopic} />
      <LicensedPublisherEvidence items={publisherEvidence} initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
      <details className="panel mt-6 p-5 md:p-6">
        <summary className="cursor-pointer font-semibold">Specialized source views</summary>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Optional provider-specific searches for Mastodon hashtag discovery, Lemmy instance comparisons, Stack Exchange question search, Wikimedia talk pages, and GDELT. Each keeps its own query and limitations.</p>
        <div className="mt-5 space-y-6">
          <TopicSearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
          <GdeltSearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
          <MastodonSearch onAdd={addEvidence} selectedIds={selectedIds} />
          <LemmySearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
          <WikimediaTalkSearch initialTopic={initialTopic} onAdd={addEvidence} selectedIds={selectedIds} />
        </div>
      </details>
      <ResearchBrief
        saveEnabled={saveEnabled}
        authAvailable={authAvailable}
        localStorageAvailable={localStorageAvailable}
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
    </>
  );
}
