import type { Metadata } from "next";

import { DrawingBoard } from "@/components/canvas/DrawingBoard";
import { EditorTopBar } from "@/components/canvas/EditorTopBar";
import { GAME_TYPE_LABELS, MOCK_PROJECTS } from "@/lib/mock-data/projects";
import type { GameType } from "@/types";

export const metadata: Metadata = {
  title: "Editor — PlayBox",
};

interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; type?: string }>;
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id } = await params;
  const { name, type } = await searchParams;

  // Mock lookup — session-created projects only exist in dashboard state, so
  // they arrive via query params. Replace both paths with a Supabase query.
  const project = MOCK_PROJECTS.find((p) => p.id === id);
  const projectName = project?.name ?? name ?? "Untitled game";
  const gameType = project?.gameType ?? (type as GameType | undefined);
  const gameTypeLabel =
    gameType && gameType in GAME_TYPE_LABELS
      ? GAME_TYPE_LABELS[gameType]
      : undefined;

  return (
    <div className="flex h-screen flex-col">
      <EditorTopBar
        projectId={id}
        projectName={projectName}
        gameTypeLabel={gameTypeLabel}
      />
      <main className="relative flex-1">
        <DrawingBoard persistenceKey={`playbox-${id}`} />
      </main>
    </div>
  );
}
