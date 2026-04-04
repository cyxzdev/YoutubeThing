import { NextRequest, NextResponse } from "next/server";
import { parseYouTubeURL, buildChannelURL } from "@/lib/url-parser";
import { proxyFetch } from "@/lib/proxy";
import type { StreamInfo } from "@/lib/types";

/* ════════════════════════════════════════════════════════
   Fetching helpers
   ════════════════════════════════════════════════════════ */

async function fetchPage(url: string): Promise<string> {
  const sep = url.includes("?") ? "&" : "?";
  const bustUrl = `${url}${sep}_yc=${Date.now()}`;
  const res = await proxyFetch(bustUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });
  return res.text();
}

/* ════════════════════════════════════════════════════════
   Extraction helpers
   ════════════════════════════════════════════════════════ */

function extractVideoDetailsBlock(html: string): string {
  const start = html.indexOf('"videoDetails":{');
  if (start === -1) return "";
  let depth = 0;
  let i = start + '"videoDetails":'.length;
  for (; i < html.length && i < start + 5000; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return html.slice(start, i + 1);
}

/**
 * Resolve the canonical channel ID from a CHANNEL page (not /live).
 * Uses patterns specific to channel-level metadata that cannot be confused
 * with recommended/sidebar content.
 */
async function resolveChannelId(channelUrl: string): Promise<string | null> {
  console.log(`[channel-check] STEP 1 — Resolving canonical channel ID from: ${channelUrl}`);
  try {
    const html = await fetchPage(channelUrl);

    // Pattern 1: channelMetadataRenderer.externalId — gold standard
    const cmrPos = html.indexOf('"channelMetadataRenderer"');
    if (cmrPos !== -1) {
      const chunk = html.slice(cmrPos, cmrPos + 2000);
      const m = chunk.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/);
      if (m) {
        console.log(`[channel-check]   resolved via channelMetadataRenderer.externalId = ${m[1]}`);
        return m[1];
      }
    }

    // Pattern 2: <meta itemprop="channelId">
    const metaTag = html.match(
      /<meta\s+itemprop="channelId"\s+content="(UC[\w-]{22})"/
    );
    if (metaTag) {
      console.log(`[channel-check]   resolved via <meta channelId> = ${metaTag[1]}`);
      return metaTag[1];
    }

    // Pattern 3: c4TabbedHeaderRenderer.channelId
    const hdrPos = html.indexOf('"c4TabbedHeaderRenderer"');
    if (hdrPos !== -1) {
      const chunk = html.slice(hdrPos, hdrPos + 2000);
      const m = chunk.match(/"channelId"\s*:\s*"(UC[\w-]{22})"/);
      if (m) {
        console.log(`[channel-check]   resolved via c4TabbedHeaderRenderer.channelId = ${m[1]}`);
        return m[1];
      }
    }

    // Pattern 4: generic externalId (less reliable, last resort)
    const ext = html.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/);
    if (ext) {
      console.log(`[channel-check]   resolved via externalId fallback = ${ext[1]}`);
      return ext[1];
    }

    console.warn(`[channel-check]   FAILED to resolve channel ID from ${channelUrl}`);
    return null;
  } catch (err) {
    console.error(`[channel-check]   Error fetching channel page:`, err);
    return null;
  }
}

