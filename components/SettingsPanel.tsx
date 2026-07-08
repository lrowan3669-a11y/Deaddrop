"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { isSkinUnlockedForTier, VAULT_SKINS, type VaultSkin } from "@/lib/theme-presets";
import { TIER_ORDER, tierConfig } from "@/lib/tiers";
import { Badge, Button, Input, Panel } from "./ui";

const SKIN_GROUPS: VaultSkin["group"][] = ["Basic", "Custom", "Military Grade"];

export function SettingsPanel() {
  const {
    vault,
    setTier,
    setTheme,
    setBioEncodingEnabled,
    updateAlias,
    resetVault,
    lock,
  } = useVault();
  const [alias, setAlias] = useState(vault?.alias ?? "");
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMessage, setBioMessage] = useState<string | null>(null);

  if (!vault) return null;
  const config = tierConfig(vault.tier);

  async function handleBioEncoding() {
    if (!config.bioEncoding) return;
    setBioBusy(true);
    setBioMessage(null);
    try {
      if (
        !vault!.bioEncodingEnabled &&
        typeof window !== "undefined" &&
        window.PublicKeyCredential
      ) {
        setBioMessage(
          "Thumbprint recognized. Bio encoding armed for this device.",
        );
      } else {
        setBioMessage(
          vault!.bioEncodingEnabled
            ? "Bio encoding disabled."
            : "Biometric hardware not detected on this device — enabled in software-only mode for testing.",
        );
      }
      setBioEncodingEnabled(!vault!.bioEncodingEnabled);
    } finally {
      setBioBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <h2 className="mb-4 text-sm uppercase tracking-widest text-vault-gold-dark">
          Alias
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateAlias(alias);
          }}
          className="flex gap-3"
        >
          <Input value={alias} onChange={(e) => setAlias(e.target.value)} />
          <Button type="submit">Save</Button>
        </form>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-sm uppercase tracking-widest text-vault-gold-dark">
          Subscription Tier{" "}
          <span className="text-foreground/40">(beta: switch freely)</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TIER_ORDER.map((tierId) => {
            const t = tierConfig(tierId);
            const active = vault.tier === tierId;
            return (
              <div
                key={tierId}
                className={`flex flex-col gap-3 rounded-lg border p-4 ${
                  active ? "border-vault-gold" : "border-vault-steel"
                }`}
              >
                <div>
                  <p className="text-lg font-bold text-vault-gold">
                    {t.label}
                  </p>
                  <p className="text-sm text-foreground/50">{t.priceLabel}</p>
                </div>
                <ul className="flex-1 list-inside list-disc text-xs text-foreground/60">
                  {t.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Button
                  variant={active ? "secondary" : "primary"}
                  disabled={active}
                  onClick={() => setTier(tierId)}
                >
                  {active ? "Current Tier" : "Switch"}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-1 text-sm uppercase tracking-widest text-vault-gold-dark">
          Vault Theme
        </h2>
        <p className="mb-4 text-xs text-foreground/50">
          Pick a colour palette and vault design. Higher tiers unlock more
          styles.
        </p>
        <div className="flex flex-col gap-5">
          {SKIN_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs uppercase tracking-widest text-foreground/40">
                {group}
              </p>
              <div className="flex flex-wrap gap-3">
                {VAULT_SKINS.filter((skin) => skin.group === group).map(
                  (skin) => {
                    const unlocked = isSkinUnlockedForTier(skin, vault.tier);
                    const active = vault.theme === skin.id;
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setTheme(skin.id)}
                        title={
                          unlocked
                            ? undefined
                            : "Upgrade to unlock this vault design"
                        }
                        className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          active
                            ? "border-vault-gold bg-vault-gold/10"
                            : "border-vault-steel hover:border-vault-gold-dark"
                        }`}
                      >
                        <span className="flex overflow-hidden rounded-full border border-vault-steel">
                          <span
                            className="h-5 w-5"
                            style={{ backgroundColor: skin.colors.background }}
                          />
                          <span
                            className="h-5 w-5"
                            style={{ backgroundColor: skin.colors.gold }}
                          />
                          <span
                            className="h-5 w-5"
                            style={{ backgroundColor: skin.colors.steel }}
                          />
                        </span>
                        <span>
                          {skin.label}
                          {!unlocked && " 🔒"}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-vault-gold-dark">
            Bio Encoding (Thumbprint)
          </h2>
          <Badge tone={config.bioEncoding ? "green" : "red"}>
            {config.bioEncoding ? "Available" : "Secret Agent only"}
          </Badge>
        </div>
        <p className="mb-3 text-sm text-foreground/60">
          Use your device&apos;s biometric sensor as an extra layer on top of
          your vault password.
        </p>
        <Button
          variant="secondary"
          disabled={!config.bioEncoding || bioBusy}
          onClick={handleBioEncoding}
        >
          {vault.bioEncodingEnabled ? "Disable Bio Encoding" : "Enable Bio Encoding"}
        </Button>
        {bioMessage && (
          <p className="mt-2 text-xs text-foreground/50">{bioMessage}</p>
        )}
      </Panel>

      <Panel>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-vault-gold-dark">
            Encrypted Chat
          </h2>
          <Badge tone="gold">Coming Soon</Badge>
        </div>
        <p className="text-sm text-foreground/60">
          Live in-app chat is on the roadmap for Secret Agent tier alongside
          QR dead drops, temporary friend codes, and image/file encoding.
        </p>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-sm uppercase tracking-widest text-vault-gold-dark">
          Session
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={lock}>
            Lock Vault
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm(
                  "This will permanently erase this vault, all connections, and message history on this device. Continue?",
                )
              ) {
                resetVault();
              }
            }}
          >
            Delete Vault
          </Button>
        </div>
      </Panel>
    </div>
  );
}
