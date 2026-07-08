"use client";

import { AppShell } from "@/components/AppShell";
import { VaultUnlock } from "@/components/VaultUnlock";
import { useVault } from "@/context/VaultContext";

export default function Home() {
  const { status } = useVault();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm uppercase tracking-widest text-vault-gold-dark">
          Opening vault...
        </p>
      </div>
    );
  }

  if (status === "no-vault" || status === "locked") {
    return <VaultUnlock mode={status} />;
  }

  return <AppShell />;
}
