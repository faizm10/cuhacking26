"use client";

import { GameModeSelect } from "@/components/canvas/GameModeSelect";
import { Label } from "@/components/ui/label";
import type { GameModeValue } from "@/types";

interface GameDescriptionPanelProps {
  value: string;
  onChange: (value: string) => void;
  mode: GameModeValue;
  onModeChange: (mode: GameModeValue) => void;
  disabled?: boolean;
}

export function GameDescriptionPanel({
  value,
  onChange,
  mode,
  onModeChange,
  disabled,
}: GameDescriptionPanelProps) {
  return (
    <div className="shrink-0 border-t border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor="game-description"
          className="text-xs text-muted-foreground"
        >
          What should happen in this game?
        </Label>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Game mode</span>
          <GameModeSelect
            value={mode}
            onChange={onModeChange}
            disabled={disabled}
          />
        </div>
      </div>
      <textarea
        id="game-description"
        value={value}
        disabled={disabled}
        rows={2}
        placeholder={
          mode === "tic-tac-toe"
            ? "I play X against the AI. Hand-drawn style, blue X, orange O."
            : "Collect every coin, avoid the enemies, and reach the flag."
        }
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Tip: upload or drop a drawing, label with text, then Generate. Afterward
        edit the sketch + Regenerate for layout, or chat to tweak rules.
      </p>
    </div>
  );
}
