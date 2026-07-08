"use client";

import { useEffect, useState } from "react";

const BOLT_COUNT = 12;
const SPOKE_COUNT = 8;

type Phase = "authenticating" | "granted" | "opening";

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
        className={`relative flex h-64 w-64 items-center justify-center rounded-full border-[6px] border-vault-gold-dark bg-gradient-to-br from-vault-steel to-vault-black transition-all duration-700 ease-in ${
          phase === "authenticating" ? "animate-[vault-pulse_1.6s_ease-in-out_infinite]" : ""
        } ${
          phase === "opening"
            ? "scale-90 rotate-[35deg] opacity-0"
            : "scale-100 rotate-0 opacity-100"
        }`}
      >
        {Array.from({ length: BOLT_COUNT }).map((_, i) => (
          <span
            key={i}
            className="absolute h-3 w-3 rounded-full bg-vault-gold-dark"
            style={{
              transform: `rotate(${(i * 360) / BOLT_COUNT}deg) translateY(-118px)`,
            }}
          />
        ))}

        <div
          className={`relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-vault-gold ${
            phase === "authenticating"
              ? "animate-[vault-spin_1.1s_linear_infinite]"
              : ""
          }`}
        >
          {Array.from({ length: SPOKE_COUNT }).map((_, i) => (
            <span
              key={i}
              className="absolute h-full w-1 bg-vault-gold"
              style={{ transform: `rotate(${(i * 180) / SPOKE_COUNT}deg)` }}
            />
          ))}
          <div className="absolute h-6 w-6 rounded-full bg-vault-gold" />
        </div>
      </div>

      <p className="text-sm uppercase tracking-[0.4em] text-vault-gold">
        {phase === "authenticating" ? "Authenticating..." : "Access Granted"}
      </p>
    </div>
  );
}
