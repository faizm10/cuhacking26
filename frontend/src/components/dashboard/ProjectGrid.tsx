"use client";

import { ProjectCard } from "@/components/dashboard/ProjectCard";
import type { Project } from "@/types";

interface ProjectGridProps {
  projects: Project[];
  onOpen: (project: Project) => void;
  onRename: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectGrid({
  projects,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: ProjectGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={onOpen}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
