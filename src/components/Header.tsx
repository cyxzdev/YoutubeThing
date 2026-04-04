"use client";

import { Settings, Eye, MessageSquare, Radio, LogOut, Loader2, RefreshCw } from "lucide-react";
import type { StreamInfo, ConnectionStatus } from "@/lib/types";
import { Button } from "./ui/button";

interface Props {
  streamInfo: StreamInfo | null;
  status: ConnectionStatus;
  messageCount: number;
  onOpenSettings: () => void;
  isConnected: boolean;
  isLoading: boolean;
  onDisconnect: () => void;
}

export function Header({ streamInfo, status, messageCount, onOpenSettings, isConnected, isLoading, onDisconnect }: Props) {
  return (
    <header className="flex items-center justify-between h-10 px-3 bg-[#18181b] flex-shrink-0 z-20">
      {/* Left: logo + stream info */}
      <div className="flex items-center gap-2.5 min-w-0">
        {isConnected && streamInfo?.channelName ? (
          <div className="flex items-center gap-1.5 min-w-0">
            {streamInfo.channelThumbnail && (
              <img src={streamInfo.channelThumbnail} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
            )}
            <span className="text-xs font-semibold text-[#efeff1] truncate max-w-[150px]">
              {streamInfo.channelName}
            </span>
            <div className="w-px h-3.5 bg-[#2a2a32] flex-shrink-0 mx-0.5" />
            <span className="text-[11px] text-[#7a7a85] flex-shrink-0">YouTube Chat</span>
            {(status === "live" || status === "reconnecting") && (
              <span className={`flex items-center gap-0.5 text-white text-[9px] font-black uppercase px-1.5 py-px rounded-sm leading-none flex-shrink-0 ${
                status === "reconnecting" ? "bg-yellow-600" : "bg-[#eb0400]"
              }`}>
                <Radio className="w-2 h-2" />LIVE
              </span>
            )}
            {status === "reconnecting" && (
              <RefreshCw className="w-2.5 h-2.5 text-yellow-500 animate-spin flex-shrink-0" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-[#efeff1]">YouTube Chat</span>
            {status === "connecting" && (
              <>
                <div className="w-px h-4 bg-[#2a2a32]" />
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                  <span className="text-[10px] text-yellow-500 font-semibold">Connecting…</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: stats + actions */}
      <div className="flex items-center gap-1.5">
        {(status === "live" || status === "reconnecting") && (
          <div className="flex items-center gap-3 mr-1 text-[11px] text-[#7a7a85]">
            {streamInfo?.viewerCount && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {streamInfo.viewerCount}
              </span>
            )}
            {messageCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {messageCount.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="h-7 px-2 text-[11px] text-[#7a7a85] hover:text-red-400 hover:bg-red-500/10 gap-1"
          >
            <LogOut className="w-3 h-3" />
            Leave
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center gap-1 text-[11px] text-[#7a7a85] px-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking...
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={onOpenSettings} className="h-7 w-7">
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </div>
    </header>
  );
}
