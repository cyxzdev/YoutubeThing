import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full bg-[#0e0e10] border border-[#2a2a32] px-3 py-1 text-sm text-[#efeff1] placeholder:text-[#53535f] transition-colors focus-visible:outline-none focus-visible:border-[#9147ff]/50 disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
