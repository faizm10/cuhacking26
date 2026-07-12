"use client";

import { memo } from "react";

import type { PipePalette } from "./flappyPalette";
import type { FlappyWorld } from "./PipeGenerator";

/**
 * A single pipe pair — the top pipe hanging from the ceiling and the bottom
 * pipe rising from the ground, with a rounded cap framing the gap. Body has a
 * left→right shaded gradient plus a glossy highlight stripe, and the whole
 * pipe casts a soft shadow to the left. Position is driven entirely by props;
 * the sim owns the geometry.
 */

/** Only the geometry the renderer needs — a live pipe or a view snapshot. */
export interface PipeGeometry {
  x: number;
  gapCenter: number;
  gapHalf: number;
}

interface PipeProps {
  pipe: PipeGeometry;
  world: FlappyWorld;
  palette: PipePalette;
}

function PipeImpl({ pipe, world, palette }: PipeProps) {
  const { pipeWidth, playableHeight } = world;
  const gapTop = pipe.gapCenter - pipe.gapHalf;
  const gapBottom = pipe.gapCenter + pipe.gapHalf;
  const capHeight = Math.max(16, Math.round(pipeWidth * 0.42));
  const capOverhang = Math.max(4, Math.round(pipeWidth * 0.1));

  const bodyBackground = `linear-gradient(90deg, ${palette.bodyDark} 0%, ${palette.body} 22%, ${palette.bodyLight} 46%, ${palette.body} 70%, ${palette.bodyDark} 100%)`;
  const capBackground = `linear-gradient(90deg, ${palette.bodyDark} 0%, ${palette.bodyLight} 45%, ${palette.body} 72%, ${palette.bodyDark} 100%)`;
  const highlight = (
    <span
      className="absolute top-0 bottom-0"
      style={{
        left: pipeWidth * 0.22,
        width: Math.max(3, pipeWidth * 0.12),
        background: palette.highlight,
        opacity: 0.55,
        borderRadius: 999,
      }}
    />
  );

  return (
    <div
      className="absolute top-0"
      style={{
        left: pipe.x,
        width: pipeWidth,
        height: playableHeight,
        filter: "drop-shadow(-3px 2px 4px rgba(0,0,0,0.22))",
      }}
      aria-hidden
    >
      {/* Top pipe */}
      {gapTop > 0 && (
        <>
          <div
            className="absolute left-0"
            style={{
              top: 0,
              width: pipeWidth,
              height: Math.max(0, gapTop - capHeight),
              background: bodyBackground,
              borderLeft: `2px solid ${palette.rim}`,
              borderRight: `2px solid ${palette.rim}`,
            }}
          >
            {highlight}
          </div>
          <div
            className="absolute"
            style={{
              top: Math.max(0, gapTop - capHeight),
              left: -capOverhang,
              width: pipeWidth + capOverhang * 2,
              height: capHeight,
              background: capBackground,
              border: `2px solid ${palette.rim}`,
              borderRadius: 8,
              boxShadow: "inset 0 2px 0 rgba(255,255,255,0.28)",
            }}
          />
        </>
      )}

      {/* Bottom pipe */}
      {gapBottom < playableHeight && (
        <>
          <div
            className="absolute"
            style={{
              top: gapBottom,
              left: -capOverhang,
              width: pipeWidth + capOverhang * 2,
              height: capHeight,
              background: capBackground,
              border: `2px solid ${palette.rim}`,
              borderRadius: 8,
              boxShadow: "inset 0 2px 0 rgba(255,255,255,0.28)",
            }}
          />
          <div
            className="absolute left-0"
            style={{
              top: gapBottom + capHeight,
              width: pipeWidth,
              height: Math.max(0, playableHeight - gapBottom - capHeight),
              background: bodyBackground,
              borderLeft: `2px solid ${palette.rim}`,
              borderRight: `2px solid ${palette.rim}`,
            }}
          >
            {highlight}
          </div>
        </>
      )}
    </div>
  );
}

export const Pipe = memo(PipeImpl);
