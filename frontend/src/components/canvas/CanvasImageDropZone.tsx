"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { ImagePlus } from "lucide-react";

import {
  filterImageFiles,
  validateImageFiles,
} from "@/lib/canvas/image-upload";
import { cn } from "@/lib/utils";

interface CanvasImageDropZoneProps {
  children: ReactNode;
  disabled?: boolean;
  onFiles: (files: File[]) => Promise<void> | void;
  onError?: (message: string) => void;
}

/**
 * Wraps the drawing board with drag-and-drop for image uploads. Native tldraw
 * drops still work on the canvas itself; this catches drops on the surrounding
 * chrome and shows a clear drop target while dragging.
 */
export function CanvasImageDropZone({
  children,
  disabled,
  onFiles,
  onError,
}: CanvasImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      if (disabled) return;
      const files = filterImageFiles(list);
      const error = validateImageFiles(files);
      if (error) {
        onError?.(error);
        return;
      }
      await onFiles(files);
    },
    [disabled, onError, onFiles]
  );

  const onDragEnter = (event: DragEvent) => {
    if (disabled || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const onDragOver = (event: DragEvent) => {
    if (disabled || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = async (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className="relative h-full min-h-0 min-w-0"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-[2px] transition-opacity",
          isDragging ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!isDragging}
      >
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary px-8 py-6 text-center shadow-soft">
          <ImagePlus className="size-8 text-primary" />
          <p className="font-heading text-sm font-medium">Drop drawing here</p>
          <p className="text-xs text-muted-foreground">
            PNG, JPEG, WebP, or GIF — then label and generate
          </p>
        </div>
      </div>
    </div>
  );
}
