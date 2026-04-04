"use client";

import type { ChatEvent } from "@/lib/types";
import { SUPER_CHAT_TIERS } from "@/lib/constants";

interface Props {
  event: ChatEvent;
  onNameClick: (author: ChatEvent["author"], e: React.MouseEvent) => void;
  animate?: boolean;
}

export function SuperChatCard({ event, onNameClick, animate }: Props) {
  if (!event.superchat) return null;
  const tier = SUPER_CHAT_TIERS[event.superchat.tier] ?? SUPER_CHAT_TIERS[4];

  return (
    <div className={`mx-4 my-[3px]${animate ? " anim-sc" : ""}`} style={{ backgroundColor: tier.bg }}>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: tier.headerBg }}>
        <img src={event.author.profileImageUrl} alt="" className="w-5 h-5 rounded-full" loading="lazy" />
        <span
          className="text-xs font-bold text-white/90 cursor-pointer hover:underline"
          onClick={(e) => onNameClick(event.author, e)}
        >{event.author.name}</span>
        <span className="text-[11px] font-black text-white ml-auto">{event.superchat.amount}</span>
        {event.superchat.sticker && (
          <img src={event.superchat.sticker.url} alt={event.superchat.sticker.alt} className="w-6 h-6" />
        )}
      </div>
      {event.message.length > 0 && (
        <div className="px-3 py-1 text-xs text-white/90">
          {event.message.map((p, i) =>
            p.type === "emoji" && p.emojiUrl
              ? <img key={i} src={p.emojiUrl} alt="" className="inline-block h-4 w-4 mx-px align-middle" />
              : <span key={i}>{p.text}</span>
          )}
        </div>
      )}
    </div>
  );
}
