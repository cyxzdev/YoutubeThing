"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { CSSProperties } from "react";

/** `twitch` uses Roobert like Twitch’s web CSS (`font-family: Roobert, serif` + same WOFF2 assets). */
export type ChatFontPreset = "default" | "twitch";

export interface ChatSettings {
  /** Inter/system stack (body). `twitch` uses bundled Roobert under `/public/fonts`. */
  chatFontPreset: ChatFontPreset;
  fontSize: number;
  showTimestamps: boolean;
  showBadges: boolean;
  compactMode: boolean;
  emojiSize: number;
  showProfileImages: boolean;
  alternateBackground: boolean;
  superChatSidebar: boolean;
  showRetractedOriginal: boolean;
  showSystemMessages: boolean;
  showGiftedMemberships: boolean;
  showPinnedMessages: boolean;
}

const DEFAULTS: ChatSettings = {
  chatFontPreset: "default",
  fontSize: 13,
  showTimestamps: false,
  showBadges: true,
  compactMode: true,
  emojiSize: 20,
  showProfileImages: true,
  alternateBackground: false,
  superChatSidebar: false,
  showRetractedOriginal: true,
  showSystemMessages: true,
  showGiftedMemberships: true,
  showPinnedMessages: true,
};

interface Ctx {
  settings: ChatSettings;
  updateSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  resetSettings: () => void;
}

const ChatSettingsContext = createContext<Ctx | null>(null);

function load(): ChatSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const v5 = localStorage.getItem("youchat-settings-v5");
    if (v5) return { ...DEFAULTS, ...JSON.parse(v5) };
    const v4 = localStorage.getItem("youchat-settings-v4");
    if (v4) {
      const parsed = { ...DEFAULTS, ...JSON.parse(v4) } as ChatSettings;
      try { localStorage.setItem("youchat-settings-v5", JSON.stringify(parsed)); } catch {}
      return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULTS;
}

function save(s: ChatSettings) {
  try { localStorage.setItem("youchat-settings-v5", JSON.stringify(s)); } catch {}
}

/** Roobert is loaded from `/public/fonts` when preset is `twitch` (same stack as Twitch: `Roobert, serif`). */
export function chatFontStyle(settings: Pick<ChatSettings, "chatFontPreset">): CSSProperties {
  if (settings.chatFontPreset !== "twitch") return {};
  return { fontFamily: "Roobert, serif" };
}

export function ChatSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ChatSettings>(load);

  const updateSetting = useCallback(<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setSettings((prev) => { const next = { ...prev, [key]: value }; save(next); return next; });
  }, []);

  const resetSettings = useCallback(() => { setSettings(DEFAULTS); save(DEFAULTS); }, []);

  return (
    <ChatSettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </ChatSettingsContext.Provider>
  );
}

export function useChatSettings() {
  const ctx = useContext(ChatSettingsContext);
  if (!ctx) throw new Error("useChatSettings must be inside ChatSettingsProvider");
  return ctx;
}
