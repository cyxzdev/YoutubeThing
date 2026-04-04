"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ChatSettings {
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
  try { const s = localStorage.getItem("youchat-settings-v4"); if (s) return { ...DEFAULTS, ...JSON.parse(s) }; } catch {}
  return DEFAULTS;
}

function save(s: ChatSettings) {
  try { localStorage.setItem("youchat-settings-v4", JSON.stringify(s)); } catch {}
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
