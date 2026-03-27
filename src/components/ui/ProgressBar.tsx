interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  className?: string;
}

export function ProgressBar({ value, color = "#6366f1", className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden ${className ?? ""}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
