"use client";

import type { ChatEvent } from "@/lib/types";

interface Props {
  event: ChatEvent;
  onNameClick: (author: ChatEvent["author"], e: React.MouseEvent) => void;
  animate?: boolean;
}

const STYLES = {
  new:           { border: "border-green-500/40", bg: "bg-green-500/[0.05]", name: "text-green-400", label: "text-green-500/60" },
  milestone:     { border: "border-green-500/40", bg: "bg-green-500/[0.05]", name: "text-green-400", label: "text-green-500/60" },
  gifting:       { border: "border-purple-500/40", bg: "bg-purple-500/[0.05]", name: "text-purple-400", label: "text-purple-500/60" },
  gift_received: { border: "border-pink-500/40", bg: "bg-pink-500/[0.05]", name: "text-pink-400", label: "text-pink-500/60" },
};

export function MembershipEvent({ event, onNameClick, animate }: Props) {
  const memberType = event.membership?.type || "new";
  const s = STYLES[memberType] || STYLES.new;

  return (
    <div className={`mx-4 my-[3px] border-l-2 ${s.border} ${s.bg}${animate ? " anim-sc" : ""}`}>
      <div className="px-3 py-1">
        <span
          className={`text-xs font-bold ${s.name} cursor-pointer hover:underline`}
          onClick={(e) => onNameClick(event.author, e)}
        >{event.author.name}</span>
        <span className={`text-[11px] ${s.label} ml-1.5`}>{event.membership?.text || "New member"}</span>
      </div>
      {event.message.length > 0 && (
        <div className="px-3 pb-1 text-xs text-[#ccc]">
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
