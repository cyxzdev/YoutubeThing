"use client";

import { useRef, useEffect, useCallback, useState, useLayoutEffect } from "react";
import { Pause, ArrowDown, Pin, X } from "lucide-react";
import type { ChatEvent, ConnectionStatus } from "@/lib/types";
import type { ChatFilter } from "./ChatFilters";
import { ChatMessage } from "./ChatMessage";
import { SuperChatCard } from "./SuperChatCard";
import { MembershipEvent } from "./MembershipEvent";
import { useChatSettings } from "@/lib/chat-settings";

interface Props {
  messages: ChatEvent[];
  status: ConnectionStatus;
  filter: ChatFilter;
  tabAwayMarkerId: string | null;
  onNameClick: (author: ChatEvent["author"], e: React.MouseEvent) => void;
}

export function ChatContainer({ messages, status, filter, tabAwayMarkerId, onNameClick }: Props) {
  const { settings } = useChatSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [paused, setPaused] = useState(false);
  const [missedCount, setMissedCount] = useState(0);
  const [pinnedMessage, setPinnedMessage] = useState<ChatEvent | null>(null);

  const savedDistFromBottom = useRef<number | null>(null);
  const prevMsgCount = useRef(messages.length);
  const seenIdsRef = useRef(new Set<string>());

  // Track pinned/unpin events from the message stream
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const ev = messages[i];
      if (ev.type === "pinned") {
        setPinnedMessage(ev);
        break;
      }
      if (ev.type === "unpin") {
        setPinnedMessage(null);
        break;
      }
    }
  }, [messages]);

  const scrollToEnd = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const resume = useCallback(() => {
    stickRef.current = true;
    savedDistFromBottom.current = null;
    setPaused(false);
    setMissedCount(0);
    requestAnimationFrame(scrollToEnd);
  }, [scrollToEnd]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const newCount = messages.length;
    const diff = newCount - prevMsgCount.current;
    prevMsgCount.current = newCount;

    if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    } else if (diff > 0) {
      if (savedDistFromBottom.current != null) {
        el.scrollTop = el.scrollHeight - el.clientHeight - savedDistFromBottom.current;
      }
      setMissedCount((c) => c + diff);
    }
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      const wasStick = stickRef.current;
      if (gap < 50) {
        stickRef.current = true;
        savedDistFromBottom.current = null;
        if (!wasStick) {
          setPaused(false);
          setMissedCount(0);
        }
      } else {
        stickRef.current = false;
        savedDistFromBottom.current = gap;
        if (wasStick) {
          setPaused(true);
        }
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Pinned message banner */}
      {settings.showPinnedMessages && pinnedMessage && (
        <PinnedBanner event={pinnedMessage} onDismiss={() => setPinnedMessage(null)} />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden chat-scroll py-1">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center">
            <Empty status={status} filter={filter} />
          </div>
        ) : (
          messages.map((ev, i) => {
            if (ev.type === "pinned" || ev.type === "unpin") return null;
            if (ev.type === "system" && !settings.showSystemMessages) return null;
            if (ev.type === "membership" && (ev.membership?.type === "gifting" || ev.membership?.type === "gift_received") && !settings.showGiftedMemberships) return null;

            const animate = !seenIdsRef.current.has(ev.id);
            if (animate) seenIdsRef.current.add(ev.id);

            const showMarker = tabAwayMarkerId != null && ev.id === tabAwayMarkerId;
            return (
              <div key={ev.id}>
                {showMarker && <TabAwayLine />}
                {ev.type === "superchat" ? (
                  <div className="hover:bg-white/[0.03] transition-colors">
                    <SuperChatCard event={ev} onNameClick={onNameClick} animate={animate} />
                  </div>
                ) : ev.type === "membership" ? (
                  <div className="hover:bg-white/[0.03] transition-colors">
                    <MembershipEvent event={ev} onNameClick={onNameClick} animate={animate} />
                  </div>
                ) : ev.type === "system" ? (
                  <SystemMessage event={ev} />
                ) : (
                  <ChatMessage event={ev} odd={i % 2 === 1} onNameClick={onNameClick} />
                )}
              </div>
            );
          })
        )}
      </div>

      {paused && (
        <button
          onClick={resume}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#9147ff] hover:bg-[#772ce8] text-white text-xs font-bold rounded-md cursor-pointer transition-colors z-20 shadow-lg shadow-black/40"
        >
          <Pause className="w-3.5 h-3.5" />
          Chat paused
          {missedCount > 0 && (
            <span className="inline-flex items-center gap-1 border-l border-white/20 pl-2 ml-0.5">
              <ArrowDown className="w-3 h-3" />
              {missedCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function PinnedBanner({ event, onDismiss }: { event: ChatEvent; onDismiss: () => void }) {
  const text = event.message.map((p) => p.text || "").join("");
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1f] border-b border-[#2a2a32] flex-shrink-0">
      <Pin className="w-3 h-3 text-[#9147ff] flex-shrink-0 rotate-45" />
      {event.author.profileImageUrl && (
        <img
          src={event.author.profileImageUrl}
          alt=""
          className="w-5 h-5 rounded-full flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        {event.author.name && (
          <span className="text-[11px] font-bold text-[#adadb8] mr-1.5">{event.author.name}</span>
        )}
        <span className="text-[11px] text-[#7a7a85] truncate">{text || "Pinned message"}</span>
      </div>
      <button onClick={onDismiss} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-[#53535f] hover:text-[#adadb8] transition-colors flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function SystemMessage({ event }: { event: ChatEvent }) {
  const text = event.message.map((p) => p.text || "").join("");
  if (!text) return null;
  return (
    <div className="px-5 py-1">
      <span className="text-[11px] text-[#53535f] italic">{text}</span>
    </div>
  );
}

function TabAwayLine() {
  return (
    <div className="flex items-center gap-2 px-5 py-1 my-[2px]">
      <div className="flex-1 h-px bg-[#9147ff]/40" />
      <span className="text-[9px] text-[#9147ff]/60 font-semibold uppercase tracking-widest flex-shrink-0">new</span>
      <div className="flex-1 h-px bg-[#9147ff]/40" />
    </div>
  );
}

function Empty({ status, filter }: { status: ConnectionStatus; filter: ChatFilter }) {
  if (status === "connecting") {
    return (
      <div className="text-center">
        <div className="w-5 h-5 border-2 border-[#9147ff] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-[#7a7a85]">Connecting to live chat...</p>
      </div>
    );
  }
  if (status === "live") {
    return <p className="text-xs text-[#53535f]">{filter !== "all" ? "No matching messages" : "Waiting for messages..."}</p>;
  }
  if (status === "ended") {
    return <p className="text-xs text-[#53535f]">Stream ended</p>;
  }
  return null;
}
