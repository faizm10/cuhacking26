"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ACCEPT_IMAGE_ATTR } from "@/lib/canvas/image-upload";

interface EditorTopBarProps {
  projectName: string;
  gameTypeLabel?: string;
  isGenerating: boolean;
  onGenerate: () => void;
  onUploadImages?: (files: File[]) => void;
}

export function EditorTopBar({
  projectName,
  gameTypeLabel,
  isGenerating,
  onGenerate,
  onUploadImages,
}: EditorTopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowLeft />
        </Link>
        <div className="h-5 w-px bg-border" aria-hidden />
        <h1 className="truncate font-heading font-semibold">{projectName}</h1>
        {gameTypeLabel && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {gameTypeLabel}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <p className="hidden text-xs text-muted-foreground xl:block">
          Sketch or upload, generate, then chat to tweak — or edit + Regenerate
        </p>
        {onUploadImages && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_IMAGE_ATTR}
              multiple
              className="sr-only"
              disabled={isGenerating}
              onChange={(event) => {
                const files = event.target.files;
                if (files && files.length > 0) {
                  onUploadImages(Array.from(files));
                }
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isGenerating}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus data-icon="inline-start" className="size-4" />
              Upload
            </Button>
          </>
        )}
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
          ) : (
            <Sparkles data-icon="inline-start" className="size-4" />
          )}
          {isGenerating ? "Generating…" : "Generate"}
        </Button>
      </div>
    </header>
  );
}
