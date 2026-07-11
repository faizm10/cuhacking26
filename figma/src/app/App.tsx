import { useEffect, useRef } from "react";
import Document from "@/imports/Document";

export default function App() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.animationPlayState = "running";
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll(".anim-section");
    sections.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  /* Wrap the Document in a container that injects CSS overrides */
  return (
    <>
      <style>{`
        /* ── Marquee infinite scroll ────────────────────────────── */
        @keyframes marquee-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-550px); }
        }

        /* Target Container1 — the absolute track inside MarqueeTicker */
        [data-name="MarqueeTicker"] [data-name="Container:transform"] > div > div {
          animation: marquee-ticker 22s linear infinite;
          will-change: transform;
        }

        /* ── Section entrance animations ────────────────────────── */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .anim-section {
          animation: fadeInUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-play-state: paused;
        }

        /* ── Hero entrance ──────────────────────────────────────── */
        @keyframes heroFade {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        [data-name="PlaceholderForApp"] ~ * [data-name="App"] > div > div:first-child,
        .hero-anim {
          animation: heroFade 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }

        /* ── Hero illustration gentle float ─────────────────────── */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }

        [data-name="HeroIllustration"] {
          animation: float 5s ease-in-out infinite;
          will-change: transform;
        }

        /* ── Button hover lift ───────────────────────────────────── */
        [data-name="Link"] {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.2s ease;
          cursor: pointer;
        }
        [data-name="Link"]:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 6px 20px rgba(149, 117, 205, 0.35);
        }

        /* ── Feature card hover ───────────────────────────────────── */
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        [data-name="Container"]:has(> [data-name="Container"] > [data-name="Icon"]) {
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.28s ease;
        }
        [data-name="Container"]:has(> [data-name="Container"] > [data-name="Icon"]):hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px rgba(24, 22, 46, 0.1);
        }

        /* ── CTA section glow pulse ──────────────────────────────── */
        @keyframes glowPulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.25; transform: scale(1.08); }
        }

        /* target the two blurred blobs inside the dark CTA card */
        [data-name="App"] > div [style*="blur"] {
          animation: glowPulse 4s ease-in-out infinite;
        }
        [data-name="App"] > div [style*="blur"]:last-of-type {
          animation-delay: 2s;
        }

        /* ── Nav link hover underline ────────────────────────────── */
        [data-name="Link2"] p,
        [data-name="Link3"] p {
          position: relative;
          transition: color 0.2s ease;
        }
        [data-name="Link2"] p::after,
        [data-name="Link3"] p::after {
          content: '';
          position: absolute;
          left: 0; bottom: -2px;
          width: 0; height: 1.5px;
          background: #9575cd;
          transition: width 0.25s ease;
        }
        [data-name="Link2"]:hover p::after,
        [data-name="Link3"]:hover p::after {
          width: 100%;
        }

        /* ── Smooth scroll ───────────────────────────────────────── */
        html { scroll-behavior: smooth; }
      `}</style>

      {/* Wrapper — adds scroll-triggered class to each major Section */}
      <SectionAnimator>
        <Document />
      </SectionAnimator>
    </>
  );
}

/* Attaches .anim-section to each [data-name="Section"] after mount */
function SectionAnimator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const sections = ref.current.querySelectorAll('[data-name="Section"]');
    const delays = [0, 0.1, 0.2];
    sections.forEach((el, i) => {
      el.classList.add("anim-section");
      (el as HTMLElement).style.animationDelay = `${delays[i] ?? 0}s`;
    });
  }, []);

  return <div ref={ref} className="size-full">{children}</div>;
}
