"use client";

import dynamic from "next/dynamic";

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

interface DrawingBoardProps {
  /** Unique key per project — tldraw persists the drawing to IndexedDB under it. */
  persistenceKey: string;
}

export function DrawingBoard({ persistenceKey }: DrawingBoardProps) {
  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={persistenceKey} />
    </div>
  );
}
