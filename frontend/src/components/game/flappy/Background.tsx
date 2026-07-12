"use client";

import { memo, useMemo } from "react";

import type { SkyPalette } from "./flappyPalette";
import type { FlappyWorld } from "./PipeGenerator";

/**
 * The parallax backdrop: sky gradient, sun or moon (with stars at night),
 * drifting clouds, and two layers of rounded hills. Purely decorative — it
 * never affects gameplay. Clouds and hills scroll at `parallaxOffset`, which
 * the sim advances slower than the pipes for depth.
 */

interface BackgroundProps {
  world: FlappyWorld;
  sky: SkyPalette;
  parallaxOffset: number;
  showClouds: boolean;
}

interface Cloud {
  xFrac: number;
  yFrac: number;
  scale: number;
}

const CLOUDS: Cloud[] = [
  { xFrac: 0.1, yFrac: 0.16, scale: 1 },
  { xFrac: 0.45, yFrac: 0.1, scale: 0.72 },
  { xFrac: 0.72, yFrac: 0.22, scale: 1.15 },
  { xFrac: 0.95, yFrac: 0.13, scale: 0.85 },
];

const STARS: { xFrac: number; yFrac: number; r: number }[] = [
  { xFrac: 0.18, yFrac: 0.14, r: 1.6 },
  { xFrac: 0.32, yFrac: 0.3, r: 1.1 },
  { xFrac: 0.55, yFrac: 0.12, r: 1.8 },
  { xFrac: 0.68, yFrac: 0.26, r: 1.2 },
  { xFrac: 0.83, yFrac: 0.18, r: 1.5 },
  { xFrac: 0.9, yFrac: 0.34, r: 1 },
];

function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

function BackgroundImpl({
  world,
  sky,
  parallaxOffset,
  showClouds,
}: BackgroundProps) {
  const { width, playableHeight } = world;

  const hills = useMemo(() => {
    // Two overlapping arcs per layer, drawn as a smooth SVG silhouette.
    const backTop = playableHeight * 0.72;
    const frontTop = playableHeight * 0.82;
    const backPath = `M0 ${backTop} Q ${width * 0.25} ${backTop - playableHeight * 0.16} ${width * 0.5} ${backTop} T ${width} ${backTop} V ${playableHeight} H 0 Z`;
    const frontPath = `M0 ${frontTop} Q ${width * 0.3} ${frontTop - playableHeight * 0.12} ${width * 0.62} ${frontTop} T ${width * 1.2} ${frontTop} V ${playableHeight} H 0 Z`;
    return { backPath, frontPath };
  }, [width, playableHeight]);

  const cloudSpan = width + 180;
  const discSize = Math.max(48, Math.round(world.height * 0.12));

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${sky.skyTop} 0%, ${sky.skyBottom} 100%)`,
      }}
      aria-hidden
    >
      {/* Sun / moon */}
      <div
        className="absolute rounded-full"
        style={{
          width: discSize,
          height: discSize,
          left: width * 0.72,
          top: playableHeight * 0.14,
          background: sky.disc,
          boxShadow: `0 0 ${discSize * 0.7}px ${discSize * 0.35}px ${sky.discGlow}`,
        }}
      />

      {/* Stars (night only) */}
      {sky.isNight &&
        STARS.map((star, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: star.r * 2,
              height: star.r * 2,
              left: star.xFrac * width,
              top: star.yFrac * playableHeight,
              opacity: 0.85,
            }}
          />
        ))}

      {/* Clouds */}
      {showClouds &&
        CLOUDS.map((cloud, i) => {
          const x = mod(cloud.xFrac * width - parallaxOffset, cloudSpan) - 90;
          const w = 70 * cloud.scale * world.scale;
          const h = 26 * cloud.scale * world.scale;
          return (
            <div
              key={`cloud-${i}`}
              className="absolute"
              style={{
                left: x,
                top: cloud.yFrac * playableHeight,
                width: w,
                height: h,
                background: sky.cloud,
                borderRadius: h,
                opacity: sky.isNight ? 0.6 : 0.92,
                boxShadow: `${w * 0.34}px ${h * 0.18}px 0 ${-h * 0.12}px ${sky.cloud}, ${-w * 0.3}px ${h * 0.12}px 0 ${-h * 0.18}px ${sky.cloud}`,
              }}
            />
          );
        })}

      {/* Hills */}
      <svg
        className="absolute inset-x-0 bottom-0"
        width="100%"
        height={playableHeight}
        viewBox={`0 0 ${width} ${playableHeight}`}
        preserveAspectRatio="none"
      >
        <path d={hills.backPath} fill={sky.hillBack} opacity={0.9} />
        <path d={hills.frontPath} fill={sky.hillFront} />
      </svg>
    </div>
  );
}

export const Background = memo(BackgroundImpl);
