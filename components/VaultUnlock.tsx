"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { TEST_ACCOUNT_PASSWORD } from "@/lib/storage";
import { Button, Input, Panel } from "./ui";

export function VaultUnlock({ mode }: { mode: "no-vault" | "locked" }) {
  const { createVault, loadTestAccount, unlock, resetVault, vault } = useVault();
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleForgotPassword() {
    if (
      window.confirm(
        "This will permanently erase this vault, all connections, and message history on this device, so you can start over. Continue?",
      )
    ) {
      resetVault();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!alias.trim()) {
      setError("Choose an alias — no real names.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    await createVault(alias, password);
    setBusy(false);
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const ok = await unlock(password);
    setBusy(false);
    if (!ok) setError("Incorrect password.");
  }

  async function handleTestAccount() {
    setBusy(true);
    await loadTestAccount();
    setBusy(false);
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
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Vault password
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Confirm password
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error && <p className="text-sm text-vault-locked">{error}</p>}
            <Button type="submit" disabled={busy}>
              Create Vault
            </Button>
            <div className="flex items-center gap-3 text-xs text-foreground/40">
              <div className="h-px flex-1 bg-vault-steel" />
              or
              <div className="h-px flex-1 bg-vault-steel" />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestAccount}
              disabled={busy}
            >
              Load Test Account (Beta)
            </Button>
            <p className="text-center text-xs text-foreground/40">
              Test account password: {TEST_ACCOUNT_PASSWORD}
            </p>
          </form>
        ) : (
          <form onSubmit={handleUnlock} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Vault password
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
            </label>
            {error && <p className="text-sm text-vault-locked">{error}</p>}
            <Button type="submit" disabled={busy}>
              Unlock Vault
            </Button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-center text-xs text-foreground/40 underline-offset-2 hover:text-vault-locked hover:underline"
            >
              Forgot password? Reset this vault
            </button>
          </form>
        )}
      </Panel>
    </div>
  );
}
