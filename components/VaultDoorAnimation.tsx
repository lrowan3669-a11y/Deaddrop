"use client";

import { useEffect, useState } from "react";
import { MatrixRain } from "./MatrixRain";
import { VaultDoorSvg } from "./VaultDoorSvg";

type Phase = "authenticating" | "granted" | "opening" | "decrypting";

const DECRYPT_CAPTIONS = [
  "Decrypting Transmission...",
  "Verifying Cipher Integrity...",
  "Access Complete",
];

export function VaultDoorAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("authenticating");
  const [decryptCaption, setDecryptCaption] = useState(0);

  useEffect(() => {
    const toGranted = setTimeout(() => setPhase("granted"), 900);
    const toOpening = setTimeout(() => setPhase("opening"), 1500);
    const toDecrypting = setTimeout(() => setPhase("decrypting"), 2300);
    const toCaption2 = setTimeout(() => setDecryptCaption(1), 3300);
    const toCaption3 = setTimeout(() => setDecryptCaption(2), 4300);
    const done = setTimeout(() => onComplete(), 5300);
    return () => {
      clearTimeout(toGranted);
      clearTimeout(toOpening);
      clearTimeout(toDecrypting);
      clearTimeout(toCaption2);
      clearTimeout(toCaption3);
      clearTimeout(done);
    };
  }, [onComplete]);

  if (phase === "decrypting") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-black">
        <MatrixRain className="absolute inset-0 h-full w-full" />
        <p className="relative z-10 animate-pulse text-sm uppercase tracking-[0.4em] text-vault-encoded">
          {DECRYPT_CAPTIONS[decryptCaption]}
        </p>
      </div>
    );
  }

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
