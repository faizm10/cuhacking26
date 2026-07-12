"use client";

import dynamic from "next/dynamic";

import { SAMPLE_LEVEL } from "@/lib/game/sample-level";

const PhaserGame = dynamic(
  () => import("@/components/game/PhaserGame").then((mod) => mod.PhaserGame),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-300">
        Loading game…
      </div>
    ),
  }
);

/** Demo route for the collect-the-coins platformer engine. */
export default function PlatformerDemoPage() {
  return (
    <main className="flex h-dvh flex-col bg-slate-950">
      <header className="flex h-11 shrink-0 items-center justify-between px-4">
        <h1 className="text-sm font-medium text-slate-200">
          {SAMPLE_LEVEL.name} — collect every coin, then reach the flag
        </h1>
        <p className="text-xs text-slate-400">
          Move: ←→ / A D · Jump: Space / ↑ · Pause: P · Restart: R
        </p>
      </header>
      <div className="min-h-0 flex-1 p-3 pt-0">
        <PhaserGame level={SAMPLE_LEVEL} />
      </div>
    </main>
  );
}
