"use client";

import { useEffect, useState } from "react";

import { ProjectEditor } from "@/components/canvas/ProjectEditor";
import { GAME_TYPE_LABELS } from "@/lib/mock-data/projects";
import {
  ensureProject,
  type ProjectRecord,
} from "@/lib/storage/projects";

interface ProjectWorkspaceProps {
  projectId: string;
  fallbackName?: string;
}

export function ProjectWorkspace({
  projectId,
  fallbackName = "Untitled game",
}: ProjectWorkspaceProps) {
  const [project, setProject] = useState<ProjectRecord | null>(null);

  useEffect(() => {
    setProject(ensureProject(projectId, fallbackName));
  }, [projectId, fallbackName]);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading project…
      </div>
    );
  }

  const gameTypeLabel =
    project.gameType && project.gameType in GAME_TYPE_LABELS
      ? GAME_TYPE_LABELS[project.gameType]
      : undefined;

  return (
    <ProjectEditor
      projectId={project.id}
      projectName={project.name}
      gameType={project.gameType}
      gameTypeLabel={gameTypeLabel}
      initialDescription={project.description}
      initialMode={project.mode}
      initialChatMessages={project.chatMessages}
      initialResult={project.result}
    />
  );
}
