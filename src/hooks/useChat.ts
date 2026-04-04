"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatEvent, ConnectionStatus, StreamInfo } from "@/lib/types";
import { MAX_MESSAGES } from "@/lib/constants";
import { YouTubeChatClient } from "@/lib/youtube-chat-client";

const MAX_RETRIES = 10;
const BACKOFF_BASE_MS = 3_000;
const BACKOFF_MAX_MS = 30_000;
// Only show "reconnecting" in the UI if we've been retrying for this long
const SILENT_RECONNECT_MS = 10_000;

interface UseChatReturn {
  messages: ChatEvent[];
  status: ConnectionStatus;
  error: string | null;
  retryCount: number;
  disconnect: () => void;
  injectEvents: (events: ChatEvent[]) => void;
}

export function useChat({ streamInfo }: { streamInfo: StreamInfo | null }): UseChatReturn {
  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const clientRef = useRef<YouTubeChatClient | null>(null);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRunRef = useRef(false);
  const videoIdRef = useRef<string | null>(null);
  const hasReceivedMessages = useRef(false);
  const reconnectStartTime = useRef<number | null>(null);
  const showReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seenIds = useRef(new Set<string>());
  const hiddenAuthors = useRef(new Set<string>());
  const prevVideoIdRef = useRef<string | null>(null);

  const stopClient = useCallback(() => {
    if (clientRef.current) { clientRef.current.stop(); clientRef.current = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (showReconnectTimer.current) { clearTimeout(showReconnectTimer.current); showReconnectTimer.current = null; }
  }, []);

  const startClient = useCallback((videoId: string) => {
    stopClient();
    if (!shouldRunRef.current) return;

    const client = new YouTubeChatClient(
      videoId,
      (events) => {
        setMessages((prev) => {
          const deletes = new Set(events.filter((e) => e.type === "deleted").map((e) => e.id));

          const newHides = events.filter((e) => e.type === "hide_author").map((e) => e.author.channelId);
          newHides.forEach((cid) => hiddenAuthors.current.add(cid));

          // Separate replacements (ID already exists) from truly new messages
          const incoming = events.filter((e) =>
            e.type !== "deleted" && e.type !== "hide_author" && e.type !== "unpin"
            && !hiddenAuthors.current.has(e.author.channelId)
          );
          const existingIds = new Set(prev.map((m) => m.id));
          const replacements = new Map<string, ChatEvent>();
          const newMsgs: ChatEvent[] = [];
          for (const e of incoming) {
            if (existingIds.has(e.id)) {
              replacements.set(e.id, e);
            } else if (!seenIds.current.has(e.id)) {
              newMsgs.push(e);
            }
          }

          newMsgs.forEach((m) => seenIds.current.add(m.id));
          if (seenIds.current.size > MAX_MESSAGES * 2) {
            const arr = Array.from(seenIds.current);
            seenIds.current = new Set(arr.slice(arr.length - MAX_MESSAGES));
          }

          let updated = prev;
          const hasChanges = deletes.size > 0 || newHides.length > 0 || replacements.size > 0;
          if (hasChanges) {
            updated = updated
              .filter((m) => !hiddenAuthors.current.has(m.author.channelId))
              .map((m) => {
                if (deletes.has(m.id)) return { ...m, retracted: true };
                if (replacements.has(m.id)) return replacements.get(m.id)!;
                return m;
              });
          }
          if (newMsgs.length > 0) updated = [...updated, ...newMsgs];
          if (updated.length > MAX_MESSAGES) updated = updated.slice(updated.length - MAX_MESSAGES);
          return updated === prev && newMsgs.length === 0 && !hasChanges ? prev : updated;
        });

        // Got messages — we're healthy
        hasReceivedMessages.current = true;
        retriesRef.current = 0;
        reconnectStartTime.current = null;
        if (showReconnectTimer.current) { clearTimeout(showReconnectTimer.current); showReconnectTimer.current = null; }
        setRetryCount(0);
        setStatus("live");
        setError(null);
      },
      (s, message) => {
        if (s === "live") {
          reconnectStartTime.current = null;
          if (showReconnectTimer.current) { clearTimeout(showReconnectTimer.current); showReconnectTimer.current = null; }
          setStatus("live");
          setError(null);
          retriesRef.current = 0;
          setRetryCount(0);
        } else if (s === "ended" || s === "error") {
          if (!shouldRunRef.current) return;
          if (retriesRef.current >= MAX_RETRIES) {
            setStatus("error");
            setError(message || "Connection lost after multiple retries.");
            return;
          }

          // If we've already received messages, stay silent for a while
          // Only show "reconnecting" after SILENT_RECONNECT_MS of failed retries
          if (hasReceivedMessages.current) {
            if (!reconnectStartTime.current) {
              reconnectStartTime.current = Date.now();
              // Schedule the UI change for later
              showReconnectTimer.current = setTimeout(() => {
                if (shouldRunRef.current && retriesRef.current > 0) {
                  setStatus("reconnecting");
                }
              }, SILENT_RECONNECT_MS);
            }
            // Don't touch status yet — keep showing "live"
          } else {
            setStatus("reconnecting");
          }

          setError(null);
          const delay = Math.min(BACKOFF_BASE_MS * 2 ** retriesRef.current, BACKOFF_MAX_MS);
          retriesRef.current++;
          setRetryCount(retriesRef.current);
          retryTimerRef.current = setTimeout(() => {
            if (shouldRunRef.current && videoIdRef.current) startClient(videoIdRef.current);
          }, delay);
        }
      }
    );

    clientRef.current = client;
    client.start();
  }, [stopClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    shouldRunRef.current = false;
    videoIdRef.current = null;
    hasReceivedMessages.current = false;
    reconnectStartTime.current = null;
    stopClient();
    setStatus("idle");
    setMessages([]);
    setError(null);
    setRetryCount(0);
    seenIds.current.clear();
    retriesRef.current = 0;
  }, [stopClient]);

  const videoId = streamInfo?.isLive ? streamInfo.videoId ?? null : null;

  useEffect(() => {
    if (!videoId) return;

    const streamChanged = prevVideoIdRef.current !== null && prevVideoIdRef.current !== videoId;
    prevVideoIdRef.current = videoId;

    console.log(`[YouChat] useChat: connecting to videoId=${videoId} (prev=${prevVideoIdRef.current})`);
    shouldRunRef.current = true;
    videoIdRef.current = videoId;
    hasReceivedMessages.current = false;
    reconnectStartTime.current = null;
    retriesRef.current = 0;
    seenIds.current.clear();
    if (streamChanged) hiddenAuthors.current.clear();
    setRetryCount(0);
    setStatus("connecting");
    setError(null);
    setMessages([]);

    startClient(videoId);

    return () => { stopClient(); };
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const injectEvents = useCallback((events: ChatEvent[]) => {
    setMessages((prev) => {
      const merged = [...prev, ...events];
      return merged.length > MAX_MESSAGES ? merged.slice(merged.length - MAX_MESSAGES) : merged;
    });
  }, []);

  return { messages, status, error, retryCount, disconnect, injectEvents };
}
