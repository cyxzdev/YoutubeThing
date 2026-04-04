export interface ParsedYouTubeURL {
  type: "channel" | "handle" | "video" | "live" | "unknown";
  value: string;
}

/**
 * Parses various YouTube URL formats and extracts the relevant identifier.
 *
 * Supported formats:
 *   youtube.com/channel/UC...
 *   youtube.com/@handle
 *   youtube.com/watch?v=VIDEO_ID
 *   youtube.com/live/VIDEO_ID
 *   youtu.be/VIDEO_ID
 *   youtube.com/c/CustomName
 *   youtube.com/user/Username
 *   Raw channel ID (UC...)
 *   Raw video ID (11 chars)
 */
export function parseYouTubeURL(input: string): ParsedYouTubeURL {
  const trimmed = input.trim();

  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { type: "channel", value: trimmed };
  }

  if (/^@[\w.-]+$/.test(trimmed)) {
    return { type: "handle", value: trimmed };
  }

  if (/^[\w-]{11}$/.test(trimmed)) {
    return { type: "video", value: trimmed };
  }

  let url: URL;
  try {
    let normalized = trimmed;
    if (!normalized.startsWith("http")) {
      normalized = "https://" + normalized;
    }
    url = new URL(normalized);
  } catch {
    return { type: "unknown", value: trimmed };
  }

  const hostname = url.hostname.replace("www.", "").replace("m.", "");

  if (hostname === "youtu.be") {
    const videoId = url.pathname.slice(1);
    if (videoId) return { type: "video", value: videoId };
  }

  if (hostname !== "youtube.com") {
    return { type: "unknown", value: trimmed };
  }

  const pathname = url.pathname;

  const channelMatch = pathname.match(/^\/channel\/(UC[\w-]{22})/);
  if (channelMatch) {
    return { type: "channel", value: channelMatch[1] };
  }

  const handleMatch = pathname.match(/^\/@([\w.-]+)/);
  if (handleMatch) {
    return { type: "handle", value: "@" + handleMatch[1] };
  }

  if (pathname === "/watch") {
    const videoId = url.searchParams.get("v");
    if (videoId) return { type: "video", value: videoId };
  }

  const liveMatch = pathname.match(/^\/live\/([\w-]+)/);
  if (liveMatch) {
    return { type: "live", value: liveMatch[1] };
  }

  const customMatch = pathname.match(/^\/(c|user)\/([\w.-]+)/);
  if (customMatch) {
    return { type: "handle", value: "@" + customMatch[2] };
  }

  return { type: "unknown", value: trimmed };
}

export function buildChannelURL(parsed: ParsedYouTubeURL): string | null {
  switch (parsed.type) {
    case "channel":
      return `https://www.youtube.com/channel/${parsed.value}`;
    case "handle":
      return `https://www.youtube.com/${parsed.value}`;
    case "video":
    case "live":
      return `https://www.youtube.com/watch?v=${parsed.value}`;
    default:
      return null;
  }
}
