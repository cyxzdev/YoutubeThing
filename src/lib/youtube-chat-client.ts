import type { ChatEvent, MessagePart, BadgeType, SuperChatInfo } from "./types";
import { SUPER_CHAT_COLOR_TO_TIER } from "./constants";

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const LIVE_CHAT_URL = "https://www.youtube.com/youtubei/v1/live_chat/get_live_chat";

async function proxyGet(url: string): Promise<string> {
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.text();
}

async function proxyPost(url: string, body: unknown): Promise<string> {
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, body, method: "POST" }),
  });
  return res.text();
}

interface ContinuationData {
  continuation: string;
  timeoutMs: number;
}

// Extract ytInitialData from the live chat page HTML
function extractInitialData(html: string): Record<string, unknown> | null {
  const match = html.match(/window\["ytInitialData"\]\s*=\s*({.+?});\s*<\/script>/)
    || html.match(/var\s+ytInitialData\s*=\s*({.+?});\s*<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function dig(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function extractContinuation(data: unknown): ContinuationData | null {
  const continuations = dig(data, "continuationContents", "liveChatContinuation", "continuations") as unknown[]
    ?? dig(data, "contents", "liveChatRenderer", "continuations") as unknown[];
  if (!Array.isArray(continuations)) return null;

  for (const c of continuations) {
    const ic = dig(c, "invalidationContinuationData") as Record<string, unknown>
      ?? dig(c, "timedContinuationData") as Record<string, unknown>
      ?? dig(c, "reloadContinuationData") as Record<string, unknown>;
    if (ic && typeof ic.continuation === "string") {
      return {
        continuation: ic.continuation,
        timeoutMs: typeof ic.timeoutMs === "number" ? ic.timeoutMs : 5000,
      };
    }
  }
  return null;
}

function extractActions(data: unknown): unknown[] {
  const raw = dig(data, "continuationContents", "liveChatContinuation", "actions") as unknown[]
    ?? dig(data, "contents", "liveChatRenderer", "actions") as unknown[];
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  for (const item of raw) {
    const r = item as Record<string, unknown>;
    // Unwrap replayChatItemAction wrappers (YouTube sometimes sends these even in live mode)
    const replay = r.replayChatItemAction as Record<string, unknown>;
    if (replay && Array.isArray(replay.actions)) {
      out.push(...(replay.actions as unknown[]));
    } else {
      out.push(item);
    }
  }
  return out;
}

function parseMessageRuns(runs: unknown[]): MessagePart[] {
  if (!Array.isArray(runs)) return [];
  return runs.map((run: unknown) => {
    const r = run as Record<string, unknown>;
    if (r.emoji) {
      const emoji = r.emoji as Record<string, unknown>;
      const thumbs = (emoji.image as Record<string, unknown>)?.thumbnails as { url: string }[];
      return {
        type: "emoji" as const,
        emojiUrl: thumbs?.[0]?.url || "",
        emojiAlt: (emoji.emojiId as string) || (emoji.shortcuts as string[])?.[0] || "",
      };
    }
    return { type: "text" as const, text: (r.text as string) || "" };
  });
}

function parseBadges(badges: unknown[]): BadgeType[] {
  if (!Array.isArray(badges)) return [];
  const result: BadgeType[] = [];
  for (const b of badges) {
    const badge = dig(b, "liveChatAuthorBadgeRenderer") as Record<string, unknown>;
    if (!badge) continue;
    const iconType = (dig(badge, "icon", "iconType") as string || "").toUpperCase();
    const tooltip = ((badge.tooltip as string) || "").toLowerCase();
    if (iconType === "OWNER" || tooltip.includes("owner")) result.push("owner");
    else if (iconType === "MODERATOR" || tooltip.includes("moderator")) result.push("moderator");
    else if (iconType === "VERIFIED" || tooltip.includes("verified")) result.push("verified");
    else if (tooltip.includes("member") || badge.customThumbnail) result.push("member");
  }
  return result;
}

function parseSuperChat(renderer: Record<string, unknown>): SuperChatInfo | undefined {
  const amount = dig(renderer, "purchaseAmountText", "simpleText") as string;
  if (!amount) return undefined;
  const color = ((renderer.headerBackgroundColor as number) ?? 0).toString(16);
  const bgHex = `#${color.padStart(6, "0").slice(-6).toUpperCase()}`;
  const tier = SUPER_CHAT_COLOR_TO_TIER[bgHex] ?? 4;
  let sticker: { url: string; alt: string } | undefined;
  const stickerThumbs = dig(renderer, "sticker", "thumbnails") as { url: string }[];
  if (stickerThumbs?.[0]) sticker = { url: stickerThumbs[0].url, alt: amount };
  return { amount, color: bgHex, tier, sticker };
}

function actionToEvent(action: unknown): ChatEvent | null {
  const a = action as Record<string, unknown>;

  // Regular message or member chat
  const addAction = a.addChatItemAction as Record<string, unknown>;
  if (addAction) {
    const item = addAction.item as Record<string, unknown>;
    if (!item) return null;

    // Regular text message
    const textMsg = item.liveChatTextMessageRenderer as Record<string, unknown>;
    if (textMsg) {
      const author = textMsg.authorName as Record<string, unknown>;
      const photo = dig(textMsg, "authorPhoto", "thumbnails") as { url: string }[];
      return {
        id: (textMsg.id as string) || uid(),
        type: "message",
        timestamp: parseInt(textMsg.timestampUsec as string, 10) / 1000 || Date.now(),
        author: {
          name: (dig(author, "simpleText") as string) || (dig(author, "runs", "0", "text") as string) || "Unknown",
          channelId: (textMsg.authorExternalChannelId as string) || "",
          profileImageUrl: photo?.[photo.length - 1]?.url || "",
          badges: parseBadges(textMsg.authorBadges as unknown[]),
        },
        message: parseMessageRuns((dig(textMsg, "message", "runs") as unknown[]) || []),
      };
    }

    // Super Chat
    const scMsg = item.liveChatPaidMessageRenderer as Record<string, unknown>;
    if (scMsg) {
      const author = scMsg.authorName as Record<string, unknown>;
      const photo = dig(scMsg, "authorPhoto", "thumbnails") as { url: string }[];
      return {
        id: (scMsg.id as string) || uid(),
        type: "superchat",
        timestamp: parseInt(scMsg.timestampUsec as string, 10) / 1000 || Date.now(),
        author: {
          name: (dig(author, "simpleText") as string) || "Unknown",
          channelId: (scMsg.authorExternalChannelId as string) || "",
          profileImageUrl: photo?.[photo.length - 1]?.url || "",
          badges: parseBadges(scMsg.authorBadges as unknown[]),
        },
        message: parseMessageRuns((dig(scMsg, "message", "runs") as unknown[]) || []),
        superchat: parseSuperChat(scMsg),
      };
    }

    // Super Sticker
    const stickerMsg = item.liveChatPaidStickerRenderer as Record<string, unknown>;
    if (stickerMsg) {
      const author = stickerMsg.authorName as Record<string, unknown>;
      const photo = dig(stickerMsg, "authorPhoto", "thumbnails") as { url: string }[];
      return {
        id: (stickerMsg.id as string) || uid(),
        type: "superchat",
        timestamp: parseInt(stickerMsg.timestampUsec as string, 10) / 1000 || Date.now(),
        author: {
          name: (dig(author, "simpleText") as string) || "Unknown",
          channelId: (stickerMsg.authorExternalChannelId as string) || "",
          profileImageUrl: photo?.[photo.length - 1]?.url || "",
          badges: parseBadges(stickerMsg.authorBadges as unknown[]),
        },
        message: [],
        superchat: parseSuperChat(stickerMsg),
      };
    }

    // Membership
    const memberMsg = item.liveChatMembershipItemRenderer as Record<string, unknown>;
    if (memberMsg) {
      const author = memberMsg.authorName as Record<string, unknown>;
      const photo = dig(memberMsg, "authorPhoto", "thumbnails") as { url: string }[];
      const headerText = dig(memberMsg, "headerSubtext", "runs") as unknown[];
      return {
        id: (memberMsg.id as string) || uid(),
        type: "membership",
        timestamp: parseInt(memberMsg.timestampUsec as string, 10) / 1000 || Date.now(),
        author: {
          name: (dig(author, "simpleText") as string) || "Unknown",
          channelId: (memberMsg.authorExternalChannelId as string) || "",
          profileImageUrl: photo?.[photo.length - 1]?.url || "",
          badges: parseBadges(memberMsg.authorBadges as unknown[]),
        },
        message: parseMessageRuns((dig(memberMsg, "message", "runs") as unknown[]) || []),
        membership: {
          type: "new",
          text: headerText ? headerText.map((r: unknown) => ((r as Record<string, unknown>).text as string) || "").join("") : "New member",
        },
      };
    }

    // Gifted memberships ("X gifted 5 memberships")
    const giftMsg = item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer as Record<string, unknown>;
    if (giftMsg) {
      const header = dig(giftMsg, "header", "liveChatSponsorshipsHeaderRenderer") as Record<string, unknown>;
      if (header) {
        const author = header.authorName as Record<string, unknown>;
        const photo = dig(header, "authorPhoto", "thumbnails") as { url: string }[];
        const primaryRuns = dig(header, "primaryText", "runs") as unknown[];
        const text = primaryRuns
          ? primaryRuns.map((r: unknown) => ((r as Record<string, unknown>).text as string) || "").join("")
          : "Gifted memberships";
        return {
          id: (giftMsg.id as string) || uid(),
          type: "membership",
          timestamp: parseInt(giftMsg.timestampUsec as string, 10) / 1000 || Date.now(),
          author: {
            name: (dig(author, "simpleText") as string) || (dig(author, "runs", "0", "text") as string) || "Unknown",
            channelId: (header.authorExternalChannelId as string) || (giftMsg.authorExternalChannelId as string) || "",
            profileImageUrl: photo?.[photo.length - 1]?.url || "",
            badges: parseBadges(header.authorBadges as unknown[]),
          },
          message: [],
          membership: { type: "gifting", text },
        };
      }
    }

    // Gift received ("You received a membership from X")
    const giftRedeem = item.liveChatSponsorshipsGiftRedemptionAnnouncementRenderer as Record<string, unknown>;
    if (giftRedeem) {
      const author = giftRedeem.authorName as Record<string, unknown>;
      const photo = dig(giftRedeem, "authorPhoto", "thumbnails") as { url: string }[];
      const msgRuns = dig(giftRedeem, "message", "runs") as unknown[];
      const text = msgRuns
        ? msgRuns.map((r: unknown) => ((r as Record<string, unknown>).text as string) || "").join("")
        : "Received a gifted membership";
      return {
        id: (giftRedeem.id as string) || uid(),
        type: "membership",
        timestamp: parseInt(giftRedeem.timestampUsec as string, 10) / 1000 || Date.now(),
        author: {
          name: (dig(author, "simpleText") as string) || (dig(author, "runs", "0", "text") as string) || "Unknown",
          channelId: (giftRedeem.authorExternalChannelId as string) || "",
          profileImageUrl: photo?.[photo.length - 1]?.url || "",
          badges: parseBadges(giftRedeem.authorBadges as unknown[]),
        },
        message: [],
        membership: { type: "gift_received", text },
      };
    }

    // System / viewer engagement message ("Welcome!", "Remember to be respectful", etc.)
    const engageMsg = item.liveChatViewerEngagementMessageRenderer as Record<string, unknown>;
    if (engageMsg) {
      const runs = dig(engageMsg, "message", "runs") as unknown[];
      const text = runs
        ? runs.map((r: unknown) => ((r as Record<string, unknown>).text as string) || "").join("")
        : "";
      if (text) {
        return {
          id: (engageMsg.id as string) || uid(),
          type: "system",
          timestamp: Date.now(),
          author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
          message: [{ type: "text", text }],
        };
      }
    }

    // Mode change ("Slow mode is on", "Members-only chat enabled", etc.)
    const modeMsg = item.liveChatModeChangeMessageRenderer as Record<string, unknown>;
    if (modeMsg) {
      const mainText = dig(modeMsg, "text", "runs") as unknown[];
      const subText = dig(modeMsg, "subtext", "runs") as unknown[];
      const parts: string[] = [];
      if (mainText) parts.push(mainText.map((r: unknown) => ((r as Record<string, unknown>).text as string) || "").join(""));
      if (subText) parts.push(subText.map((r: unknown) => ((r as Record<string, unknown>).text as string) || "").join(""));
      const text = parts.filter(Boolean).join(" — ");
      if (text) {
        return {
          id: (modeMsg.id as string) || uid(),
          type: "system",
          timestamp: Date.now(),
          author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
          message: [{ type: "text", text }],
        };
      }
    }
  }

  // Single message deleted by mod
  const deleteOne = a.markChatItemAsDeletedAction as Record<string, unknown>;
  if (deleteOne) {
    const targetId = (deleteOne.targetItemId as string) || "";
    if (targetId) {
      return {
        id: targetId,
        type: "deleted",
        timestamp: Date.now(),
        author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
        message: [],
      };
    }
  }

  // Creator/author removed their own message
  const removeAction = a.removeChatItemAction as Record<string, unknown>;
  if (removeAction) {
    const targetId = (removeAction.targetItemId as string) || "";
    if (targetId) {
      return {
        id: targetId,
        type: "deleted",
        timestamp: Date.now(),
        author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
        message: [],
      };
    }
  }

  // Mod hid a user — delete all their messages + block future ones
  const hideAuthor = (
    a.markChatItemsByAuthorAsDeletedAction
    ?? a.removeChatItemByAuthorAction
  ) as Record<string, unknown>;
  if (hideAuthor) {
    const channelId = (hideAuthor.externalChannelId as string) || "";
    if (channelId) {
      return {
        id: `hide-${channelId}-${Date.now()}`,
        type: "hide_author",
        timestamp: Date.now(),
        author: { name: "", channelId, profileImageUrl: "", badges: [] },
        message: [],
      };
    }
  }

  // Replace an existing message (e.g. updated Super Chat, edited pin)
  const replaceAction = a.replaceChatItemAction as Record<string, unknown>;
  if (replaceAction) {
    const targetId = (replaceAction.targetItemId as string) || "";
    const replacementItem = replaceAction.replacementItem as Record<string, unknown>;
    if (targetId && replacementItem) {
      const parsed = actionToEvent({ addChatItemAction: { item: replacementItem } });
      if (parsed) {
        parsed.id = targetId;
        return parsed;
      }
    }
  }

  // Pinned message banner
  const bannerCmd = a.addBannerToLiveChatCommand as Record<string, unknown>;
  if (bannerCmd) {
    const bannerRenderer = dig(bannerCmd, "bannerRenderer", "liveChatBannerRenderer") as Record<string, unknown>;
    if (bannerRenderer) {
      const contents = bannerRenderer.contents as Record<string, unknown>;
      if (contents) {
        const parsed = actionToEvent({ addChatItemAction: { item: contents } });
        if (parsed) {
          return {
            id: `pin-${parsed.id}`,
            type: "pinned",
            timestamp: Date.now(),
            author: parsed.author,
            message: parsed.message,
            superchat: parsed.superchat,
            membership: parsed.membership,
          };
        }
      }
    }
  }

  // Unpin banner
  const removeBanner = a.removeBannerForLiveChatCommand as Record<string, unknown>;
  if (removeBanner) {
    return {
      id: `unpin-${Date.now()}`,
      type: "unpin",
      timestamp: Date.now(),
      author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
      message: [],
    };
  }

  if (typeof window !== "undefined") {
    const knownSkip = ["addLiveChatTickerItemAction", "showLiveChatTooltipCommand",
      "liveChatPlaceholderItemRenderer", "closeLiveChatActionPanelAction",
      "updateLiveChatPollAction", "showLiveChatActionPanelAction"];
    const keys = Object.keys(a);
    if (keys.length > 0 && !keys.some((k) => knownSkip.includes(k))) {
      console.debug("[YouChat] unhandled action:", keys[0], a);
    }
  }

  return null;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ChatCallback = (events: ChatEvent[]) => void;
export type StatusCallback = (status: "live" | "ended" | "error", message?: string) => void;

export class YouTubeChatClient {
  private videoId: string;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onChat: ChatCallback;
  private onStatus: StatusCallback;

  constructor(videoId: string, onChat: ChatCallback, onStatus: StatusCallback) {
    this.videoId = videoId;
    this.onChat = onChat;
    this.onStatus = onStatus;
  }

  async start() {
    this.running = true;
    console.log(`[YouChat] Chat client starting for videoId=${this.videoId}`);

    try {
      const html = await proxyGet(`https://www.youtube.com/live_chat?is_popout=1&v=${this.videoId}`);
      const data = extractInitialData(html);
      if (!data) {
        this.onStatus("error", "Could not parse live chat page. Stream may not be live.");
        return;
      }

      // Get initial messages
      const initialActions = extractActions(data);
      const events = initialActions.map(actionToEvent).filter((e): e is ChatEvent => e !== null);
      if (events.length > 0) this.onChat(events);

      // Get continuation
      const cont = extractContinuation(data);
      if (!cont) {
        this.onStatus("error", "No continuation found. Chat may not be available.");
        return;
      }

      console.log(`[YouChat] Chat connected — got ${events.length} initial messages, polling started`);
      this.onStatus("live");
      this.poll(cont);
    } catch (e) {
      console.error(`[YouChat] Chat client failed to start for videoId=${this.videoId}:`, e);
      this.onStatus("error", "Failed to connect to live chat.");
    }
  }

  private async poll(cont: ContinuationData) {
    if (!this.running) return;

    this.timer = setTimeout(async () => {
      if (!this.running) return;
      try {
        const url = `${LIVE_CHAT_URL}?key=${INNERTUBE_API_KEY}`;
        const body = {
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240101.00.00",
            },
          },
          continuation: cont.continuation,
        };

        const text = await proxyPost(url, body);
        const data = JSON.parse(text);

        const actions = extractActions(data);
        const events = actions.map(actionToEvent).filter((e): e is ChatEvent => e !== null);
        if (events.length > 0) this.onChat(events);

        const nextCont = extractContinuation(data);
        if (nextCont) {
          this.poll(nextCont);
        } else {
          this.onStatus("ended", "Chat stream ended.");
        }
      } catch {
        if (this.running) {
          // Retry after a bit
          this.poll(cont);
        }
      }
    }, Math.max(cont.timeoutMs, 2000));
  }

  stop() {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }
}
