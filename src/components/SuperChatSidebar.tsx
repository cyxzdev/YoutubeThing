"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { ChatEvent } from "@/lib/types";
import { SUPER_CHAT_TIERS, getUsernameColor } from "@/lib/constants";
import { useChatSettings, chatFontStyle } from "@/lib/chat-settings";
import { DollarSign, Star, Gift, Zap } from "lucide-react";

interface Props {
  superChats: ChatEvent[];
  memberships: ChatEvent[];
  onItemClick: (author: ChatEvent["author"], e: React.MouseEvent) => void;
}

type FeedFilter = "all" | "superchats" | "members";

const MIN_WIDTH = 260;
const MAX_WIDTH = 540;
const DEFAULT_WIDTH = 340;

function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const FEED_TABS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "superchats", label: "Super Chats" },
  { id: "members", label: "Members" },
];

export function SuperChatSidebar({ superChats, memberships, onItemClick }: Props) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const { settings } = useChatSettings();

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const allEvents = [...superChats, ...memberships].sort((a, b) => b.timestamp - a.timestamp);
  const events =
    feedFilter === "superchats" ? allEvents.filter((e) => e.type === "superchat")
    : feedFilter === "members" ? allEvents.filter((e) => e.type === "membership")
    : allEvents;

  const tabCounts = {
    all: allEvents.length,
    superchats: superChats.length,
    members: memberships.length,
  };

  return (
    <div
      className="flex-shrink-0 border-l border-[#2a2a32] bg-[#0e0e10] flex flex-col relative"
      style={{ width, ...chatFontStyle(settings) }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group"
      >
        <div className="absolute inset-y-0 left-0 w-px bg-[#2a2a32] group-hover:bg-[#9147ff]/50 group-active:bg-[#9147ff] transition-colors" />
      </div>

      {/* Header */}
      <div className="px-4 pt-3 pb-0 flex-shrink-0">
        <h2 className="text-[13px] font-bold text-[#efeff1] mb-3">Activity Feed</h2>

        {/* Tab switcher */}
        <div className="flex items-center gap-0 border-b border-[#2a2a32]">
          {FEED_TABS.map(({ id, label }) => {
            const isActive = feedFilter === id;
            const count = tabCounts[id];
            return (
              <button
                key={id}
                onClick={() => setFeedFilter(id)}
                className={`relative pb-2 px-3 text-[12px] font-semibold transition-colors ${
                  isActive ? "text-[#efeff1]" : "text-[#6a6a78] hover:text-[#adadb8]"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-1 text-[9px] tabular-nums ${isActive ? "text-[#9147ff]" : "text-[#3a3a44]"}`}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9147ff] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto chat-scroll pt-1">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <div className="w-10 h-10 rounded-full bg-[#1a1a1e] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#3a3a44]" />
            </div>
            <p className="text-[11px] text-[#53535f] text-center leading-relaxed">
              {feedFilter === "all"
                ? "Super Chats and memberships will appear here."
                : `No ${label(feedFilter).toLowerCase()} yet.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} onClick={onItemClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function label(f: FeedFilter) {
  return f === "superchats" ? "Super Chats" : "Memberships";
}

function EventCard({
  event,
  onClick,
}: {
  event: ChatEvent;
  onClick: (author: ChatEvent["author"], e: React.MouseEvent) => void;
}) {
  const isSC = event.type === "superchat";
  const tier = isSC ? SUPER_CHAT_TIERS[event.superchat?.tier ?? 4] ?? SUPER_CHAT_TIERS[4] : null;
  const nameColor = getUsernameColor(event.author.channelId);

  const TypeIcon = isSC ? DollarSign : event.membership?.type === "gifting" ? Gift : Star;
  const accentColor = isSC ? tier!.headerBg : "#00c853";

  return (
    <div
      onClick={(e) => onClick(event.author, e)}
      className="px-4 py-3 hover:bg-[#111114] cursor-pointer transition-colors"
    >
      <div className="flex gap-3 items-start">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {event.author.profileImageUrl ? (
            <img
              src={event.author.profileImageUrl}
              alt=""
              className="w-8 h-8 rounded-full"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
              style={{ background: nameColor }}
            >
              {event.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center border-2 border-[#0e0e10]"
            style={{ background: accentColor }}
          >
            <TypeIcon className="w-[7px] h-[7px] text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + amount + time */}
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span
              className="text-[12px] font-bold leading-none"
              style={{ color: nameColor }}
            >
              {event.author.name}
            </span>
            {isSC && event.superchat?.amount && (
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded-sm leading-none"
                style={{ background: accentColor, color: "#fff" }}
              >
                {event.superchat.amount}
              </span>
            )}
            <span className="text-[10px] text-[#3a3a44] ml-auto tabular-nums flex-shrink-0">
              {timeAgo(event.timestamp)}
            </span>
          </div>

          {/* Row 2: event type label */}
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: accentColor }}>
            {isSC ? "Super Chat" : getMembershipLabel(event)}
          </p>

          {/* Full message */}
          {event.message.length > 0 && (
            <p className="text-[12px] text-[#c8c8d0] leading-relaxed break-words">
              {event.message.map((p, i) =>
                p.type === "emoji" && p.emojiUrl ? (
                  <img
                    key={i}
                    src={p.emojiUrl}
                    alt={p.emojiAlt || ""}
                    className="inline-block mx-0.5 align-middle"
                    style={{ height: 16, width: 16 }}
                    loading="lazy"
                  />
                ) : (
                  <span key={i}>{p.text}</span>
                )
              )}
            </p>
          )}

          {/* Membership text */}
          {event.membership?.text && (
            <p className="text-[11px] text-[#6a6a78] mt-0.5 italic">{event.membership.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getMembershipLabel(event: ChatEvent): string {
  switch (event.membership?.type) {
    case "gifting":      return "Gifted Subs";
    case "gift_received":return "Gift Received";
    case "milestone":   return "Milestone";
    default:            return "New Member";
  }
}
