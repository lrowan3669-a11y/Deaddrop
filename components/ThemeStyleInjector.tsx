"use client";

import { useEffect } from "react";
import { getVaultSkin } from "@/lib/theme-presets";

export function ThemeStyleInjector({ skinId }: { skinId: string }) {
  useEffect(() => {
    const skin = getVaultSkin(skinId);
    const root = document.documentElement.style;
    root.setProperty("--color-vault-gold", skin.colors.gold);
    root.setProperty("--color-vault-gold-dark", skin.colors.goldDark);
    root.setProperty("--color-vault-gunmetal", skin.colors.gunmetal);
    root.setProperty("--color-vault-steel", skin.colors.steel);
    root.setProperty("--color-vault-black", skin.colors.background);
    root.setProperty("--background", skin.colors.background);
    root.setProperty("--color-vault-encoded", skin.colors.encoded);
    root.setProperty("--color-vault-locked", skin.colors.locked);
  }, [skinId]);

  return null;
}
