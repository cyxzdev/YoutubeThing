"use client";

import { useState, useEffect } from "react";
import { Settings, X } from "lucide-react";

const STORAGE_KEY = "yt-settings-hint-dismissed";

interface Props {
  onOpenSettings: () => void;
}

export function SettingsHint({ onOpenSettings }: Props) {
  const [phase, setPhase] = useState<"hidden" | "entering" | "skeleton" | "cta" | "leaving">("hidden");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { return; }

    const t1 = setTimeout(() => setPhase("entering"), 1200);
    const t2 = setTimeout(() => setPhase("skeleton"), 1500);
    const t3 = setTimeout(() => setPhase("cta"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === "hidden") return null;

  const dismiss = () => {
    setPhase("leaving");
    setTimeout(() => {
      setPhase("hidden");
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }, 250);
  };

  const isOut = phase === "entering" || phase === "leaving";

  return (
    <div className="absolute top-3 right-3 z-30" style={{ width: 240 }}>
      <div
        className={`transition-all duration-300 ease-out ${
          isOut ? "opacity-0 -translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        <div className="relative bg-[#18181b] border border-[#2e2e38] rounded-lg shadow-xl shadow-black/50 overflow-hidden">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-[#53535f] hover:text-[#adadb8] transition-colors z-10"
          >
            <X className="w-2.5 h-2.5" />
          </button>

          <div className="px-3.5 pt-3 pb-3">
            {/* Text */}
            <p className="text-[11px] text-[#adadb8] leading-snug pr-5 mb-3">
              <span className="text-[#efeff1] font-semibold">Hey Theo</span>
              <span className="text-[#53535f]"> — </span>
              your chat, your rules. Tweak it.
            </p>

            {/* Skeleton lines — staggered fade in */}
            <div className="space-y-[5px] mb-3">
              {[
                { nameW: 44, msgW: "72%", color: "#9147ff", delay: 0 },
                { nameW: 36, msgW: "55%", color: "#2eb67d", delay: 120 },
                { nameW: 52, msgW: "40%", color: "#e0a526", delay: 240 },
              ].map((line, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 transition-all duration-300"
                  style={{
                    opacity: phase === "skeleton" || phase === "cta" ? 1 : 0,
                    transform: phase === "skeleton" || phase === "cta" ? "translateX(0)" : "translateX(-6px)",
                    transitionDelay: `${line.delay}ms`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-[#2a2a32] flex-shrink-0" />
                  <div className="rounded-sm h-[7px] flex-shrink-0" style={{ width: line.nameW, backgroundColor: line.color, opacity: 0.35 }} />
                  <div className="rounded-sm h-[7px] bg-[#2a2a32] flex-1" style={{ maxWidth: line.msgW }} />
                </div>
              ))}
            </div>

            {/* CTA button — fades in last */}
            <button
              onClick={() => { onOpenSettings(); dismiss(); }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md bg-[#9147ff] hover:bg-[#7c3aed] transition-all cursor-pointer group active:scale-[0.97]"
              style={{
                opacity: phase === "cta" ? 1 : 0,
                transform: phase === "cta" ? "translateY(0)" : "translateY(4px)",
                transition: "opacity 300ms ease-out, transform 300ms ease-out, background-color 150ms",
              }}
            >
              <Settings className="w-3.5 h-3.5 text-white/80 group-hover:rotate-90 transition-transform duration-500 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-white">Open Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
