"use client";

import {
  CircleDollarSign,
  Copy,
  Crosshair,
  Gamepad2,
  Grid3X3,
  Map,
  MousePointerClick,
  MoreVertical,
  Pencil,
  Puzzle,
  ShieldAlert,
  SquareDashedMousePointer,
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
  dodge: ShieldAlert,
  collect: CircleDollarSign,
  pong: Gamepad2,
  snake: Puzzle,
  maze: Map,
  clicker: MousePointerClick,
  "simple-shooter": Crosshair,
  "platform-jumper": SquareDashedMousePointer,
  "tic-tac-toe": Grid3X3,
};

const THUMBNAIL_GRADIENTS: Record<GameType, string> = {
  dodge: "from-rose-500/20 via-accent to-secondary",
  collect: "from-amber-400/25 via-accent to-secondary",
  pong: "from-sky-400/20 via-accent to-secondary",
  snake: "from-emerald-400/20 via-accent to-secondary",
  maze: "from-chart-3/25 via-accent to-secondary",
  clicker: "from-fuchsia-400/20 via-accent to-secondary",
  "simple-shooter": "from-red-500/20 via-accent to-secondary",
  "platform-jumper": "from-primary/25 via-accent to-secondary",
  "tic-tac-toe": "from-sky-500/25 via-orange-400/20 to-secondary",
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
  const Icon = project.gameType
    ? GAME_TYPE_ICONS[project.gameType]
    : Pencil;
  const typeLabel = project.gameType
    ? GAME_TYPE_LABELS[project.gameType]
    : "Sketch";
  const gradient = project.gameType
    ? THUMBNAIL_GRADIENTS[project.gameType]
    : "from-primary/20 via-accent to-secondary";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-soft-lg">
      {/* Thumbnail placeholder until generated previews exist */}
      <div
        className={cn(
          "flex aspect-video items-center justify-center bg-gradient-to-br",
          gradient
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
              {typeLabel} · {formatUpdatedAt(project.updatedAt)}
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
