"use client";

import { AppShell } from "@/components/AppShell";
import { ThemeStyleInjector } from "@/components/ThemeStyleInjector";
import { VaultDoorAnimation } from "@/components/VaultDoorAnimation";
import { VaultUnlock } from "@/components/VaultUnlock";
import { useVault } from "@/context/VaultContext";
import { DEFAULT_SKIN_ID } from "@/lib/theme-presets";

export default function Home() {
  const { status, vault, completeUnlock } = useVault();

  let content: React.ReactNode;
  if (status === "loading") {
    content = (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm uppercase tracking-widest text-vault-gold-dark">
          Opening vault...
        </p>
      </div>
    );
  } else if (status === "signed-out" || status === "locked") {
    content = <VaultUnlock mode={status} />;
  } else if (status === "unlocking") {
    content = <VaultDoorAnimation onComplete={completeUnlock} />;
  } else {
    content = <AppShell />;
  }

  return (
    <>
      <ThemeStyleInjector skinId={vault?.theme ?? DEFAULT_SKIN_ID} />
      {content}
    </>
  );
}
