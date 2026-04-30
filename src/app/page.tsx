"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { StreamInfo, ConnectionStatus, ChatEvent } from "@/lib/types";
import { ChatSettingsProvider, useChatSettings } from "@/lib/chat-settings";
import { useChat } from "@/hooks/useChat";
import { Header } from "@/components/Header";
import { ChannelInput } from "@/components/ChannelInput";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatFilters, type ChatFilter } from "@/components/ChatFilters";
import { SuperChatTicker } from "@/components/SuperChatTicker";
import { SuperChatSidebar } from "@/components/SuperChatSidebar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { UserPopover } from "@/components/UserPopover";
import { SettingsHint } from "@/components/SettingsHint";
import { AdminPanel } from "@/components/AdminPanel";

export default function Home() {
  return (
    <ChatSettingsProvider>
      <App />
    </ChatSettingsProvider>
  );
}

function App() {
  const { settings } = useChatSettings();
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [pageStatus, setPageStatus] = useState<ConnectionStatus>("idle");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [popover, setPopover] = useState<{
    author: ChatEvent["author"];
    pos: { x: number; yBelow: number; yAbove: number };
  } | null>(null);

  const connectedUrlRef = useRef<string | null>(null);

  const { messages, status: chatStatus, error: chatError, disconnect, injectEvents } = useChat({ streamInfo });

  const status: ConnectionStatus = pageStatus === "checking" ? "checking" : chatStatus;

  // Auto-refresh viewer count every 60s while connected
  useEffect(() => {
    if (!streamInfo?.isLive || !connectedUrlRef.current) return;
    const url = connectedUrlRef.current;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/channel/check?url=${encodeURIComponent(url)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.viewerCount) {
          setStreamInfo((prev) => prev ? { ...prev, viewerCount: data.viewerCount } : prev);
        }
      } catch { /* silent - don't disrupt chat */ }
    }, 60_000);
    return () => clearInterval(timer);
  }, [streamInfo?.isLive]);

  // Tab-away marker: when the user leaves and comes back, mark the last message they saw
  const [tabAwayMarkerId, setTabAwayMarkerId] = useState<string | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const isHiddenRef = useRef(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        isHiddenRef.current = true;
        if (messages.length > 0) {
          lastSeenIdRef.current = messages[messages.length - 1].id;
        }
      } else {
        if (isHiddenRef.current && lastSeenIdRef.current) {
          const lastIdx = messages.findIndex((m) => m.id === lastSeenIdRef.current);
          if (lastIdx >= 0 && lastIdx < messages.length - 1) {
            setTabAwayMarkerId(messages[lastIdx + 1].id);
          }
        }
        isHiddenRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [messages]);

  const filtered = useMemo(() => {
    if (filter === "all") return messages;
    if (filter === "superchats") return messages.filter((m) => m.type === "superchat");
    return messages.filter((m) => m.type === "membership" || m.author.badges.includes("member"));
  }, [messages, filter]);

  const superChats = useMemo(() => messages.filter((m) => m.type === "superchat"), [messages]);
  const membershipEvents = useMemo(() => messages.filter((m) => m.type === "membership"), [messages]);

  const counts = useMemo(() => ({
    all: messages.length,
    superchats: superChats.length,
    members: messages.filter((m) => m.type === "membership" || m.author.badges.includes("member")).length,
  }), [messages, superChats]);

  const handleConnect = useCallback(async (url: string) => {
    setPageStatus("checking");
    setCheckError(null);
    setStreamInfo(null);
    setTabAwayMarkerId(null);
    try {
      const res = await fetch(`/api/channel/check?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      console.log("[YouChat] Channel check response:", JSON.stringify({
        isLive: data.isLive, videoId: data.videoId, channelId: data.channelId,
        channelName: data.channelName, title: data.title,
      }));
      if (!res.ok) { setCheckError(data.error || "Failed to check channel"); setPageStatus("error"); return; }
      if (!data.isLive) { setCheckError("Channel is not live right now."); setPageStatus("idle"); return; }
      connectedUrlRef.current = url;
      setStreamInfo(data);
      setPageStatus("idle");
    } catch {
      setCheckError("Network error. Check your connection.");
      setPageStatus("error");
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
    connectedUrlRef.current = null;
    setStreamInfo(null);
    setPageStatus("idle");
    setCheckError(null);
    setFilter("all");
    setPopover(null);
    setTabAwayMarkerId(null);
    lastSeenIdRef.current = null;
  }, [disconnect]);

  const handleNameClick = useCallback((author: ChatEvent["author"], e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopover((prev) =>
      prev?.author.channelId === author.channelId
        ? null
        : { author, pos: { x: rect.left, yBelow: rect.bottom + 4, yAbove: rect.top } }
    );
  }, []);

  const isConnected = streamInfo?.isLive === true && chatStatus !== "idle" && chatStatus !== "error";
  const err = checkError || (chatStatus === "error" ? chatError : null);
  const showChat = streamInfo || status !== "idle" || err;
  const showSidebar = settings.superChatSidebar && isConnected;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#0e0e10]">
      <Header
        streamInfo={streamInfo}
        status={status}
        messageCount={messages.length}
        onOpenSettings={() => setSettingsOpen(true)}
        isConnected={isConnected}
        isLoading={pageStatus === "checking"}
        onDisconnect={handleDisconnect}


      />

      {/* Chat error when already connected (e.g. stream dropped) */}
      {isConnected && chatError && (
        <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
          <p className="text-[11px] text-red-400">{chatError}</p>
        </div>
      )}

      {!showChat ? (
        <Landing onConnect={handleConnect} isLoading={pageStatus === "checking"} isConnected={isConnected} error={err} />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {isConnected && <ChatFilters active={filter} onChange={setFilter} counts={counts} />}
          {!showSidebar && superChats.length > 0 && filter === "all" && (
            <SuperChatTicker superChats={superChats} onItemClick={handleNameClick} />
          )}
          <div className="flex-1 flex min-h-0 relative">
            <ChatContainer
              messages={filtered}
              status={status}
              filter={filter}
              tabAwayMarkerId={tabAwayMarkerId}
              onNameClick={handleNameClick}
            />
            {isConnected && <SettingsHint onOpenSettings={() => setSettingsOpen(true)} />}
            {showSidebar && (
              <SuperChatSidebar superChats={superChats} memberships={membershipEvents} onItemClick={handleNameClick} />
            )}
          </div>
        </div>
      )}

      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
      {popover && <UserPopover author={popover.author} messages={messages} anchor={popover.pos} onClose={() => setPopover(null)} />}
      <AdminPanel onInject={injectEvents} />
    </div>
  );
}

function Landing({ onConnect, isLoading, isConnected, error }: {
  onConnect: (url: string) => void;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-5">
      <div className="w-full max-w-[min(100%,20rem)]">
        <ChannelInput onSubmit={onConnect} isLoading={isLoading} isConnected={isConnected} variant="landing" />
        {error && (
          <p className="mt-2 text-[12px] text-red-400/90">{error}</p>
        )}
      </div>
    </div>
  );
}
