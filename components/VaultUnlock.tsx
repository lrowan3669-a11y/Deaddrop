"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { Button, Input, Panel } from "./ui";

export function VaultUnlock({ mode }: { mode: "no-vault" | "locked" }) {
  const { createVault, loadTestAccount, unlock, resetVault, vault } = useVault();
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleReset() {
    if (
      window.confirm(
        "This will permanently erase this vault, all connections, and message history on this device, so you can start over. Continue?",
      )
    ) {
      resetVault();
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!alias.trim()) {
      setError("Choose an alias — no real names.");
      return;
    }
    createVault(alias);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Panel className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-vault-gold-dark">
            Project DeadDrop
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-wide text-vault-gold">
            {mode === "no-vault" ? "OPEN VAULT" : `WELCOME BACK, ${vault?.alias}`}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Secure. Private. Unreadable.
          </p>
          {mode === "locked" && (
            <p className="mt-2 text-xs text-foreground/40">
              Password protection is off for this beta — just open the vault.
            </p>
          )}
        </div>

        {mode === "no-vault" ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Alias
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="No real names"
                autoComplete="off"
                autoFocus
              />
            </label>
            {error && <p className="text-sm text-vault-locked">{error}</p>}
            <Button type="submit">Create Vault</Button>
            <div className="flex items-center gap-3 text-xs text-foreground/40">
              <div className="h-px flex-1 bg-vault-steel" />
              or
              <div className="h-px flex-1 bg-vault-steel" />
            </div>
            <Button type="button" variant="secondary" onClick={loadTestAccount}>
              Load Test Account (Beta)
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <Button type="button" onClick={unlock}>
              Open Vault
            </Button>
            <button
              type="button"
              onClick={handleReset}
              className="text-center text-xs text-foreground/40 underline-offset-2 hover:text-vault-locked hover:underline"
            >
              Not you? Reset this vault
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
