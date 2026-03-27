"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  color?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, id, color, disabled }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group" htmlFor={id}>
      <div
        className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
          checked
            ? "border-transparent"
            : "border-zinc-600 group-hover:border-zinc-400 bg-transparent"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        style={checked ? { backgroundColor: color ?? "#6366f1" } : undefined}
      >
        {checked && <Check size={12} color="white" strokeWidth={3} />}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </div>
      {label && (
        <span className={`text-sm ${checked ? "line-through text-zinc-500" : "text-zinc-200"}`}>
          {label}
        </span>
      )}
    </label>
  );
}
