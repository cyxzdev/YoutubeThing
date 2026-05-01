"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Eye, Pin } from "lucide-react";
import { useChatSettings } from "@/lib/chat-settings";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: Props) {
  const { settings, updateSetting, resetSettings } = useChatSettings();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Chat Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 chat-scroll space-y-5">
          <Section title="Appearance">
            <SliderRow
              label="Font Size"
              value={settings.fontSize}
              min={10} max={20} step={1} unit="px"
              onChange={(v) => updateSetting("fontSize", v)}
            />
            <SliderRow
              label="Emoji Size"
              value={settings.emojiSize}
              min={16} max={48} step={4} unit="px"
              onChange={(v) => updateSetting("emojiSize", v)}
            />
            <ToggleRow
              label='Twitch font (Roobert)'
              checked={settings.chatFontPreset === "twitch"}
              onChange={(v) => updateSetting("chatFontPreset", v ? "twitch" : "default")}
            />
            <p className="px-3 pt-2 pb-4 text-[10px] text-[#53535f] leading-relaxed">
              Uses Roobert.
            </p>
          </Section>

          <Section title="Layout" preview={<LayoutPreview />}>
            <ToggleRow label="Compact Mode" checked={settings.compactMode} onChange={(v) => updateSetting("compactMode", v)} />
            <ToggleRow label="Show Timestamps" checked={settings.showTimestamps} onChange={(v) => updateSetting("showTimestamps", v)} />
            <ToggleRow label="Show Avatars" checked={settings.showProfileImages} onChange={(v) => updateSetting("showProfileImages", v)} />
            <ToggleRow label="Show Badges" checked={settings.showBadges} onChange={(v) => updateSetting("showBadges", v)} />
            <ToggleRow label="Alternating Rows" checked={settings.alternateBackground} onChange={(v) => updateSetting("alternateBackground", v)} />
          </Section>

          <Section title="Super Chats" preview={<SuperChatPreview />}>
            <ToggleRow label="Sidebar Panel" checked={settings.superChatSidebar} onChange={(v) => updateSetting("superChatSidebar", v)} />
            <p className="px-3 py-1.5 text-[10px] text-[#53535f]">Show Super Chats in a panel on the right instead of the ticker bar at the top.</p>
          </Section>

          <Section title="Events" preview={<EventsPreview />}>
            <ToggleRow label="Reveal Retracted on Hover" checked={settings.showRetractedOriginal} onChange={(v) => updateSetting("showRetractedOriginal", v)} />
            <ToggleRow label="System Messages" checked={settings.showSystemMessages} onChange={(v) => updateSetting("showSystemMessages", v)} />
            <ToggleRow label="Gifted Memberships" checked={settings.showGiftedMemberships} onChange={(v) => updateSetting("showGiftedMemberships", v)} />
            <ToggleRow label="Pinned Messages" checked={settings.showPinnedMessages} onChange={(v) => updateSetting("showPinnedMessages", v)} />
          </Section>
        </div>

        <div className="px-4 py-3 border-t border-[#2a2a32]">
          <Button variant="outline" className="w-full" onClick={resetSettings}>
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children, preview }: { title: string; children: React.ReactNode; preview?: React.ReactNode }) {
  const [showPreview, setShowPreview] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setAnchor({ x: r.left + r.width / 2, y: r.bottom + 6 });
    }
    setShowPreview(true);
  }, []);
  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setShowPreview(false), 400);
  }, []);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <h3 className="text-[10px] font-bold text-[#7a7a85] uppercase tracking-widest">{title}</h3>
        {preview && (
          <div onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <button ref={btnRef} className="w-4 h-4 flex items-center justify-center rounded text-[#3a3a44] hover:text-[#7a7a85] transition-colors">
              <Eye className="w-3 h-3" />
            </button>
            {showPreview && anchor && (
              <PreviewCard anchor={anchor} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
                {preview}
              </PreviewCard>
            )}
          </div>
        )}
      </div>
      <div className="bg-[#0e0e10] border border-[#2a2a32] divide-y divide-[#2a2a32]">{children}</div>
    </div>
  );
}

const CARD_W = 200;

