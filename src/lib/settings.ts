export interface ChatSettings {
  fontSize: "small" | "medium" | "large";
  showTimestamps: boolean;
  showAvatars: boolean;
  showBadges: boolean;
  compactMode: boolean;
  emojiSize: "small" | "medium" | "large";
  showSuperChatTicker: boolean;
  messageFilter: "all" | "superchat" | "members";
  smoothScroll: boolean;
}

export const DEFAULT_SETTINGS: ChatSettings = {
  fontSize: "medium",
  showTimestamps: false,
  showAvatars: true,
  showBadges: true,
  compactMode: false,
  emojiSize: "medium",
  showSuperChatTicker: true,
  messageFilter: "all",
  smoothScroll: true,
};

export const FONT_SIZE_MAP: Record<ChatSettings["fontSize"], string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

export const EMOJI_SIZE_MAP: Record<ChatSettings["emojiSize"], string> = {
  small: "h-4 w-4",
  medium: "h-6 w-6",
  large: "h-8 w-8",
};

const SETTINGS_KEY = "youchat-settings";

export function loadSettings(): ChatSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ChatSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
