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
    <div className={isLanding ? "w-full" : ""}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div
          className={`flex items-stretch w-full min-h-0 border transition-colors ${
            isLanding ? "rounded-md h-8" : "rounded-lg h-9"
          } ${
            isChannel ? "border-amber-500/35" : focused ? "border-[#9147ff]/35" : "border-[#2f2f35]"
          } ${!isChannel && !focused ? "hover:border-[#3f3f48]" : ""} bg-[#0e0e10]`}
        >
          <input
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isLanding ? "Live or watch URL" : "Paste a YouTube livestream URL…"}
            disabled={isLoading}
            autoFocus
            className={`flex-1 min-w-0 h-full bg-transparent text-[#efeff1] placeholder:text-[#53535f] outline-none disabled:opacity-40 ${
              isLanding ? "pl-2.5 pr-2 text-[13px]" : "px-3 text-xs"
            }`}
          />

          {resolved && !isChannel && (
            <div
              className={`flex items-center gap-0.5 mr-1 pointer-events-none flex-shrink-0 self-center ${
                isLanding
                  ? "max-w-[5.5rem] text-[10px] text-[#7a7a85] font-mono truncate px-1"
                  : "bg-[#9147ff]/10 border border-[#9147ff]/20 rounded px-1.5 py-0.5 gap-1"
              }`}
            >
              {!isLanding && <Video className="w-2.5 h-2.5 text-[#9147ff]" />}
              <span className={isLanding ? "" : "text-[10px] text-[#bf94ff] font-mono font-semibold max-w-[100px] truncate"}>
                {resolved.label}
              </span>
            </div>
          )}

          {isChannel && (
            <div
              className={`flex items-center gap-1 mr-1 pointer-events-none flex-shrink-0 self-center ${
                isLanding
                  ? "text-[10px] text-amber-500/90 px-1"
                  : "bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5"
              }`}
            >
              {!isLanding && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
              <span className={isLanding ? "" : "text-[10px] text-amber-400 font-semibold"}>Channel</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex items-center justify-center gap-1 flex-shrink-0 border-l border-[#2a2a32] transition-colors ${
              isLanding ? "px-2.5 text-[11px] font-medium" : "h-full px-4 text-[11px] font-bold gap-1.5"
            } ${
              isLanding
                ? canSubmit
                  ? "text-[#c4b5fd] hover:text-[#ede9fe] cursor-pointer"
                  : "text-[#4a4a52] cursor-not-allowed"
                : canSubmit
                  ? "bg-[#9147ff] text-white hover:bg-[#7c3aed] cursor-pointer"
                  : "bg-[#1a1a1e] text-[#3a3a44] cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                <span className={isLanding ? "text-[10px] tabular-nums" : undefined}>Checking</span>
              </>
            ) : (
              "Connect"
            )}
          </button>
        </div>
      </form>

      {(isChannel || channelWarning) && (
        <div className={`mt-2 flex items-start gap-2 px-0.5 ${isLanding ? "" : "whitespace-nowrap"}`}>
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-px" />
          <div className="text-[11px] text-amber-400/80 leading-relaxed flex flex-col gap-1">
            <span className={isLanding ? "" : "whitespace-nowrap"}>
              Channel links are unreliable — we might serve the wrong stream.
            </span>
            <span className={isLanding ? "" : "whitespace-nowrap"}>
              {!isLanding && (
                <>
                  <span className="text-[#7a7a85]">Use the direct livestream URL:</span>
                  <span className="text-[#adadb8] font-mono text-[10px] ml-1">youtube.com/watch?v=...</span>
                </>
              )}
              {isLanding && (
                <span className="text-[#7a7a85]">Use a watch or live URL instead.</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
