"use client";

import { useState } from "react";
import type { ChatEvent } from "@/lib/types";
import { getUsernameColor } from "@/lib/constants";
import { Badge } from "./Badge";
import { useChatSettings, chatFontStyle } from "@/lib/chat-settings";

interface Props {
  event: ChatEvent;
  odd: boolean;
  onNameClick: (author: ChatEvent["author"], e: React.MouseEvent) => void;
}

export function ChatMessage({ event, odd, onNameClick }: Props) {
  const { settings } = useChatSettings();
  const color = getUsernameColor(event.author.channelId);
  const [showOriginal, setShowOriginal] = useState(false);

  if (event.retracted) {
    return (
      <div
        className="chat-line px-5 py-[2px] group hover:bg-[#26262c] transition-colors"
        style={{ fontSize: settings.fontSize, ...chatFontStyle(settings) }}
        onMouseEnter={() => settings.showRetractedOriginal && setShowOriginal(true)}
        onMouseLeave={() => setShowOriginal(false)}
      >
        {settings.showProfileImages && event.author.profileImageUrl && (
          <img
            src={event.author.profileImageUrl}
            alt=""
            className="w-5 h-5 rounded-full inline-block mr-1 align-middle opacity-30"
            loading="lazy"
          />
        )}
        {showOriginal ? (
          <>
            <span className="font-bold opacity-40" style={{ color }}>{event.author.name}</span>
            <span className="text-[#adadb8] opacity-40">: </span>
            <span className="text-[#efeff1] opacity-40">{event.message.map((p, i) =>
              p.type === "emoji" && p.emojiUrl
                ? <img key={i} src={p.emojiUrl} alt={p.emojiAlt || ""} className="inline-block mx-[1px] align-middle opacity-40" style={{ height: settings.emojiSize, width: settings.emojiSize }} loading="lazy" />
                : <span key={i}>{p.text}</span>
            )}</span>
          </>
        ) : (
          <span className="text-[11px] text-[#53535f] italic">message retracted</span>
        )}
      </div>
    );
  }

  if (event.type === "deleted") {
    return (
      <div className="chat-line px-5 py-[1px] text-[#53535f]" style={{ fontSize: settings.fontSize, ...chatFontStyle(settings) }}>
        <span className="italic text-[11px]">message deleted</span>
      </div>
    );
  }

  return (
    <div
      className={`chat-line px-5 hover:bg-[#26262c] ${
        settings.compactMode ? "py-[1px]" : "py-[3px]"
      } ${settings.alternateBackground && odd ? "bg-[#1a1a1e]" : ""}`}
      style={{ fontSize: settings.fontSize, ...chatFontStyle(settings) }}
    >
      {settings.showProfileImages && event.author.profileImageUrl && (
        <img
          src={event.author.profileImageUrl}
          alt=""
          className="w-5 h-5 rounded-full inline-block mr-1 align-middle"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {settings.showTimestamps && (
        <span className="text-[11px] text-[#53535f] mr-1 font-mono tabular-nums">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      {settings.showBadges && event.author.badges.map((b) => (
        <span key={b} className="inline-flex align-middle mr-[2px]"><Badge type={b} /></span>
      ))}
      <span
        className="font-bold cursor-pointer hover:underline decoration-1 underline-offset-2"
        style={{ color }}
        onClick={(e) => onNameClick(event.author, e)}
      >{event.author.name}</span>
      <span className="text-[#adadb8]">: </span>
      <span className="text-[#efeff1]">{event.message.map((p, i) =>
        p.type === "emoji" && p.emojiUrl
          ? <img key={i} src={p.emojiUrl} alt={p.emojiAlt || ""} className="inline-block mx-[1px] align-middle" style={{ height: settings.emojiSize, width: settings.emojiSize }} loading="lazy" />
          : <span key={i}>{p.text}</span>
      )}</span>
    </div>
  );
}
