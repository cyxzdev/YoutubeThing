import { NextRequest } from "next/server";
import { LiveChat } from "youtube-chat";
import type { ChatItem, EmojiItem } from "youtube-chat/dist/types/data";
import type { ChatEvent, MessagePart, BadgeType, SuperChatInfo } from "@/lib/types";
import { SUPER_CHAT_COLOR_TO_TIER } from "@/lib/constants";

function isEmojiItem(item: { text: string } | EmojiItem): item is EmojiItem {
  return "emojiText" in item;
}

function mapMessageParts(items: ChatItem["message"]): MessagePart[] {
  return items.map((item) => {
    if (isEmojiItem(item)) {
      return {
        type: "emoji" as const,
        emojiUrl: item.url,
        emojiAlt: item.emojiText || item.alt,
      };
    }
    return { type: "text" as const, text: item.text };
  });
}

function mapBadges(chatItem: ChatItem): BadgeType[] {
  const badges: BadgeType[] = [];
  if (chatItem.isOwner) badges.push("owner");
  if (chatItem.isModerator) badges.push("moderator");
  if (chatItem.isMembership) badges.push("member");
  if (chatItem.isVerified) badges.push("verified");
  return badges;
}

function mapSuperChat(chatItem: ChatItem): SuperChatInfo | undefined {
  if (!chatItem.superchat) return undefined;
  const { amount, color, sticker } = chatItem.superchat;
  const tier = SUPER_CHAT_COLOR_TO_TIER[color] ?? 4;
  return {
    amount,
    color,
    tier,
    sticker: sticker ? { url: sticker.url, alt: sticker.alt } : undefined,
  };
}

function chatItemToEvent(chatItem: ChatItem): ChatEvent {
  const superchat = mapSuperChat(chatItem);
  const isMembershipEvent = chatItem.isMembership && !superchat;
  const hasNoContent = chatItem.message.length === 0 && !superchat && !isMembershipEvent;

  return {
    id: chatItem.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: hasNoContent ? "deleted" : superchat ? "superchat" : isMembershipEvent ? "membership" : "message",
    timestamp: chatItem.timestamp.getTime(),
    author: {
      name: chatItem.author.name,
      channelId: chatItem.author.channelId,
      profileImageUrl: chatItem.author.thumbnail?.url ?? "",
      badges: mapBadges(chatItem),
    },
    message: mapMessageParts(chatItem.message),
    superchat,
    membership: isMembershipEvent
      ? { type: "new", text: "Welcome new member!" }
      : undefined,
  };
}

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get("channelId");
  const handle = request.nextUrl.searchParams.get("handle");
  const videoId = request.nextUrl.searchParams.get("videoId");

  if (!channelId && !handle && !videoId) {
    return new Response(
      JSON.stringify({ error: "Missing channelId, handle, or videoId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let liveChat: LiveChat;
  if (videoId) {
    liveChat = new LiveChat({ liveId: videoId });
  } else if (channelId) {
    liveChat = new LiveChat({ channelId });
  } else {
    liveChat = new LiveChat({ handle: handle! });
  }

  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController | null = null;
  let alive = true;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;

      // Send a keepalive ping every 20s so proxies don't cut the connection
      keepaliveTimer = setInterval(() => {
        if (!alive) { if (keepaliveTimer) clearInterval(keepaliveTimer); return; }
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { alive = false; if (keepaliveTimer) clearInterval(keepaliveTimer); }
      }, 20_000);

      liveChat.on("start", (liveId: string) => {
        if (!alive) return;
        const event = JSON.stringify({
          type: "system",
          data: { message: `Connected to live chat: ${liveId}` },
        });
        try {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } catch {}
      });

      liveChat.on("chat", (chatItem: ChatItem) => {
        if (!alive) return;
        const mapped = chatItemToEvent(chatItem);
        const event = JSON.stringify({ type: "chat", data: mapped });
        try {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } catch {}
      });

      liveChat.on("end", (reason?: string) => {
        if (!alive) return;
        alive = false;
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        const event = JSON.stringify({
          type: "end",
          data: { message: reason || "Stream ended" },
        });
        try {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          controller.close();
        } catch {}
      });

      liveChat.on("error", (err: Error | unknown) => {
        if (!alive) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        const event = JSON.stringify({
          type: "error",
          data: { message },
        });
        try {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } catch {}
      });

      liveChat.start().then((ok) => {
        if (!ok && alive) {
          alive = false;
          const event = JSON.stringify({
            type: "error",
            data: {
              message:
                "Could not connect to live chat. Make sure the channel is currently live.",
            },
          });
          try {
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
            controller.close();
          } catch {}
        }
      });
    },
    cancel() {
      alive = false;
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      try {
        liveChat.stop("Client disconnected");
      } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
