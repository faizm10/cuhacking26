"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";
import {
  renderPlaintextFromRichText,
  type Editor,
  type TLShape,
} from "tldraw";

import type { CanvasLabel, CanvasObject } from "@/lib/game/request";

import "tldraw/tldraw.css";

// tldraw touches browser APIs, so load it client-side only.
const Tldraw = dynamic(() => import("tldraw").then((mod) => mod.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading canvas…
    </div>
  ),
});

export interface CanvasData {
  objects: CanvasObject[];
  labels: CanvasLabel[];
  dimensions: { width: number; height: number };
}

export interface DrawingBoardHandle {
  /** Normalized (0-1) objects + labels, or null when the canvas is empty. */
  getCanvasData: () => CanvasData | null;
  /** PNG data URL of everything on the current page, or null if empty. */
  getScreenshot: () => Promise<string | null>;
  /** Drop/upload images onto the canvas so they enter the generate pipeline. */
  putImageFiles: (files: File[]) => Promise<void>;
}

function shapeText(editor: Editor, shape: TLShape): string {
  const props = shape.props as Record<string, unknown>;
  if (typeof props.text === "string") return props.text.trim();
  if (props.richText) {
    return renderPlaintextFromRichText(
      editor,
      props.richText as Parameters<typeof renderPlaintextFromRichText>[1]
    ).trim();
  }
  return "";
}

function extractCanvasData(editor: Editor): CanvasData | null {
  // Sorted = paint order, so the array index doubles as zIndex.
  const shapes = editor.getCurrentPageShapesSorted();
  if (shapes.length === 0) return null;

  const measured = shapes.flatMap((shape) => {
    const bounds = editor.getShapePageBounds(shape);
    return bounds ? [{ shape, bounds }] : [];
  });
  if (measured.length === 0) return null;

  // Union of all shape bounds = the drawing's own coordinate space.
  const minX = Math.min(...measured.map(({ bounds }) => bounds.x));
  const minY = Math.min(...measured.map(({ bounds }) => bounds.y));
  const maxX = Math.max(...measured.map(({ bounds }) => bounds.x + bounds.w));
  const maxY = Math.max(...measured.map(({ bounds }) => bounds.y + bounds.h));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const objects: CanvasObject[] = [];
  const labels: CanvasLabel[] = [];

  measured.forEach(({ shape, bounds }, index) => {
    const props = shape.props as Record<string, unknown>;
    const text = shapeText(editor, shape);
    const x = (bounds.x - minX) / width;
    const y = (bounds.y - minY) / height;

    objects.push({
      type:
        shape.type === "geo" && typeof props.geo === "string"
          ? props.geo
          : shape.type,
      x,
      y,
      width: bounds.w / width,
      height: bounds.h / height,
      rotation: Math.round((shape.rotation * 180) / Math.PI),
      ...(text ? { text: text.slice(0, 300) } : {}),
      ...(typeof props.color === "string" ? { color: props.color } : {}),
      zIndex: index,
    });

    if (text) {
      labels.push({
        text: text.slice(0, 300),
        x: x + bounds.w / width / 2,
        y: y + bounds.h / height / 2,
      });
    }
  });

  return { objects, labels, dimensions: { width, height } };
}

interface DrawingBoardProps {
  /** Unique key per project — tldraw persists the drawing to IndexedDB under it. */
  persistenceKey: string;
}

export const DrawingBoard = forwardRef<DrawingBoardHandle, DrawingBoardProps>(
  function DrawingBoard({ persistenceKey }, ref) {
    const editorRef = useRef<Editor | null>(null);

    useImperativeHandle(ref, () => ({
      getCanvasData: () => {
        const editor = editorRef.current;
        return editor ? extractCanvasData(editor) : null;
      },
      getScreenshot: async () => {
        const editor = editorRef.current;
        if (!editor) return null;

        const shapes = editor.getCurrentPageShapes();
        if (shapes.length === 0) return null;

        const { url } = await editor.toImageDataUrl(shapes, {
          format: "png",
          background: true,
          padding: 32,
          pixelRatio: 1,
        });
        return url;
      },
      putImageFiles: async (files: File[]) => {
        const editor = editorRef.current;
        if (!editor || files.length === 0) return;
        await editor.putExternalContent({ type: "files", files });
        // Frame the new content so the upload is visible immediately.
        editor.zoomToFit({ animation: { duration: 220 } });
      },
    }));

    return (
      <div className="tldraw__editor absolute inset-0 h-full w-full">
        <Tldraw
          persistenceKey={persistenceKey}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    );
  }
);
