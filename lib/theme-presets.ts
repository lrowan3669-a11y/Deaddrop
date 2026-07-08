import { TIER_ORDER } from "./tiers";
import type { Tier } from "./types";

export interface VaultSkinColors {
  gold: string;
  goldDark: string;
  gunmetal: string;
  steel: string;
  background: string;
  encoded: string;
  locked: string;
}

export interface VaultSkin {
  id: string;
  label: string;
  group: "Basic" | "Custom" | "Military Grade";
  minTier: Tier;
  colors: VaultSkinColors;
}

export const DEFAULT_SKIN_ID = "classified";

export const VAULT_SKINS: VaultSkin[] = [
  {
    id: "classified",
    label: "Classified Gold",
    group: "Basic",
    minTier: "free",
    colors: {
      gold: "#cba24a",
      goldDark: "#7a6a36",
      gunmetal: "#1a1a1a",
      steel: "#2c2c34",
      background: "#0b0b0b",
      encoded: "#00d084",
      locked: "#ff3b3b",
    },
  },
  {
    id: "sapphire",
    label: "Sapphire Vault",
    group: "Custom",
    minTier: "agent",
    colors: {
      gold: "#5aa9e6",
      goldDark: "#2c5f8a",
      gunmetal: "#141c26",
      steel: "#243447",
      background: "#070b10",
      encoded: "#00d0c8",
      locked: "#ff5470",
    },
  },
  {
    id: "emerald",
    label: "Emerald Vault",
    group: "Custom",
    minTier: "agent",
    colors: {
      gold: "#4fbf7a",
      goldDark: "#2c7a4d",
      gunmetal: "#131d17",
      steel: "#233b2c",
      background: "#080c09",
      encoded: "#8fe388",
      locked: "#ff6b5e",
    },
  },
  {
    id: "crimson",
    label: "Crimson Vault",
    group: "Custom",
    minTier: "agent",
    colors: {
      gold: "#d6584f",
      goldDark: "#8a352e",
      gunmetal: "#1d1414",
      steel: "#3a2424",
      background: "#0c0808",
      encoded: "#ffb347",
      locked: "#ff3b3b",
    },
  },
  {
    id: "desert-ops",
    label: "Desert Ops",
    group: "Military Grade",
    minTier: "secret",
    colors: {
      gold: "#c9a668",
      goldDark: "#8a6f3f",
      gunmetal: "#211d15",
      steel: "#453b28",
      background: "#0e0c08",
      encoded: "#9bd35a",
      locked: "#e5533d",
    },
  },
  {
    id: "night-ops",
    label: "Night Ops",
    group: "Military Grade",
    minTier: "secret",
    colors: {
      gold: "#8fa3ad",
      goldDark: "#4c5b63",
      gunmetal: "#101416",
      steel: "#232c30",
      background: "#050708",
      encoded: "#4fd1c5",
      locked: "#ff4d4d",
    },
  },
  {
    id: "onyx-steel",
    label: "Onyx Steel",
    group: "Military Grade",
    minTier: "secret",
    colors: {
      gold: "#d8d8d8",
      goldDark: "#7a7a7a",
      gunmetal: "#161616",
      steel: "#2e2e2e",
      background: "#0a0a0a",
      encoded: "#5ee6c8",
      locked: "#ff4444",
    },
  },
];

export function getVaultSkin(id: string): VaultSkin {
  return VAULT_SKINS.find((skin) => skin.id === id) ?? VAULT_SKINS[0];
}

export function isSkinUnlockedForTier(skin: VaultSkin, tier: Tier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(skin.minTier);
}