function extractFromHTML(html: string): StreamInfo & { isLiveInDetails: boolean } {
  const vdText = extractVideoDetailsBlock(html);

  const isLiveInDetails =
    vdText.includes('"isLiveContent":true') || vdText.includes('"isLive":true');
  const isLive =
    isLiveInDetails ||
    html.includes('"isLive":true') ||
    html.includes('"isLiveBroadcast":true');

  let videoId: string | undefined;
  const vdIdMatch = vdText.match(/"videoId":"([\w-]{11})"/);
  if (vdIdMatch) {
    videoId = vdIdMatch[1];
  } else {
    const fallbackMatch =
      html.match(/"currentVideoEndpoint"[^}]*?"videoId":"([\w-]{11})"/) ||
      html.match(/watch\?v=([\w-]{11})/);
    if (fallbackMatch) videoId = fallbackMatch[1];
  }

  // Channel ID from videoDetails specifically (the video OWNER)
  let videoChannelId: string | undefined;
  const vdCidMatch = vdText.match(/"channelId":"(UC[\w-]{22})"/);
  if (vdCidMatch) videoChannelId = vdCidMatch[1];

  // Broader channel ID (may not be the video owner on channel pages)
  let channelId: string | undefined;
  if (videoChannelId) {
    channelId = videoChannelId;
  } else {
    const cidMatch =
      html.match(/"channelId":"(UC[\w-]{22})"/) ||
      html.match(/"externalChannelId":"(UC[\w-]{22})"/);
    if (cidMatch) channelId = cidMatch[1];
  }

  let channelName: string | undefined;
  const nameMatch =
    vdText.match(/"author":"([^"]+)"/) ||
    html.match(/"author":"([^"]+)"/) ||
    html.match(/"channelName":"([^"]+)"/) ||
    html.match(/"ownerChannelName":"([^"]+)"/);
  if (nameMatch) channelName = nameMatch[1];

  let channelThumbnail: string | undefined;
  const thumbMatch = html.match(
    /"avatar":\{"thumbnails":\[\{"url":"(https:\/\/yt3[^"]+)"/
  );
  if (thumbMatch) channelThumbnail = thumbMatch[1];

  let title: string | undefined;
  const titleMatch =
    vdText.match(/"title":"([^"]+)"/) ||
    html.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}/) ||
    html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) title = titleMatch[1];

  let viewerCount: string | undefined;
  const viewerMatch =
    html.match(/"viewCount":\{"runs":\[\{"text":"([\d,]+)"/) ||
    html.match(/"viewCount":"(\d+)"/) ||
    html.match(/"shortViewCount":\{"runs":\[\{"text":"([^"]+)"/);
  if (viewerMatch) viewerCount = viewerMatch[1];

  return {
    isLive,
    isLiveInDetails,
    videoId: isLive ? videoId : undefined,
    channelId,
    channelName,
    channelThumbnail,
    title,
    viewerCount,
  };
}

/* ════════════════════════════════════════════════════════
   Channel → live stream (handles & channel URLs)
   ════════════════════════════════════════════════════════ */

async function findLiveStreamFromChannel(
  channelUrl: string
): Promise<StreamInfo> {
  // ── STEP 1: Resolve the REAL channel ID from the channel page itself ──
  const resolvedId = await resolveChannelId(channelUrl);

  // ── STEP 2: Fetch /live and cross-validate ──
  const liveUrl = channelUrl.replace(/\/$/, "") + "/live";

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[channel-check] STEP 2 — attempt ${attempt}/3: fetching ${liveUrl}`);

    const html = await fetchPage(liveUrl);
    const info = extractFromHTML(html);

    // Extract video's channel ID directly from videoDetails for comparison
    const vdText = extractVideoDetailsBlock(html);
    const vdCidMatch = vdText.match(/"channelId":"(UC[\w-]{22})"/);
    const videoChannelId = vdCidMatch?.[1] || info.channelId;

    console.log(
      `[channel-check]   attempt ${attempt} result:`,
      JSON.stringify({
        isLive: info.isLive,
        isLiveInVD: info.isLiveInDetails,
        videoId: info.videoId ?? null,
        videoChannelId: videoChannelId ?? null,
        resolvedChannelId: resolvedId ?? null,
        channelName: info.channelName ?? null,
        title: info.title ?? null,
      })
    );

    // ── Not live at all ──
    if (!info.isLive || !info.videoId) {
      if (attempt < 3) {
        console.log(`[channel-check]   not live — retrying in 1.5s`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      console.log(`[channel-check]   not live after 3 attempts`);
      return { isLive: false, videoId: undefined };
    }

    // ── CRITICAL: Cross-validate channel ownership ──
    if (resolvedId && videoChannelId) {
      if (resolvedId !== videoChannelId) {
        console.warn(
          `[channel-check]   MISMATCH! Requested channel=${resolvedId} but video belongs to ${videoChannelId} (${info.channelName}). REJECTING.`
        );
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        return { isLive: false, videoId: undefined, channelId: resolvedId };
      }
      console.log(`[channel-check]   channel IDs match: ${resolvedId}`);
    } else if (!resolvedId) {
      console.warn(
        `[channel-check]   could not resolve channel ID — cannot cross-validate. Proceeding with caution.`
      );
    }

    // ── Extra: prefer isLiveContent specifically in videoDetails ──
    if (!info.isLiveInDetails) {
      console.warn(
        `[channel-check]   isLiveContent NOT in videoDetails (isLive came from page-wide match — could be sidebar recommendation)`
      );
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
    }

    console.log(
      `[channel-check]   CONFIRMED LIVE: videoId=${info.videoId}, channel=${info.channelName} (${videoChannelId})`
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isLiveInDetails: _, ...streamInfo } = info;
    return streamInfo;
  }

  return { isLive: false };
}

/* ════════════════════════════════════════════════════════
   Direct video ID check
   ════════════════════════════════════════════════════════ */

async function findLiveStreamFromVideo(videoId: string): Promise<StreamInfo> {
  console.log(`[channel-check] Direct video check: ${videoId}`);
  const html = await fetchPage(`https://www.youtube.com/watch?v=${videoId}`);
  const info = extractFromHTML(html);
  console.log(
    `[channel-check] Video result:`,
    JSON.stringify({
      isLive: info.isLive,
      videoId: info.videoId ?? null,
      channelId: info.channelId ?? null,
      channelName: info.channelName ?? null,
    })
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isLiveInDetails: _, ...streamInfo } = info;
  return streamInfo;
}

/* ════════════════════════════════════════════════════════
   Route handler
   ════════════════════════════════════════════════════════ */

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  console.log(`[channel-check] ══════════ NEW REQUEST: ${url} ══════════`);

  try {
    const parsed = parseYouTubeURL(url);
    console.log(
      `[channel-check] Parsed: type=${parsed.type}, value=${parsed.value}`
    );

    let info: StreamInfo;

    if (parsed.type === "video" || parsed.type === "live") {
      info = await findLiveStreamFromVideo(parsed.value);
    } else if (parsed.type === "channel" || parsed.type === "handle") {
      const channelUrl = buildChannelURL(parsed);
      if (!channelUrl) {
        return NextResponse.json(
          { error: "Could not build channel URL" },
          { status: 400 }
        );
      }
      info = await findLiveStreamFromChannel(channelUrl);
    } else {
      return NextResponse.json(
        { error: "Unrecognized YouTube URL format" },
        { status: 400 }
      );
    }

    console.log(
      `[channel-check] ══════════ RESPONSE: isLive=${info.isLive}, videoId=${info.videoId ?? "none"}, channel=${info.channelName ?? "?"} ══════════`
    );

    return NextResponse.json(info);
  } catch (err) {
    console.error("[channel-check] UNHANDLED ERROR:", err);
    return NextResponse.json(
      { error: "Failed to check channel status" },
      { status: 500 }
    );
  }
}
