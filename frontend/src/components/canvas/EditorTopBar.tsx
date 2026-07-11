"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

interface EditorTopBarProps {
  projectName: string;
  gameTypeLabel?: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function EditorTopBar({
  projectName,
  gameTypeLabel,
  isGenerating,
  onGenerate,
}: EditorTopBarProps) {
  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowLeft />
        </Link>
        <div className="h-5 w-px bg-border" aria-hidden />
        <h1 className="truncate font-heading font-semibold">{projectName}</h1>
        {gameTypeLabel && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {gameTypeLabel}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <p className="hidden text-xs text-muted-foreground lg:block">
          Sketch, label with text, describe the game, then generate
        </p>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
          ) : (
            <Sparkles data-icon="inline-start" className="size-4" />
          )}
          {isGenerating ? "Generating…" : "Generate"}
        </Button>
      </div>
    </header>
  );
}
