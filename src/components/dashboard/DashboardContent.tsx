"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewProjectModal } from "@/components/dashboard/NewProjectModal";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { MOCK_PROJECTS } from "@/lib/mock-data/projects";
import type { NewProjectInput, Project } from "@/types";

// Session-created projects only live in local state, so the editor page can't
// look them up — pass name/type along until Supabase owns the data.
const editorPath = (project: Project) =>
  `/project/${project.id}?name=${encodeURIComponent(project.name)}&type=${project.gameType}`;

export function DashboardContent() {
  const router = useRouter();
  // Local mock state — swap for a Supabase query once the backend exists.
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [modalOpen, setModalOpen] = useState(false);

  const handleCreate = (input: NewProjectInput) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      gameType: input.gameType,
      status: "draft",
      thumbnailUrl: null,
      updatedAt: new Date().toISOString(),
    };
    setProjects((current) => [project, ...current]);
    router.push(editorPath(project));
  };

  const handleOpen = (project: Project) => {
    router.push(editorPath(project));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <DashboardHeader title="Dashboard" onNewProject={() => setModalOpen(true)} />

      <main className="flex-1 px-4 py-8 sm:px-6">
        <section id="projects" className="mx-auto w-full max-w-5xl">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-xl font-semibold">
              Recent Projects
            </h2>
            <p className="text-sm text-muted-foreground">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>

          <div className="mt-5">
            {projects.length > 0 ? (
              <ProjectGrid projects={projects} onOpen={handleOpen} />
            ) : (
              <EmptyState onNewProject={() => setModalOpen(true)} />
            )}
          </div>
        </section>
      </main>

      <NewProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
