"use client";

import { useCallback, useRef, useState } from "react";

import { CanvasImageDropZone } from "@/components/canvas/CanvasImageDropZone";
import {
  DrawingBoard,
  type DrawingBoardHandle,
} from "@/components/canvas/DrawingBoard";
import { EditorTopBar } from "@/components/canvas/EditorTopBar";
import type { ChatMessage } from "@/components/canvas/GameChat";
import { GameDescriptionPanel } from "@/components/canvas/GameDescriptionPanel";
import { LevelPanel } from "@/components/canvas/LevelPanel";
import { generateGame, type GenerateGameResult } from "@/lib/api/generate";
import { refineGame } from "@/lib/api/refine";
import {
  filterImageFiles,
  validateImageFiles,
} from "@/lib/canvas/image-upload";
import type { GameType } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectEditorProps {
  projectId: string;
  projectName: string;
  gameType?: GameType;
  gameTypeLabel?: string;
}

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ProjectEditor({
  projectId,
  projectName,
  gameType,
  gameTypeLabel,
}: ProjectEditorProps) {
  const boardRef = useRef<DrawingBoardHandle>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [result, setResult] = useState<GenerateGameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const showSplit = isGenerating || result !== null || error !== null;

  const handleUploadImages = useCallback(async (files: File[]) => {
    const images = filterImageFiles(files);
    const validationError = validateImageFiles(images);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      await boardRef.current?.putImageFiles(images);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add that image to the canvas"
      );
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const canvasData = boardRef.current?.getCanvasData() ?? null;
      const canvasImage = (await boardRef.current?.getScreenshot()) ?? null;

      if (!canvasData && !canvasImage) {
        throw new Error(
          "The canvas looks empty — draw or upload a drawing before generating"
        );
      }

      const generated = await generateGame({
        canvasImage,
        canvasObjects: canvasData?.objects ?? [],
        canvasLabels: canvasData?.labels ?? [],
        userPrompt: description,
        selectedGameType: gameType ?? "auto",
        canvasDimensions: canvasData?.dimensions ?? { width: 1, height: 1 },
      });
      setResult(generated);
      setChatMessages([
        {
          id: newMessageId(),
          role: "assistant",
          content:
            generated.interpretationSummary ||
            "Game ready — edit the sketch and Regenerate for layout, or chat to tweak rules.",
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate the game"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatSend = async (message: string) => {
    if (!result?.gameSpec || isRefining || isGenerating) return;

    const userMessage: ChatMessage = {
      id: newMessageId(),
      role: "user",
      content: message,
    };
    setChatMessages((current) => [...current, userMessage]);
    setIsRefining(true);
    setError(null);

    try {
      const canvasImage = (await boardRef.current?.getScreenshot()) ?? null;
      const history = [...chatMessages, userMessage]
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));

      const refined = await refineGame({
        message,
        gameSpec: result.gameSpec,
        interpretationSummary: result.interpretationSummary,
        canvasImage,
        history,
      });

      setResult({
        gameSpec: refined.gameSpec,
        interpretationSummary: result.interpretationSummary,
        warnings: refined.warnings,
      });
      setChatMessages((current) => [
        ...current,
        {
          id: newMessageId(),
          role: "assistant",
          content: refined.assistantMessage,
        },
      ]);
    } catch (err) {
      const failText =
        err instanceof Error ? err.message : "Could not update the game";
      setChatMessages((current) => [
        ...current,
        {
          id: newMessageId(),
          role: "assistant",
          content: failText,
        },
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <EditorTopBar
        projectName={projectName}
        gameTypeLabel={gameTypeLabel}
        isGenerating={isGenerating || isRefining}
        onGenerate={handleGenerate}
        onUploadImages={handleUploadImages}
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
            <CanvasImageDropZone
              disabled={isGenerating}
              onFiles={handleUploadImages}
              onError={setError}
            >
              <DrawingBoard
                ref={boardRef}
                persistenceKey={`playbox-${projectId}`}
              />
            </CanvasImageDropZone>
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
              game={result?.gameSpec ?? null}
              interpretation={result?.interpretationSummary ?? null}
              warnings={result?.warnings ?? []}
              error={error}
              onRetry={handleGenerate}
              chatMessages={chatMessages}
              isRefining={isRefining}
              onChatSend={result ? handleChatSend : undefined}
            />
          </div>
        )}
      </main>
    </div>
  );
}
