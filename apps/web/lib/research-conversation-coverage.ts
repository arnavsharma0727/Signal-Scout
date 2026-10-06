import { knownSourceOperator } from "./research-lead-qualification";

export type ConversationCoverageRow = {
  source_type: string | null;
  source_domain: string | null;
  raw_metadata_json: unknown;
};

export type ConversationCoverage = {
  itemCount: number;
  unresolvedOperatorCount: number;
  operators: Array<{ key: string; label: string; itemCount: number }>;
  attributedItemCount: number;
  distinctBylineLabels: number;
  largestBylineShare: number;
};

const OPERATOR_LABELS: Record<string, string> = {
  "fedora-discussion": "Fedora Discussion",
  "typst-forum": "Typst Forum",
  "stack-exchange": "Stack Exchange",
};

/** Describe recent licensed conversation/Q&A rows without inferring reach or sentiment. */
export function summarizeConversationCoverage(rows: ConversationCoverageRow[]): ConversationCoverage {
  const operatorCounts = new Map<string, number>();
  const bylineCounts = new Map<string, number>();
  let unresolvedOperatorCount = 0;
  let attributedItemCount = 0;

  for (const row of rows) {
    const source = {
      source_type: row.source_type,
      source_domain: row.source_domain,
      raw_metadata_json: row.raw_metadata_json,
    };
    const operator = knownSourceOperator(source);
    if (!operator || !OPERATOR_LABELS[operator]) {
      unresolvedOperatorCount += 1;
      continue;
    }
    operatorCounts.set(operator, (operatorCounts.get(operator) ?? 0) + 1);

    const metadata = asRecord(row.raw_metadata_json);
    const rawByline = row.source_type === "stack-exchange"
      ? metadata.attributionName
      : metadata.author;
    if (typeof rawByline !== "string" || !rawByline.trim()) continue;
    const byline = `${operator}\u0000${rawByline.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase()}`;
    bylineCounts.set(byline, (bylineCounts.get(byline) ?? 0) + 1);
    attributedItemCount += 1;
  }

  return {
    itemCount: rows.length,
    unresolvedOperatorCount,
    operators: [...operatorCounts]
      .map(([key, itemCount]) => ({ key, label: OPERATOR_LABELS[key], itemCount }))
      .sort((a, b) => b.itemCount - a.itemCount || a.label.localeCompare(b.label)),
    attributedItemCount,
    distinctBylineLabels: bylineCounts.size,
    largestBylineShare: attributedItemCount
      ? Math.max(0, ...bylineCounts.values()) / attributedItemCount
      : 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
