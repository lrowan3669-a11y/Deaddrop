"use client";

function KeyCap({
  keyChar,
  label,
  onClick,
}: {
  keyChar: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 rounded-md border-2 border-vault-gold-dark bg-vault-steel px-4 py-6 font-mono text-vault-gold shadow-[0_5px_0_0_var(--color-vault-gold-dark),0_8px_14px_rgba(0,0,0,0.6)] transition-all duration-100 hover:brightness-110 active:translate-y-[4px] active:shadow-[0_1px_0_0_var(--color-vault-gold-dark),0_2px_4px_rgba(0,0,0,0.6)]"
    >
      <span className="text-3xl font-bold leading-none">{keyChar}</span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-vault-encoded">
        {label}
      </span>
    </button>
  );
}

export function KeyboardHome({
  onNavigate,
  onLock,
}: {
  onNavigate: (tab: "workspace" | "connections" | "settings") => void;
  onLock: () => void;
}) {
  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-vault-gold-dark">
          Project DeadDrop
        </p>
        <h1 className="mt-1 text-lg font-bold text-vault-gold">
          Select a function
        </h1>
      </div>
      <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-4 sm:grid-cols-3">
        <KeyCap keyChar="M" label="Message" onClick={() => onNavigate("workspace")} />
        <KeyCap keyChar="+" label="Add Friend" onClick={() => onNavigate("connections")} />
        <KeyCap keyChar="$" label="Upgrade" onClick={() => onNavigate("settings")} />
        <KeyCap keyChar="S" label="Settings" onClick={() => onNavigate("settings")} />
        <KeyCap keyChar="L" label="Lock Vault" onClick={onLock} />
      </div>
    </div>
  );
}
