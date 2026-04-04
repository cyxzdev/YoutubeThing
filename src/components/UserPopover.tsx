"use client";

import { useMemo, useRef, useState, useLayoutEffect, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X, MessageSquare, DollarSign } from "lucide-react";
import type { ChatEvent } from "@/lib/types";
import { getUsernameColor } from "@/lib/constants";
import { Badge } from "./Badge";

interface Props {
  author: ChatEvent["author"];
  messages: ChatEvent[];
  anchor: { x: number; yBelow: number; yAbove: number };
  onClose: () => void;
}

const WIDTH = 260;
const MAX_HEIGHT = 340;
const MARGIN = 8;

export function UserPopover({ author, messages, anchor, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const drag = useRef({ active: false, startMx: 0, startMy: 0, startPx: 0, startPy: 0 });

  const userMsgs = useMemo(
    () => messages.filter((m) => m.author.channelId === author.channelId).slice(-30),
    [messages, author.channelId]
  );
  const scCount = userMsgs.filter((m) => m.type === "superchat").length;
  const color = getUsernameColor(author.channelId);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.max(MARGIN, Math.min(anchor.x, vw - WIDTH - MARGIN));
    const roomBelow = vh - anchor.yBelow - MARGIN;
    const roomAbove = anchor.yAbove - MARGIN;
    let y: number;
    if (roomBelow >= h) y = anchor.yBelow;
    else if (roomAbove >= h) y = anchor.yAbove - h;
    else if (roomBelow >= roomAbove) y = Math.max(MARGIN, vh - MARGIN - h);
    else y = Math.max(MARGIN, anchor.yAbove - h);
    setPos({ x, y });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [onClose]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      setPos({
        x: Math.max(MARGIN, Math.min(window.innerWidth - WIDTH - MARGIN, drag.current.startPx + (e.clientX - drag.current.startMx))),
        y: Math.max(MARGIN, Math.min(window.innerHeight - 60, drag.current.startPy + (e.clientY - drag.current.startMy))),
      });
    };
    const onUp = () => { if (drag.current.active) { drag.current.active = false; document.body.style.userSelect = ""; document.body.style.cursor = ""; } };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,a")) return;
    e.preventDefault();
    drag.current = { active: true, startMx: e.clientX, startMy: e.clientY, startPx: pos.x, startPy: pos.y };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  }, [pos]);

  const el = (
    <div
      ref={ref}
      className="fixed flex flex-col rounded-lg overflow-hidden shadow-2xl shadow-black/70"
      style={{
        left: pos.x, top: pos.y, width: WIDTH, maxHeight: MAX_HEIGHT,
        zIndex: 99999, background: "#18181b", border: "1px solid #2a2a32",
        animation: "sc-in .12s ease-out",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={onHeaderMouseDown}
        className="flex items-center gap-2 px-2.5 py-2 cursor-grab active:cursor-grabbing select-none flex-shrink-0 border-b border-[#2a2a32]"
      >
        {author.profileImageUrl ? (
          <img src={author.profileImageUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: color }}>
            {author.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-px">
            {author.badges.map((b) => <Badge key={b} type={b} />)}
            <span className="text-[12px] font-bold truncate leading-none" style={{ color }}>{author.name}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-[#53535f]">
            <span className="flex items-center gap-0.5"><MessageSquare className="w-2 h-2" />{userMsgs.length}</span>
            {scCount > 0 && <span className="flex items-center gap-0.5 text-orange-400/70"><DollarSign className="w-2 h-2" />{scCount}</span>}
          </div>
        </div>

        <button onClick={onClose} className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-[#53535f] hover:text-[#efeff1]">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll min-h-0">
        {userMsgs.length === 0 ? (
          <div className="py-6 text-center text-[10px] text-[#3a3a44]">No messages yet</div>
        ) : (
          <div>
            {userMsgs.map((msg) => {
              const t = new Date(msg.timestamp);
              const time = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
              return (
                <div key={msg.id} className="flex items-start gap-1.5 px-2.5 py-1.5 hover:bg-white/[0.02] transition-colors">
                  <span className="flex-shrink-0 mt-px text-[9px] tabular-nums text-[#3a3a44] w-[30px] text-right">{time}</span>
                  <div className="flex-1 min-w-0">
                    {msg.superchat && (
                      <span className="inline-block text-[8px] font-black px-1 py-px rounded-sm bg-orange-500/10 text-orange-400/80 mb-0.5">{msg.superchat.amount}</span>
                    )}
                    {msg.message.length > 0 && (
                      <p className="text-[11px] text-[#adadb8] leading-snug break-words">
                        {msg.message.map((p, i) =>
                          p.type === "emoji" && p.emojiUrl
                            ? <img key={i} src={p.emojiUrl} alt={p.emojiAlt || ""} className="inline-block h-3 w-3 mx-px align-middle" loading="lazy" />
                            : <span key={i}>{p.text}</span>
                        )}
                      </p>
                    )}
                    {msg.message.length === 0 && msg.type === "membership" && (
                      <p className="text-[10px] text-[#2eb67d]/70 italic">Became a member</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <a
        href={`https://youtube.com/channel/${author.channelId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold text-[#9147ff]/70 hover:text-[#bf94ff] hover:bg-[#9147ff]/5 transition-colors flex-shrink-0 border-t border-[#2a2a32]"
      >
        <ExternalLink className="w-2.5 h-2.5" />
        Channel
      </a>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(el, document.body) : null;
}
