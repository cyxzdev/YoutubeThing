"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import type { ChatEvent } from "@/lib/types";

interface Props {
  onInject: (events: ChatEvent[]) => void;
}

const uid = () => `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const FAKE_AUTHOR = {
  name: "TestUser",
  channelId: "UC_admin_test",
  profileImageUrl: "https://yt3.ggpht.com/ytc/AIdro_kB4J5JxN5CW_VgRvPzRuqBkJGu8TqaEloEs2NFRA=s88-c-k-c0x00ffffff-no-rj",
  badges: [] as ChatEvent["author"]["badges"],
};

const EVENTS: { label: string; make: () => ChatEvent }[] = [
  {
    label: "Chat Message",
    make: () => ({
      id: uid(), type: "message", timestamp: Date.now(), author: FAKE_AUTHOR,
      message: [{ type: "text", text: "This is a test chat message from the admin panel." }],
    }),
  },
  {
    label: "Super Chat ($50)",
    make: () => ({
      id: uid(), type: "superchat", timestamp: Date.now(), author: { ...FAKE_AUTHOR, name: "BigDonor" },
      message: [{ type: "text", text: "Huge donation! Love the stream!" }],
      superchat: { amount: "$50.00", color: "#e62117", tier: 7 },
    }),
  },
  {
    label: "Membership (new)",
    make: () => ({
      id: uid(), type: "membership", timestamp: Date.now(), author: { ...FAKE_AUTHOR, name: "NewMember", badges: ["member"] },
      message: [],
      membership: { type: "new", text: "Welcome! NewMember just became a member!" },
    }),
  },
  {
    label: "Gifted Membership",
    make: () => ({
      id: uid(), type: "membership", timestamp: Date.now(), author: { ...FAKE_AUTHOR, name: "GenerousGifter" },
      message: [],
      membership: { type: "gifting", text: "Gifted 5 memberships" },
    }),
  },
  {
    label: "Gift Received",
    make: () => ({
      id: uid(), type: "membership", timestamp: Date.now(), author: { ...FAKE_AUTHOR, name: "LuckyViewer" },
      message: [],
      membership: { type: "gift_received", text: "Was gifted a membership by GenerousGifter" },
    }),
  },
  {
    label: "System Message",
    make: () => ({
      id: uid(), type: "system", timestamp: Date.now(),
      author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
      message: [{ type: "text", text: "Welcome to live chat! Remember to guard your privacy and never give out personal information." }],
    }),
  },
  {
    label: "Mode Change",
    make: () => ({
      id: uid(), type: "system", timestamp: Date.now(),
      author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
      message: [{ type: "text", text: "Slow mode is on — Send a message every 5 seconds" }],
    }),
  },
  {
    label: "Pinned Message",
    make: () => ({
      id: uid(), type: "pinned", timestamp: Date.now(),
      author: { ...FAKE_AUTHOR, name: "Streamer", badges: ["owner"] },
      message: [{ type: "text", text: "GIVEAWAY: Type !enter to participate! Ends in 10 minutes." }],
    }),
  },
  {
    label: "Unpin",
    make: () => ({
      id: uid(), type: "unpin", timestamp: Date.now(),
      author: { name: "", channelId: "", profileImageUrl: "", badges: [] },
      message: [],
    }),
  },
  {
    label: "Retracted Message",
    make: () => ({
      id: uid(), type: "message", timestamp: Date.now(),
      author: { ...FAKE_AUTHOR, name: "OopsUser" },
      message: [{ type: "text", text: "This message was supposed to be deleted..." }],
      retracted: true,
    }),
  },
];

export function AdminPanel({ onInject }: Props) {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const panel = { initiate: show, show, hide };
    (window as unknown as Record<string, unknown>).adminpanel = panel;
    return () => { delete (window as unknown as Record<string, unknown>).adminpanel; };
  }, [show, hide]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-64 bg-[#18181b] border border-[#2a2a32] rounded-lg shadow-2xl shadow-black/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a32] bg-[#1a1a1f]">
        <span className="text-[11px] font-bold text-[#9147ff] uppercase tracking-wider">Admin Panel</span>
        <button onClick={hide} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-[#53535f] hover:text-[#adadb8] transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto chat-scroll">
        <p className="text-[10px] text-[#53535f] px-1 pb-1">Inject test events into the chat stream</p>
        {EVENTS.map((ev) => (
          <button
            key={ev.label}
            onClick={() => onInject([ev.make()])}
            className="w-full text-left px-2.5 py-1.5 text-[11px] text-[#adadb8] rounded hover:bg-[#26262c] hover:text-[#efeff1] transition-colors cursor-pointer"
          >
            {ev.label}
          </button>
        ))}
      </div>
    </div>
  );
}
