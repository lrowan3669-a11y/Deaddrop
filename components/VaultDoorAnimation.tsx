"use client";

import { useEffect, useState } from "react";

const RIVET_COUNT = 20;
const SPOKE_COUNT = 6;
const PLATE_ANGLES = [45, 135, 225, 315];

type Phase = "authenticating" | "granted" | "opening";

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function VaultDoorAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("authenticating");

  useEffect(() => {
    const toGranted = setTimeout(() => setPhase("granted"), 900);
    const toOpening = setTimeout(() => setPhase("opening"), 1500);
    const done = setTimeout(() => onComplete(), 2300);
    return () => {
      clearTimeout(toGranted);
      clearTimeout(toOpening);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-vault-black">
      <div
        className={`relative flex h-72 w-72 items-center justify-center rounded-full transition-all duration-700 ease-in ${
          phase === "authenticating"
            ? "animate-[vault-pulse_1.6s_ease-in-out_infinite]"
            : ""
        } ${
          phase === "opening"
            ? "scale-90 rotate-[35deg] opacity-0"
            : "scale-100 rotate-0 opacity-100"
        }`}
      >
        <svg viewBox="0 0 300 300" className="h-full w-full">
          <defs>
            <radialGradient id="doorMetal" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#f4f4f7" />
              <stop offset="45%" stopColor="#c7c9d1" />
              <stop offset="75%" stopColor="#8b8d97" />
              <stop offset="100%" stopColor="#45464c" />
            </radialGradient>
            <radialGradient id="wheelMetal" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#fdfdfd" />
              <stop offset="50%" stopColor="#cfd1d6" />
              <stop offset="100%" stopColor="#65666d" />
            </radialGradient>
            <linearGradient id="hingeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a3a5ac" />
              <stop offset="100%" stopColor="#3a3b40" />
            </linearGradient>
            <radialGradient id="rivetMetal" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#eceef1" />
              <stop offset="100%" stopColor="#54555b" />
            </radialGradient>
          </defs>

          {/* hinges */}
          <rect x="6" y="82" width="32" height="34" rx="6" fill="url(#hingeMetal)" stroke="#26262a" strokeWidth="2" />
          <circle cx="22" cy="99" r="5.5" fill="#1c1c1f" />
          <rect x="6" y="184" width="32" height="34" rx="6" fill="url(#hingeMetal)" stroke="#26262a" strokeWidth="2" />
          <circle cx="22" cy="201" r="5.5" fill="#1c1c1f" />

          {/* door body */}
          <circle cx="150" cy="150" r="134" fill="url(#doorMetal)" stroke="#26262a" strokeWidth="4" />
          <circle cx="150" cy="150" r="134" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />

          {/* rivet ring */}
          {Array.from({ length: RIVET_COUNT }).map((_, i) => {
            const { x, y } = polar(150, 150, 118, (i * 360) / RIVET_COUNT);
            return <circle key={i} cx={x} cy={y} r="4.5" fill="url(#rivetMetal)" stroke="#3a3b40" strokeWidth="1" />;
          })}

          {/* reinforcement plates */}
          {PLATE_ANGLES.map((angle) => {
            const { x, y } = polar(150, 150, 100, angle);
            return (
              <g key={angle} transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
                <rect x="-16" y="-11" width="32" height="22" rx="3" fill="url(#hingeMetal)" stroke="#26262a" strokeWidth="1.5" />
                <circle cx="-9" cy="0" r="2.5" fill="#1c1c1f" />
                <circle cx="9" cy="0" r="2.5" fill="#1c1c1f" />
              </g>
            );
          })}

          {/* side lock cylinder */}
          <circle cx="228" cy="128" r="13" fill="url(#rivetMetal)" stroke="#26262a" strokeWidth="2" />
          <circle cx="228" cy="128" r="5" fill="#2b2b2f" />

          {/* wheel */}
          <g
            style={{ transformOrigin: "150px 150px" }}
            className={
              phase === "authenticating"
                ? "animate-[vault-spin_1.1s_linear_infinite]"
                : ""
            }
          >
            <circle cx="150" cy="150" r="58" fill="url(#wheelMetal)" stroke="#26262a" strokeWidth="3" />
            <circle cx="150" cy="150" r="58" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />
            {Array.from({ length: SPOKE_COUNT }).map((_, i) => {
              const angle = (i * 360) / SPOKE_COUNT;
              const inner = polar(150, 150, 20, angle);
              const outer = polar(150, 150, 52, angle);
              return (
                <g key={i}>
                  <line
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="#3a3b40"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  <line
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="url(#wheelMetal)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <circle cx={outer.x} cy={outer.y} r="6" fill="url(#wheelMetal)" stroke="#26262a" strokeWidth="1.5" />
                </g>
              );
            })}
            <circle cx="150" cy="150" r="19" fill="url(#wheelMetal)" stroke="#26262a" strokeWidth="3" />
            <circle cx="150" cy="150" r="7" fill="#3a3b40" />
          </g>
        </svg>
      </div>

      <p className="text-sm uppercase tracking-[0.4em] text-vault-gold">
        {phase === "authenticating" ? "Authenticating..." : "Access Granted"}
      </p>
    </div>
  );
}
