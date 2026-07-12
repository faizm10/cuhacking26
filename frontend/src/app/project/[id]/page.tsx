import type { Metadata } from "next";

import { ProjectWorkspace } from "@/components/canvas/ProjectWorkspace";

export const metadata: Metadata = {
  title: "Editor — PlayBox",
};

interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string }>;
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id } = await params;
  const { name } = await searchParams;

  return (
    <ProjectWorkspace projectId={id} fallbackName={name ?? "Untitled game"} />
  );
}
