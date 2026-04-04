export type BadgeType = "owner" | "moderator" | "member" | "verified";

export interface ChatAuthor {
  name: string;
  channelId: string;
  profileImageUrl: string;
  badges: BadgeType[];
}

export interface MessagePart {
  type: "text" | "emoji";
  text?: string;
  emojiUrl?: string;
  emojiAlt?: string;
}

export interface SuperChatInfo {
  amount: string;
  color: string;
  tier: number;
  sticker?: {
    url: string;
    alt: string;
  };
}

export interface MembershipInfo {
  type: "new" | "milestone" | "gifting" | "gift_received";
  text: string;
}

export type ChatEventType =
  | "message"
  | "superchat"
  | "membership"
  | "system"
  | "deleted"
  | "hide_author"
  | "pinned"
  | "unpin";

export interface ChatEvent {
  id: string;
  type: ChatEventType;
  timestamp: number;
  author: ChatAuthor;
  message: MessagePart[];
  superchat?: SuperChatInfo;
  membership?: MembershipInfo;
  retracted?: boolean;
}

export interface StreamInfo {
  isLive: boolean;
  videoId?: string;
  channelId?: string;
  channelName?: string;
  channelThumbnail?: string;
  title?: string;
  viewerCount?: string;
}

export type ConnectionStatus =
  | "idle"
  | "checking"
  | "connecting"
  | "reconnecting"
  | "live"
  | "ended"
  | "error";

export interface SSEEvent {
  type: "chat" | "system" | "end" | "error";
  data: ChatEvent | { message: string };
}
