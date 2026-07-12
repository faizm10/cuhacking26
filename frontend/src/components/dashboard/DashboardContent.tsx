"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { NewProjectModal } from "@/components/dashboard/NewProjectModal";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  renameProject,
} from "@/lib/storage/projects";
import type { NewProjectInput, Project } from "@/types";

const editorPath = (project: Project) => `/project/${project.id}`;

export function DashboardContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setProjects(listProjects());
    setReady(true);
  }, []);

  const refresh = () => setProjects(listProjects());

  const handleCreate = (input: NewProjectInput) => {
    const project = createProject(input.name);
    refresh();
    router.push(editorPath(project));
  };

  const handleOpen = (project: Project) => {
    router.push(editorPath(project));
  };

  const handleRename = (project: Project) => {
    const next = window.prompt("Rename project", project.name);
    if (next === null) return;
    renameProject(project.id, next);
    refresh();
  };

  const handleDuplicate = (project: Project) => {
    const copy = duplicateProject(project.id);
    refresh();
    if (copy) router.push(editorPath(copy));
  };

  const handleDelete = (project: Project) => {
    const ok = window.confirm(
      `Delete “${project.name}”? This can’t be undone on this device.`
    );
    if (!ok) return;
    deleteProject(project.id);
    refresh();
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
              {ready
                ? `${projects.length} ${projects.length === 1 ? "project" : "projects"}`
                : "Loading…"}
            </p>
          </div>

          <div className="mt-5">
            {!ready ? null : projects.length > 0 ? (
              <ProjectGrid
                projects={projects}
                onOpen={handleOpen}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
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
