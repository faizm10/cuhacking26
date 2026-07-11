"use client";

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

/**
 * The editor's game-mode selector. "Auto" lets the AI pick from the sketch;
 * an explicit choice (like tic-tac-toe) is authoritative for generation.
 */
export function GameModeSelect({
  value,
  onChange,
  disabled,
}: GameModeSelectProps) {
  return (
    <Select
      items={ITEMS}
      value={value}
      onValueChange={(next) => onChange(next as GameModeValue)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" aria-label="Game mode">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GAME_MODE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex flex-col items-start gap-0">
              <span>{option.label}</span>
              {option.hint && (
                <span className="text-[10px] leading-tight text-muted-foreground">
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
