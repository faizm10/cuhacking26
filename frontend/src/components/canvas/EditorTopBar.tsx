"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorTopBarProps {
  projectId: string;
  projectName: string;
  gameTypeLabel?: string;
}

export function EditorTopBar({
  projectId,
  projectName,
  gameTypeLabel,
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
          Sketch your level, then generate it into a game
        </p>
        <Button
          onClick={() =>
            // AI generation lands here in the next milestone.
            console.log("Generate game from sketch", projectId)
          }
        >
          <Sparkles data-icon="inline-start" className={cn("size-4")} />
          Generate
        </Button>
      </div>
    </header>
  );
}
