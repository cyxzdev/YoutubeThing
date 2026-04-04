"use client";

export type ChatFilter = "all" | "superchats" | "members";

interface Props {
  active: ChatFilter;
  onChange: (f: ChatFilter) => void;
  counts: { all: number; superchats: number; members: number };
}

const TABS: { id: ChatFilter; label: string }[] = [
  { id: "all",        label: "All" },
  { id: "superchats", label: "Super Chats" },
  { id: "members",    label: "Members" },
];

export function ChatFilters({ active, onChange, counts }: Props) {
  return (
    <div className="flex items-center px-3 bg-[#18181b] border-b border-[#2a2a32] flex-shrink-0 h-9">
      <div className="flex items-center gap-0.5 bg-[#0e0e10] rounded-md p-[3px]">
        {TABS.map(({ id, label }) => {
          const isActive = active === id;
          const count = counts[id];
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative h-[26px] px-3 rounded text-[11px] font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#2a2a32] text-[#efeff1] shadow-sm"
                  : "text-[#6a6a78] hover:text-[#adadb8]"
              }`}
            >
              {label}
              {count > 0 && id !== "all" && (
                <span
                  className={`ml-1.5 text-[9px] font-black tabular-nums px-1 py-px rounded-sm ${
                    isActive ? "bg-[#9147ff] text-white" : "bg-[#2a2a32] text-[#53535f]"
                  }`}
                >
                  {count > 999 ? "999+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
