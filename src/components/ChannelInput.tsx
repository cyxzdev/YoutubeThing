"use client";

import { useState, useMemo } from "react";
import { Loader2, Video, AlertTriangle } from "lucide-react";
import { parseYouTubeURL } from "@/lib/url-parser";

interface Props {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  isConnected: boolean;
  variant?: "bar" | "landing";
}

function getResolved(url: string) {
  if (!url.trim()) return null;
  const parsed = parseYouTubeURL(url.trim());
  switch (parsed.type) {
    case "handle":
    case "channel":
      return { type: "channel" as const, label: parsed.value };
    case "video":
    case "live":
      return { type: "video" as const, label: parsed.value };
    default:
      return null;
  }
}

export function ChannelInput({ onSubmit, isLoading, isConnected, variant = "bar" }: Props) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [channelWarning, setChannelWarning] = useState(false);

  const resolved = useMemo(() => getResolved(url), [url]);
  const isChannel = resolved?.type === "channel";
  const canSubmit = url.trim().length > 0 && !isLoading && !isChannel;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isChannel) {
      setChannelWarning(true);
      return;
    }
    setChannelWarning(false);
    if (canSubmit) onSubmit(url.trim());
  };

  const handleChange = (val: string) => {
    setUrl(val);
    if (channelWarning) setChannelWarning(false);
  };

  if (isConnected) return null;

  const isLanding = variant === "landing";

  return (
    <div className={isLanding ? "w-full max-w-[420px]" : ""}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className={`flex items-center w-full bg-[#0e0e10] border rounded-lg overflow-hidden transition-colors ${
          isChannel ? "border-amber-500/40" : focused ? "border-[#9147ff]/50" : "border-[#2a2a32] hover:border-[#3a3a44]"
        } ${isLanding ? "h-11" : "h-9"}`}>
          <input
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Paste a YouTube livestream URL…"
            disabled={isLoading}
            autoFocus
            className={`flex-1 h-full bg-transparent px-3 text-[#efeff1] placeholder:text-[#3a3a44] outline-none disabled:opacity-40 min-w-0 ${
              isLanding ? "text-[13px]" : "text-xs"
            }`}
          />

          {resolved && !isChannel && (
            <div className="flex items-center gap-1 mr-1 bg-[#9147ff]/10 border border-[#9147ff]/20 rounded px-1.5 py-0.5 pointer-events-none flex-shrink-0">
              <Video className="w-2.5 h-2.5 text-[#9147ff]" />
              <span className="text-[10px] text-[#bf94ff] font-mono font-semibold max-w-[100px] truncate">{resolved.label}</span>
            </div>
          )}

          {isChannel && (
            <div className="flex items-center gap-1 mr-1 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 pointer-events-none flex-shrink-0">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
              <span className="text-[10px] text-amber-400 font-semibold">Channel</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex items-center gap-1.5 h-full px-4 font-bold transition-colors flex-shrink-0 ${
              isLanding ? "text-xs" : "text-[11px]"
            } ${
              canSubmit
                ? "bg-[#9147ff] text-white hover:bg-[#7c3aed] cursor-pointer"
                : "bg-[#1a1a1e] text-[#3a3a44] cursor-not-allowed"
            }`}
          >
            {isLoading
              ? <><Loader2 className="w-3 h-3 animate-spin" />Checking</>
              : <>Connect</>}
          </button>
        </div>
      </form>

      {(isChannel || channelWarning) && (
        <div className="mt-2 flex items-start gap-2 px-1 whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-px" />
          <div className="text-[11px] text-amber-400/80 leading-relaxed flex flex-col gap-0">
            <span className="whitespace-nowrap">Channel links are unreliable — we might serve the wrong stream.</span>
            <span className="whitespace-nowrap">
              <span className="text-[#7a7a85]">Use the direct livestream URL:</span>
              <span className="text-[#adadb8] font-mono text-[10px] ml-1">youtube.com/watch?v=...</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
