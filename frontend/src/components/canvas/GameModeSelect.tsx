"use client";

import { useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_MODE_OPTIONS } from "@/lib/mock-data/projects";
import type { GameModeValue } from "@/types";

interface GameModeSelectProps {
  value: GameModeValue;
  onChange: (value: GameModeValue) => void;
  disabled?: boolean;
}

const ITEMS = GAME_MODE_OPTIONS.map(({ value, label }) => ({ value, label }));

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * The editor's game-mode selector. "Auto" lets the AI pick from the sketch;
 * an explicit choice (like tic-tac-toe) is authoritative for generation.
 *
 * Shortcuts: 1–4 map to the options in order (when not typing in a field).
 */
export function GameModeSelect({
  value,
  onChange,
  disabled,
}: GameModeSelectProps) {
  useEffect(() => {
    if (disabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const index = Number(event.key) - 1;
      if (index < 0 || index >= GAME_MODE_OPTIONS.length) return;

      const next = GAME_MODE_OPTIONS[index];
      if (!next || next.value === value) return;

      event.preventDefault();
      onChange(next.value);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, onChange, value]);

  return (
    <Select
      items={ITEMS}
      value={value}
      onValueChange={(next) => onChange(next as GameModeValue)}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        aria-label="Game mode (press 1–4 to switch)"
        title="Shortcuts: 1 Auto · 2 Tic-tac-toe · 3 Flappy Bird · 4 Platformer"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GAME_MODE_OPTIONS.map((option, index) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex flex-col items-start gap-0">
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] leading-none text-muted-foreground">
                  {index + 1}
                </kbd>
                <span>{option.label}</span>
              </span>
              {option.hint && (
                <span className="pl-[1.375rem] text-[10px] leading-tight text-muted-foreground">
                  {option.hint}
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
