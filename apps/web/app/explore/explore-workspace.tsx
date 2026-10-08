"use client";

import { useState } from "react";
import ResearchSweep from "./research-sweep";

export default function ExploreWorkspace() {
  const [topic, setTopic] = useState("");

  return <ResearchSweep initialTopic={topic} onSearchTopic={setTopic} />;
}
