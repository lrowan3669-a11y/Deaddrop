"use client";

import { useEffect, useState } from "react";
import { VaultDoorSvg } from "./VaultDoorSvg";

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
        <VaultDoorSvg spinning={phase === "authenticating"} className="h-full w-full" />
      </div>

      <p className="text-sm uppercase tracking-[0.4em] text-vault-gold">
        {phase === "authenticating" ? "Authenticating..." : "Access Granted"}
      </p>
    </div>
  );
}