function PreviewCard({ anchor, children, onMouseEnter, onMouseLeave }: {
  anchor: { x: number; y: number };
  children: React.ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const left = Math.max(8, Math.min(anchor.x - CARD_W / 2, window.innerWidth - CARD_W - 8));

  const el = (
    <div
      className="fixed pointer-events-none"
      style={{ left, top: anchor.y - 12, width: CARD_W, zIndex: 999999 }}
    >
      {/* Invisible bridge so the mouse can travel from Eye icon to card */}
      <div
        className="pointer-events-auto"
        style={{ height: 12 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      <div
        className="pointer-events-auto"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="transition-all duration-200 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0) scale(1)" : "translateY(-4px) scale(0.97)",
          }}
        >
          <div className="bg-[#18181b] border border-[#2e2e38] rounded-lg shadow-xl shadow-black/60 overflow-hidden p-2.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(el, document.body) : null;
}

/* ── Skeleton chat line helper ── */
function SkeletonLine({ avatar, badge, timestamp, nameW, nameColor, msgW, alt }: {
  avatar?: boolean; badge?: boolean; timestamp?: boolean;
  nameW: number; nameColor: string; msgW: string; alt?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-1.5 py-[3px] rounded-sm ${alt ? "bg-white/[0.03]" : ""}`}>
      {timestamp && <div className="w-6 h-[6px] rounded-sm bg-[#2a2a32] flex-shrink-0" />}
      {avatar && <div className="w-3.5 h-3.5 rounded-full bg-[#2a2a32] flex-shrink-0" />}
      {badge && <div className="w-2.5 h-2.5 rounded-sm bg-[#9147ff]/20 flex-shrink-0" />}
      <div className="h-[6px] rounded-sm flex-shrink-0" style={{ width: nameW, backgroundColor: nameColor, opacity: 0.4 }} />
      <div className="h-[6px] rounded-sm bg-[#2a2a32] flex-1" style={{ maxWidth: msgW }} />
    </div>
  );
}

/* ── Layout preview ── */
function LayoutPreview() {
  return (
    <div>
      <p className="text-[9px] text-[#53535f] mb-2">Controls how chat messages look</p>
      <div className="bg-[#0e0e10] rounded-md p-1 space-y-[1px]">
        <SkeletonLine avatar badge timestamp nameW={32} nameColor="#9147ff" msgW="70%" />
        <SkeletonLine avatar badge timestamp nameW={40} nameColor="#2eb67d" msgW="55%" alt />
        <SkeletonLine avatar badge timestamp nameW={28} nameColor="#e0a526" msgW="80%" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {["Avatar", "Badge", "Time", "Rows"].map((t) => (
          <span key={t} className="text-[8px] text-[#53535f] bg-[#1a1a1e] px-1.5 py-0.5 rounded">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Super Chat preview ── */
function SuperChatPreview() {
  return (
    <div>
      <p className="text-[9px] text-[#53535f] mb-1.5">Super Chat appearance</p>
      <div className="rounded overflow-hidden">
        <div className="bg-[#1565c0]/25 px-2 py-1.5 flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-[#1565c0]/40 flex-shrink-0" />
          <div className="h-[5px] w-8 rounded-sm bg-white/20" />
          <div className="ml-auto h-[6px] w-7 rounded-sm bg-white/25" />
        </div>
        <div className="bg-[#1565c0]/10 px-2 py-1">
          <div className="h-[4px] w-2/3 rounded-sm bg-white/8" />
        </div>
      </div>
    </div>
  );
}

/* ── Events preview ── */
function EventsPreview() {
  return (
    <div>
      <p className="text-[9px] text-[#53535f] mb-1.5">Special events & moderation</p>
      <div className="bg-[#0e0e10] rounded p-1.5 space-y-[6px]">
        <div className="flex items-center gap-1.5 px-1 h-4">
          <span className="text-[8px] text-[#53535f] italic leading-none">message retracted</span>
        </div>
        <div className="flex items-center gap-1.5 px-1 h-4">
          <span className="text-[8px] text-[#53535f] italic leading-none">Slow mode — 5s</span>
        </div>
        <div className="border-l-2 border-purple-500/40 bg-purple-500/[0.05] px-1.5 h-4 flex items-center gap-1 rounded-r-sm">
          <div className="h-[5px] w-10 rounded-sm bg-purple-400/25 flex-shrink-0" />
          <span className="text-[8px] text-purple-400/50 leading-none">gifted 5</span>
        </div>
        <div className="flex items-center gap-1.5 px-1 h-4 bg-[#1a1a1f] rounded-sm">
          <Pin className="w-2.5 h-2.5 text-[#9147ff]/60 rotate-45 flex-shrink-0" />
          <div className="h-[5px] w-14 rounded-sm bg-[#2a2a32]" />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors">
      <span className="text-xs text-[#adadb8]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#adadb8]">{label}</span>
        <span className="text-[10px] text-[#9147ff] font-mono font-bold tabular-nums">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
