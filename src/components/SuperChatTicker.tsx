"use client";

import type { ChatEvent } from "@/lib/types";
import { SUPER_CHAT_TIERS } from "@/lib/constants";
import { useChatSettings, chatFontStyle } from "@/lib/chat-settings";

interface Props {
  superChats: ChatEvent[];
  onItemClick: (author: ChatEvent["author"], e: React.MouseEvent) => void;
}

export function SuperChatTicker({ superChats, onItemClick }: Props) {
  if (superChats.length === 0) return null;
  const recent = superChats.slice(-8);
  const { settings } = useChatSettings();

  return (
    <div className="flex gap-1 px-2 py-1.5 overflow-x-auto chat-scroll border-b border-[#2a2a32] bg-[#111114] flex-shrink-0" style={chatFontStyle(settings)}>
      {recent.map((sc) => {
        const tier = SUPER_CHAT_TIERS[sc.superchat?.tier ?? 4] ?? SUPER_CHAT_TIERS[4];
        return (
          <button
            key={sc.id}
            onClick={(e) => onItemClick(sc.author, e)}
            className="flex items-center gap-1 px-2 py-1 flex-shrink-0 hover:brightness-110 transition-all"
            style={{ background: `${tier.headerBg}cc` }}
          >
            <img src={sc.author.profileImageUrl} alt="" className="w-4 h-4 rounded-full" />
            <span className="text-[10px] text-white/80 font-medium max-w-[50px] truncate">{sc.author.name}</span>
            <span className="text-[9px] text-white font-black">{sc.superchat?.amount}</span>
          </button>
        );
      })}
    </div>
  );
}
