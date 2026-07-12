"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
import {
  refineFlappy,
  refineGame,
  refinePlatformer,
  refineTicTacToe,
} from "@/lib/api/refine";
import {
  filterImageFiles,
  validateImageFiles,
} from "@/lib/canvas/image-upload";
import { compressScreenshotForVision } from "@/lib/canvas/compress-screenshot";
import { GAME_TYPE_LABELS } from "@/lib/mock-data/projects";
import { updateProject } from "@/lib/storage/projects";
import type { GameModeValue, GameType } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectEditorProps {
  projectId: string;
  projectName: string;
  gameType?: GameType;
  gameTypeLabel?: string;
  initialDescription?: string;
  initialMode?: GameModeValue;
  initialChatMessages?: ChatMessage[];
  initialResult?: GenerateGameResult | null;
}

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function gameTypeFromResult(
  result: GenerateGameResult | null
): GameType | undefined {
  if (!result) return undefined;
  if (result.rendererType === "tic-tac-toe") return "tic-tac-toe";
  if (result.rendererType === "flappy-bird") return "flappy-bird";
  if (result.rendererType === "platformer") return "platformer";
  if (result.rendererType === "arcade" && "gameType" in result.gameSpec) {
    return result.gameSpec.gameType as GameType;
  }
  return undefined;
}

export function ProjectEditor({
  projectId,
  projectName,
  gameType,
  gameTypeLabel,
  initialDescription = "",
  initialMode,
  initialChatMessages = [],
  initialResult = null,
}: ProjectEditorProps) {
  const boardRef = useRef<DrawingBoardHandle>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  /** Selected game mode — an explicit choice is authoritative at generate. */
  const [mode, setMode] = useState<GameModeValue>(
    initialMode ?? gameType ?? "auto"
  );
  const [result, setResult] = useState<GenerateGameResult | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState(initialDescription);
  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(initialChatMessages);
  /** Remount the play canvas when generate/refine produces a new GameSpec. */
  const [gameRevision, setGameRevision] = useState(0);
  /** After chat tweaks, restart play immediately so edits are obvious. */
  const [autoPlay, setAutoPlay] = useState(false);
  const [displayGameTypeLabel, setDisplayGameTypeLabel] = useState(gameTypeLabel);

  const showSplit = isGenerating || result !== null || error !== null;
  const skipFirstSave = useRef(true);

  // Persist editor snapshot whenever the important fields change.
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const inferredType = gameTypeFromResult(result);
    updateProject(projectId, {
      description,
      mode,
      chatMessages,
      result,
      status: result ? "playable" : "draft",
      gameType: inferredType,
    });
    if (inferredType && inferredType in GAME_TYPE_LABELS) {
      setDisplayGameTypeLabel(GAME_TYPE_LABELS[inferredType]);
    }
  }, [projectId, description, mode, chatMessages, result]);

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
    updateProject(projectId, { status: "generating" });

    try {
      const canvasData = boardRef.current?.getCanvasData() ?? null;
      const rawScreenshot = (await boardRef.current?.getScreenshot()) ?? null;
      const canvasImage = await compressScreenshotForVision(rawScreenshot);

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
        selectedGameType: mode,
        canvasDimensions: canvasData?.dimensions ?? { width: 1, height: 1 },
      });
      setResult(generated);
      setAutoPlay(false);
      setGameRevision((n) => n + 1);
      // Chat stays empty until the user tweaks — interpretation lives in Play.
      setChatMessages([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate the game"
      );
      updateProject(projectId, {
        status: result ? "playable" : "draft",
      });
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
      const history = [...chatMessages, userMessage]
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));

      let refined: {
        assistantMessage: string;
        warnings: string[];
      };
      if (result.rendererType === "tic-tac-toe") {
        const tttRefined = await refineTicTacToe({
          message,
          spec: result.gameSpec,
          history,
        });
        refined = tttRefined;
        setResult({
          rendererType: "tic-tac-toe",
          gameSpec: tttRefined.spec,
          interpretationSummary: result.interpretationSummary,
          warnings: tttRefined.warnings,
        });
      } else if (result.rendererType === "flappy-bird") {
        const flappyRefined = await refineFlappy({
          message,
          spec: result.gameSpec,
          history,
        });
        refined = flappyRefined;
        setResult({
          rendererType: "flappy-bird",
          gameSpec: flappyRefined.spec,
          interpretationSummary: result.interpretationSummary,
          warnings: flappyRefined.warnings,
        });
      } else if (result.rendererType === "platformer") {
        const platformerRefined = await refinePlatformer({
          message,
          spec: result.gameSpec,
          history,
        });
        refined = platformerRefined;
        setResult({
          rendererType: "platformer",
          gameSpec: platformerRefined.spec,
          interpretationSummary: result.interpretationSummary,
          warnings: platformerRefined.warnings,
        });
      } else {
        const canvasImage = await compressScreenshotForVision(
          (await boardRef.current?.getScreenshot()) ?? null
        );
        const arcadeRefined = await refineGame({
          message,
          gameSpec: result.gameSpec,
          interpretationSummary: result.interpretationSummary,
          canvasImage,
          history,
        });
        refined = arcadeRefined;
        setResult({
          rendererType: "arcade",
          gameSpec: arcadeRefined.gameSpec,
          interpretationSummary: result.interpretationSummary,
          warnings: arcadeRefined.warnings,
        });
      }
      setAutoPlay(true);
      setGameRevision((n) => n + 1);
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
        gameTypeLabel={displayGameTypeLabel}
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
            mode={mode}
            onModeChange={setMode}
            disabled={isGenerating}
          />
        </div>
        {showSplit && (
          <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <LevelPanel
              isGenerating={isGenerating}
              game={result}
              gameRevision={gameRevision}
              autoPlay={autoPlay}
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
