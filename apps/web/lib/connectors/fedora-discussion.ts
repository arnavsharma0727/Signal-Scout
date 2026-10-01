import { fetchWithRetry } from "./fetch";
import { makeDocument } from "./normalize";
import type { Connector, ConnectorResult } from "./types";

export const FEDORA_DISCUSSION_LATEST = "https://discussion.fedoraproject.org/latest.json";
export const FEDORA_DISCUSSION_TOS = "https://discussion.fedoraproject.org/tos";
export const FEDORA_DISCUSSION_LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/";
const MAX_RESPONSE_BYTES = 1_000_000;

type Topic = {
  id?: unknown;
  slug?: unknown;
  title?: unknown;
  created_at?: unknown;
  last_posted_at?: unknown;
  visible?: unknown;
  reply_count?: unknown;
  posters?: unknown;
};

/** Daily bounded Discourse latest-topic sample; bodies and profile details are never retained. */
export class FedoraDiscussionConnector implements Connector {
  name = "fedora-discussion";

  validateConfiguration() {
    return { valid: true, errors: [] };
  }

  async fetchDocuments(input: Parameters<Connector["fetchDocuments"]>[0]): Promise<ConnectorResult> {
    const response = await fetchWithRetry(FEDORA_DISCUSSION_LATEST, {
      headers: {
        accept: "application/json",
        "user-agent": "SignalScout/1.0 (+https://signal-scout-xi-ruby.vercel.app/sources)",
      },
    }, { attempts: 2, timeoutMs: 12_000 });
    const finalUrl = new URL(response.url || FEDORA_DISCUSSION_LATEST);
    if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "discussion.fedoraproject.org" ||
        finalUrl.pathname !== "/latest.json" || finalUrl.search || finalUrl.hash) {
      throw new Error("Fedora Discussion API redirected outside the allowlist");
    }

    const body = await readBoundedText(response, MAX_RESPONSE_BYTES);
    if (body === null) throw new Error("Fedora Discussion response exceeded its size limit");
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new Error("Fedora Discussion returned invalid JSON");
    }
    const topicList = asRecord(payload.topic_list);
    if (!Array.isArray(topicList.topics) || !Array.isArray(payload.users)) {
      throw new Error("Unexpected Fedora Discussion latest-topic response");
    }

    const usernames = new Map<number, string>();
    for (const value of payload.users) {
      const user = asRecord(value);
      if (Number.isSafeInteger(user.id) && typeof user.username === "string" && /^[\w.-]{1,60}$/.test(user.username)) {
        usernames.set(user.id as number, user.username);
      }
    }

    const documents: ReturnType<typeof makeDocument>[] = [];
    let rejected = 0;
    for (const value of topicList.topics as unknown[]) {
      const topic = asRecord(value) as Topic;
      const id = topic.id;
      const slug = topic.slug;
      const title = typeof topic.title === "string" ? topic.title.trim() : "";
      const activeAt = parseDate(topic.last_posted_at);
      const createdAt = parseDate(topic.created_at);
      const posters = Array.isArray(topic.posters) ? topic.posters : [];
      const originalPosterId = posters.length ? asRecord(posters[0]).user_id : null;
      const author = Number.isSafeInteger(originalPosterId) ? usernames.get(originalPosterId as number) : undefined;

      if (!Number.isSafeInteger(id) || (id as number) <= 0 ||
          typeof slug !== "string" || !/^[a-z0-9-]{1,180}$/.test(slug) ||
          !title || title.length > 500 || topic.visible === false ||
          !activeAt || activeAt < input.start || activeAt > input.end || !createdAt ||
          !author || !Number.isSafeInteger(topic.reply_count) || (topic.reply_count as number) < 0) {
        rejected++;
        continue;
      }

      const sourceUrl = `https://discussion.fedoraproject.org/t/${slug}/${id}`;
      documents.push(makeDocument({
        marketCode: "INTL",
        sourceType: "licensed-forum",
        sourceName: "Fedora Discussion · community forum",
        sourceUrl,
        title,
        publishedAt: activeAt.toISOString(),
        languageCode: "en",
        tier: 3,
        entityConfidence: 0,
        raw: {
          publisher: "Fedora Discussion",
          author,
          topicCreatedAt: createdAt.toISOString(),
          replyCountAtFetch: topic.reply_count,
          licenseName: "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)",
          licenseUrl: FEDORA_DISCUSSION_LICENSE,
          termsUrl: FEDORA_DISCUSSION_TOS,
          apiUrl: FEDORA_DISCUSSION_LATEST,
          titleUnmodified: true,
          topicBodyAndRepliesDiscarded: true,
          profileDetailsDiscarded: true,
          sampleLimit: "latest endpoint returns at most 30 topics",
          languageInferred: false,
          geographicMarketInferred: false,
          publisherIndependenceInferred: false,
        },
      }));
    }

    return {
      documents,
      requestsUsed: 1,
      metadata: {
        latestTopicsReceived: topicList.topics.length,
        documentsAccepted: documents.length,
        itemsRejected: rejected,
        sampleLimit: 30,
        windowBasis: "last activity timestamp; topic title and original-poster attribution remain unchanged",
        contentStored: "unmodified topic title, original-poster username, activity date, reply-count snapshot, and original topic URL only",
        postBodiesAndRepliesRetained: false,
        forumUse: "Fedora/Linux community discussion; a selected technical community, not financial or population sentiment",
      },
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

async function readBoundedText(response: Response, maximumBytes: number): Promise<string | null> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) return null;
  if (!response.body) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= maximumBytes ? text : null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
