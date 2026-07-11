"use client";

import {
  Copy,
  Gamepad2,
  Map,
  MoreVertical,
  Pencil,
  Puzzle,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GAME_TYPE_LABELS, STATUS_LABELS } from "@/lib/mock-data/projects";
import { formatUpdatedAt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GameType, Project, ProjectStatus } from "@/types";

const GAME_TYPE_ICONS: Record<GameType, LucideIcon> = {
  platformer: Gamepad2,
  puzzle: Puzzle,
  adventure: Map,
};

const THUMBNAIL_GRADIENTS: Record<GameType, string> = {
  platformer: "from-primary/25 via-accent to-secondary",
  puzzle: "from-chart-2/25 via-accent to-secondary",
  adventure: "from-chart-3/25 via-accent to-secondary",
};

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  generating: "bg-accent text-accent-foreground",
  playable: "bg-primary/15 text-primary",
};

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const Icon = GAME_TYPE_ICONS[project.gameType];

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-soft-lg">
      {/* Thumbnail placeholder until generated previews exist */}
      <div
        className={cn(
          "flex aspect-video items-center justify-center bg-gradient-to-br",
          THUMBNAIL_GRADIENTS[project.gameType]
        )}
      >
        <Icon className="size-10 text-foreground/25 transition-transform duration-300 group-hover:scale-110" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-heading font-semibold">
              {project.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {GAME_TYPE_LABELS[project.gameType]} ·{" "}
              {formatUpdatedAt(project.updatedAt)}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn("shrink-0", STATUS_STYLES[project.status])}
          >
            {project.status === "generating" && (
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
            )}
            {STATUS_LABELS[project.status]}
          </Badge>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpen(project)}>
            Open
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More actions for ${project.name}`}
                />
              }
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => console.log("Rename project", project.id)}
              >
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => console.log("Duplicate project", project.id)}
              >
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => console.log("Delete project", project.id)}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
