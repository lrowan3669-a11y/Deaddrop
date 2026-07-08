"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { tierConfig } from "@/lib/tiers";
import { EncodeDecodeWorkspace } from "./EncodeDecodeWorkspace";
import { FriendManager } from "./FriendManager";
import { MatrixRain } from "./MatrixRain";
import { SettingsPanel } from "./SettingsPanel";
import { Badge } from "./ui";

type Tab = "workspace" | "connections" | "settings";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "workspace", label: "Encode / Decode" },
  { id: "connections", label: "Connections" },
  { id: "settings", label: "Settings" },
];

export function AppShell() {
  const { vault } = useVault();
  const [tab, setTab] = useState<Tab>("workspace");

  if (!vault) return null;
  const config = tierConfig(vault.tier);

  return (
    <div className="relative flex flex-1 flex-col">
      <MatrixRain className="fixed inset-0 -z-10 opacity-[0.12]" />

      <header className="border-b border-vault-steel px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-vault-gold-dark">
              DeadDrop Vault
            </p>
            <h1 className="text-lg font-bold text-vault-gold">
              {vault.alias}
            </h1>
          </div>
          <Badge tone="gold">{config.label}</Badge>
        </div>
      </header>

      <nav className="border-b border-vault-steel px-6">
        <div className="mx-auto flex max-w-5xl gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                tab === t.id
                  ? "border-vault-gold text-vault-gold"
                  : "border-transparent text-foreground/50 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {tab === "workspace" && <EncodeDecodeWorkspace />}
        {tab === "connections" && <FriendManager />}
        {tab === "settings" && <SettingsPanel />}
      </main>
    </div>
  );
}
