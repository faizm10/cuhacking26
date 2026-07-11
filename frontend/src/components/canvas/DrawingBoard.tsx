"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import {
  renderPlaintextFromRichText,
  type Editor,
  type TLShape,
} from "tldraw";

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

function shapeToRecord(
  editor: Editor,
  shape: TLShape
): Record<string, unknown> {
  const record = { ...shape } as Record<string, unknown>;
  const props = { ...(shape.props as Record<string, unknown>) };

  // Normalize richText → plain `text` so the backend always sees annotations.
  if (props.richText && typeof props.text !== "string") {
    const plain = renderPlaintextFromRichText(
      editor,
      props.richText as Parameters<typeof renderPlaintextFromRichText>[1]
    ).trim();
    if (plain) props.text = plain;
  }

  record.props = props;
  return record;
}

export interface DrawingBoardHandle {
  getShapes: () => Record<string, unknown>[];
  /** PNG data URL of everything on the current page, or null if empty. */
  getScreenshot: () => Promise<string | null>;
}

interface DrawingBoardProps {
  /** Unique key per project — tldraw persists the drawing to IndexedDB under it. */
  persistenceKey: string;
}

export const DrawingBoard = forwardRef<DrawingBoardHandle, DrawingBoardProps>(
  function DrawingBoard({ persistenceKey }, ref) {
    const editorRef = useRef<Editor | null>(null);

    useImperativeHandle(ref, () => ({
      getShapes: () => {
        const editor = editorRef.current;
        if (!editor) return [];
        return editor
          .getCurrentPageShapes()
          .map((shape) => shapeToRecord(editor, shape));
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
