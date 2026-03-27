import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500": variant === "primary",
          "text-zinc-400 hover:text-white hover:bg-zinc-800 focus:ring-zinc-600": variant === "ghost",
          "bg-red-600/20 hover:bg-red-600/30 text-red-400 focus:ring-red-600": variant === "danger",
        },
        {
          "text-xs px-3 py-1.5": size === "sm",
          "text-sm px-4 py-2": size === "md",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
