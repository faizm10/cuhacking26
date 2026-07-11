"use client";

import { useRef, useState } from "react";

import {
  DrawingBoard,
  type DrawingBoardHandle,
} from "@/components/canvas/DrawingBoard";
import { EditorTopBar } from "@/components/canvas/EditorTopBar";
import { GameDescriptionPanel } from "@/components/canvas/GameDescriptionPanel";
import { LevelPanel } from "@/components/canvas/LevelPanel";
import { generateGame } from "@/lib/api/generate";
import type { GameSpec, GameType } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectEditorProps {
  projectId: string;
  projectName: string;
  gameType?: GameType;
  gameTypeLabel?: string;
}

export function ProjectEditor({
  projectId,
  projectName,
  gameType,
  gameTypeLabel,
}: ProjectEditorProps) {
  const boardRef = useRef<DrawingBoardHandle>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [game, setGame] = useState<GameSpec | null>(null);
  const [source, setSource] = useState<"gemini" | "mock" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const showSplit = isGenerating || game !== null || error !== null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const shapes = boardRef.current?.getShapes() ?? [];
      const screenshot = (await boardRef.current?.getScreenshot()) ?? null;

      if (!screenshot && shapes.length === 0) {
        throw new Error("Draw something on the canvas before generating");
      }

      const result = await generateGame({
        projectId,
        shapes,
        screenshot,
        prompt: description,
        selectedGameType: gameType,
      });
      setGame(result.game);
      setSource(result.source);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate the level"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <EditorTopBar
        projectName={projectName}
        gameTypeLabel={gameTypeLabel}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
      />
      <main
        className={cn(
          "relative min-h-0 flex-1",
          showSplit &&
            "grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1"
        )}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1">
            <DrawingBoard
              ref={boardRef}
              persistenceKey={`playbox-${projectId}`}
            />
          </div>
          <GameDescriptionPanel
            value={description}
            onChange={setDescription}
            disabled={isGenerating}
          />
        </div>
        {showSplit && (
          <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <LevelPanel
              isGenerating={isGenerating}
              game={game}
              source={source}
              error={error}
            />
          </div>
        )}
      </main>
    </div>
  );
}
