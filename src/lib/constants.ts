export const SUPER_CHAT_TIERS: Record<
  number,
  { bg: string; text: string; headerBg: string }
> = {
  1: { bg: "#1565C0", text: "#FFFFFF", headerBg: "#1E88E5" },
  2: { bg: "#00838F", text: "#FFFFFF", headerBg: "#00ACC1" },
  3: { bg: "#2E7D32", text: "#FFFFFF", headerBg: "#43A047" },
  4: { bg: "#E65100", text: "#FFFFFF", headerBg: "#FB8C00" },
  5: { bg: "#C62828", text: "#FFFFFF", headerBg: "#E53935" },
  6: { bg: "#D50000", text: "#FFFFFF", headerBg: "#FF1744" },
  7: { bg: "#880E4F", text: "#FFFFFF", headerBg: "#AD1457" },
};

export const SUPER_CHAT_COLOR_TO_TIER: Record<string, number> = {
  "#1565C0": 1,
  "#00E5FF": 2,
  "#1DE9B6": 3,
  "#FFCA28": 4,
  "#F57C00": 5,
  "#E91E63": 6,
  "#E62117": 7,
};

export const USERNAME_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F1948A",
  "#82E0AA",
  "#F0B27A",
  "#AED6F1",
  "#D7BDE2",
];

export function getUsernameColor(channelId: string): string {
  let hash = 0;
  for (let i = 0; i < channelId.length; i++) {
    hash = channelId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USERNAME_COLORS[Math.abs(hash) % USERNAME_COLORS.length];
}

export const MAX_MESSAGES = 500;

export const TWITCH_COLORS = {
  bg: "#0e0e10",
  surface: "#18181b",
  surfaceAlt: "#1f1f23",
  border: "#2f2f35",
  textPrimary: "#efeff1",
  textSecondary: "#adadb8",
  textMuted: "#53535f",
  accent: "#9147ff",
  accentHover: "#772ce8",
  live: "#eb0400",
  success: "#00f593",
};
