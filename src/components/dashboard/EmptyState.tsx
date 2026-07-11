"use client";

import { PencilRuler, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onNewProject: () => void;
}

export function EmptyState({ onNewProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <PencilRuler className="size-7" />
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold">
        No projects yet
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Your games will live here. Start with a blank canvas and sketch your
        first level.
      </p>
      <Button className="mt-6" onClick={onNewProject}>
        <Plus data-icon="inline-start" />
        Create your first game
      </Button>
    </div>
  );
}
