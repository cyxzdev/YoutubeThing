"use client";

import { Crown, Shield, Star, BadgeCheck } from "lucide-react";
import type { BadgeType } from "@/lib/types";
import { cn } from "@/lib/utils";

const cfg: Record<BadgeType, { Icon: typeof Crown; color: string; bg: string; label: string }> = {
  owner:     { Icon: Crown,      color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Owner" },
  moderator: { Icon: Shield,     color: "text-blue-400",   bg: "bg-blue-400/10",   label: "Mod" },
  member:    { Icon: Star,       color: "text-green-500",  bg: "bg-green-500/10",  label: "Member" },
  verified:  { Icon: BadgeCheck, color: "text-zinc-400",   bg: "bg-zinc-400/10",   label: "Verified" },
};

export function Badge({ type, className }: { type: BadgeType; className?: string }) {
  const { Icon, color, bg, label } = cfg[type];
  return (
    <span title={label} className={cn("inline-flex items-center justify-center w-4 h-4 rounded-sm", bg, className)}>
      <Icon className={cn("w-2.5 h-2.5", color)} />
    </span>
  );
}
