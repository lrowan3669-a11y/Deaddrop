"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { Button, Input, Panel } from "./ui";
import { VaultDoorSvg } from "./VaultDoorSvg";
import { VaultRoomBackground } from "./VaultRoomBackground";

function isValidPin(pin: string) {
  return /^[0-9]{4,6}$/.test(pin);
}

function SignedOutForms() {
  const { signUp, logIn } = useVault();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!alias.trim()) return setError("Choose an alias — no real names.");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!isValidPin(pin)) return setError("PIN must be 4-6 digits.");
    if (pin !== confirmPin) return setError("PINs do not match.");

    setBusy(true);
    const result = await signUp(email.trim(), password, alias.trim(), pin);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not create an account.");
      return;
    }
    if (result.needsEmailConfirmation) {
      setNotice("Check your email to confirm your account, then log in below.");
      setMode("login");
    }
  }

  async function handleLogIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) return setError("Email and password are required.");
    setBusy(true);
    const result = await logIn(email.trim(), password);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Could not log in.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-md border border-vault-steel text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setNotice(null);
          }}
          className={`flex-1 rounded-l-md py-2 ${mode === "signup" ? "bg-vault-gold text-vault-black" : "text-foreground/60"}`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setNotice(null);
          }}
          className={`flex-1 rounded-r-md py-2 ${mode === "login" ? "bg-vault-gold text-vault-black" : "text-foreground/60"}`}
        >
          Log In
        </button>
      </div>

      {mode === "signup" ? (
        <form onSubmit={handleSignUp} className="flex flex-col gap-3">
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
            Email
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
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
          <label className="flex flex-col gap-1 text-sm">
            Vault PIN (4-6 digits)
            <Input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              maxLength={6}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Confirm PIN
            <Input
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ""))}
              maxLength={6}
              autoComplete="off"
            />
          </label>
          {error && <p className="text-sm text-vault-locked">{error}</p>}
          {notice && <p className="text-sm text-vault-encoded">{notice}</p>}
          <Button type="submit" disabled={busy}>
            Create Vault
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogIn} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-vault-locked">{error}</p>}
          {notice && <p className="text-sm text-vault-encoded">{notice}</p>}
          <Button type="submit" disabled={busy}>
            Log In
          </Button>
        </form>
      )}
    </div>
  );
}

function LockedForm() {
  const { vault, verifyPin, changePin, logOut } = useVault();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await verifyPin(pin);
    setBusy(false);
    if (!result.ok) {
      if (result.error?.toLowerCase().includes("no pin set")) {
        setShowForgot(true);
        setNotice("No PIN has been set for this vault yet — set one below to continue.");
        setPin("");
        return;
      }
      setError(result.error ?? "Incorrect PIN.");
      setPin("");
    }
  }

  async function handleSetNewPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!isValidPin(newPin)) return setError("PIN must be 4-6 digits.");
    if (newPin !== confirmNewPin) return setError("PINs do not match.");
    setBusy(true);
    const result = await changePin(newPin);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not update PIN.");
      return;
    }
    setNotice("PIN updated. Enter it below to open your vault.");
    setShowForgot(false);
    setNewPin("");
    setConfirmNewPin("");
  }

  if (showForgot) {
    return (
      <form onSubmit={handleSetNewPin} className="flex flex-col gap-3">
        <p className="text-center text-xs text-foreground/50">
          {notice ??
            `You're still signed in as ${vault?.alias}, so you can set a new PIN directly.`}
        </p>
        <label className="flex flex-col gap-1 text-sm">
          New PIN (4-6 digits)
          <Input
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))}
            maxLength={6}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm new PIN
          <Input
            inputMode="numeric"
            value={confirmNewPin}
            onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ""))}
            maxLength={6}
          />
        </label>
        {error && <p className="text-sm text-vault-locked">{error}</p>}
        <Button type="submit" disabled={busy}>
          Set New PIN
        </Button>
        <button
          type="button"
          onClick={() => {
            setShowForgot(false);
            setNotice(null);
          }}
          className="text-center text-xs text-foreground/40 hover:underline"
        >
          Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleUnlock} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Vault PIN
        <Input
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
          maxLength={6}
          autoFocus
          placeholder="••••"
        />
      </label>
      {error && <p className="text-sm text-vault-locked">{error}</p>}
      {notice && <p className="text-sm text-vault-encoded">{notice}</p>}
      <Button type="submit" disabled={busy || pin.length < 4}>
        Open Vault
      </Button>
      <div className="flex justify-between text-xs text-foreground/40">
        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="hover:underline"
        >
          Forgot PIN?
        </button>
        <button
          type="button"
          onClick={() => logOut()}
          className="hover:text-vault-locked hover:underline"
        >
          Not you? Log out
        </button>
      </div>
    </form>
  );
}

export function VaultUnlock({ mode }: { mode: "signed-out" | "locked" }) {
  const { vault } = useVault();

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <VaultRoomBackground />

      <VaultDoorSvg className="h-48 w-48 drop-shadow-[0_0_45px_color-mix(in_srgb,var(--color-vault-gold)_45%,transparent)] sm:h-64 sm:w-64" />

      <Panel className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-vault-gold-dark">
            Project DeadDrop
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-wide text-vault-gold">
            {mode === "signed-out" ? "OPEN VAULT" : `WELCOME BACK, ${vault?.alias}`}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Secure. Private. Unreadable.
          </p>
        </div>

        {mode === "signed-out" ? <SignedOutForms /> : <LockedForm />}
      </Panel>
    </div>
  );
}
