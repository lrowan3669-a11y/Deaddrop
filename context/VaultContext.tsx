"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { decodeMessage, encodeMessage, generateFriendCode } from "@/lib/cipher";
import {
  clearAllData,
  getDailyUsage,
  getFriends,
  getMessages,
  hashPassword,
  incrementDailyUsage,
  saveFriends,
  saveMessages,
  saveVault,
  seedTestAccount,
  verifyPassword,
} from "@/lib/storage";
import { DEFAULT_SKIN_ID, getVaultSkin, isSkinUnlockedForTier } from "@/lib/theme-presets";
import { tierConfig } from "@/lib/tiers";
import type { DecodedMessage, Friend, Tier, Vault } from "@/lib/types";
import {
  EMPTY_USAGE,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateSession,
} from "@/lib/vault-store";
import type { Status } from "@/lib/vault-store";

interface VaultContextValue {
  status: Status;
  vault: Vault | null;
  friends: Friend[];
  messages: DecodedMessage[];
  messagesRemaining: number | "unlimited";
  friendSlotsRemaining: number | "unlimited";

  createVault: (alias: string, password: string) => Promise<void>;
  loadTestAccount: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  completeUnlock: () => void;
  lock: () => void;
  resetVault: () => void;

  addFriend: (nickname: string, friendCode: string) => { ok: boolean; error?: string };
  removeFriend: (id: string) => void;

  sendEncoded: (
    friendId: string,
    plainText: string,
  ) => { ok: boolean; cipherText?: string; error?: string };
  decodeIncoming: (
    friendId: string,
    cipherText: string,
  ) => { ok: boolean; plainText?: string; error?: string };
  dismissMessage: (id: string) => void;

  setTier: (tier: Tier) => void;
  setTheme: (theme: string) => void;
  setBioEncodingEnabled: (enabled: boolean) => void;
  updateAlias: (alias: string) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { status, vault, friends, messages, dailyUsage } = session;

  const createVault = useCallback(async (alias: string, password: string) => {
    const newVault: Vault = {
      alias,
      passwordHash: await hashPassword(password),
      tier: "free",
      theme: "classified",
      friendCode: generateFriendCode(),
      cipherType: "affine",
      bioEncodingEnabled: false,
      createdAt: Date.now(),
    };
    saveVault(newVault);
    saveFriends([]);
    saveMessages([]);
    updateSession(() => ({
      status: "unlocking",
      vault: newVault,
      friends: [],
      messages: [],
      dailyUsage: getDailyUsage(),
    }));
  }, []);

  const loadTestAccount = useCallback(async () => {
    const seeded = await seedTestAccount();
    updateSession(() => ({
      status: "unlocking",
      vault: seeded,
      friends: getFriends(),
      messages: getMessages(),
      dailyUsage: getDailyUsage(),
    }));
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      if (!vault) return false;
      const ok = await verifyPassword(password, vault.passwordHash);
      if (ok) {
        updateSession((s) => ({
          ...s,
          status: "unlocking",
          friends: getFriends(),
          messages: getMessages(),
          dailyUsage: getDailyUsage(),
        }));
      }
      return ok;
    },
    [vault],
  );

  const completeUnlock = useCallback(() => {
    updateSession((s) => ({ ...s, status: "unlocked" }));
  }, []);

  const lock = useCallback(() => {
    updateSession((s) => ({ ...s, status: "locked" }));
  }, []);

  const resetVault = useCallback(() => {
    clearAllData();
    updateSession(() => ({
      status: "no-vault",
      vault: null,
      friends: [],
      messages: [],
      dailyUsage: EMPTY_USAGE,
    }));
  }, []);

  const persistVault = useCallback((next: Vault) => {
    saveVault(next);
    updateSession((s) => ({ ...s, vault: next }));
  }, []);

  const addFriend = useCallback(
    (nickname: string, friendCode: string) => {
      if (!vault) return { ok: false, error: "No vault loaded" };
      const config = tierConfig(vault.tier);
      if (
        config.maxFriends !== "unlimited" &&
        friends.length >= config.maxFriends
      ) {
        return {
          ok: false,
          error: `${config.label} is limited to ${config.maxFriends} friends. Upgrade to add more.`,
        };
      }
      if (!nickname.trim() || !friendCode.trim()) {
        return { ok: false, error: "Nickname and friend code are required." };
      }
      const newFriend: Friend = {
        id: crypto.randomUUID(),
        nickname: nickname.trim(),
        friendCode: friendCode.trim(),
        createdAt: Date.now(),
      };
      const next = [...friends, newFriend];
      saveFriends(next);
      updateSession((s) => ({ ...s, friends: next }));
      return { ok: true };
    },
    [friends, vault],
  );

  const removeFriend = useCallback(
    (id: string) => {
      const next = friends.filter((f) => f.id !== id);
      saveFriends(next);
      updateSession((s) => ({ ...s, friends: next }));
    },
    [friends],
  );

  const sendEncoded = useCallback(
    (friendId: string, plainText: string) => {
      if (!vault) return { ok: false, error: "No vault loaded" };
      const config = tierConfig(vault.tier);
      const usage = getDailyUsage();
      if (
        config.maxMessagesPerDay !== "unlimited" &&
        usage.count >= config.maxMessagesPerDay
      ) {
        return {
          ok: false,
          error: `${config.label} is limited to ${config.maxMessagesPerDay} messages a day. Upgrade for more.`,
        };
      }
      const friend = friends.find((f) => f.id === friendId);
      if (!friend) return { ok: false, error: "Unknown connection." };

      const cipherText = encodeMessage(plainText, friend.friendCode);
      const record: DecodedMessage = {
        id: crypto.randomUUID(),
        friendId,
        direction: "sent",
        plainText,
        cipherText,
        createdAt: Date.now(),
        read: true,
      };
      const nextMessages = [record, ...messages];
      saveMessages(nextMessages);
      const nextUsage = incrementDailyUsage();
      updateSession((s) => ({ ...s, messages: nextMessages, dailyUsage: nextUsage }));
      return { ok: true, cipherText };
    },
    [friends, messages, vault],
  );

  const decodeIncoming = useCallback(
    (friendId: string, cipherText: string) => {
      const friend = friends.find((f) => f.id === friendId);
      if (!friend) return { ok: false, error: "Unknown connection." };

      const plainText = decodeMessage(cipherText, friend.friendCode);
      const record: DecodedMessage = {
        id: crypto.randomUUID(),
        friendId,
        direction: "received",
        plainText,
        cipherText,
        createdAt: Date.now(),
        read: false,
      };
      const next = [record, ...messages];
      saveMessages(next);
      updateSession((s) => ({ ...s, messages: next }));
      return { ok: true, plainText };
    },
    [friends, messages],
  );

  const dismissMessage = useCallback(
    (id: string) => {
      // Destroying a message removes both the sent and received copy of it
      // from this conversation's history, simulating a shared self-destruct.
      const target = messages.find((m) => m.id === id);
      const next = target
        ? messages.filter(
            (m) =>
              !(m.friendId === target.friendId && m.cipherText === target.cipherText),
          )
        : messages;
      saveMessages(next);
      updateSession((s) => ({ ...s, messages: next }));
    },
    [messages],
  );

  const setTier = useCallback(
    (tier: Tier) => {
      if (!vault) return;
      const currentSkin = getVaultSkin(vault.theme);
      const nextTheme = isSkinUnlockedForTier(currentSkin, tier)
        ? vault.theme
        : DEFAULT_SKIN_ID;
      persistVault({ ...vault, tier, theme: nextTheme });
    },
    [vault, persistVault],
  );

  const setTheme = useCallback(
    (theme: string) => {
      if (!vault) return;
      const skin = getVaultSkin(theme);
      if (!isSkinUnlockedForTier(skin, vault.tier)) return;
      persistVault({ ...vault, theme });
    },
    [vault, persistVault],
  );

  const setBioEncodingEnabled = useCallback(
    (enabled: boolean) => {
      if (!vault) return;
      if (!tierConfig(vault.tier).bioEncoding) return;
      persistVault({ ...vault, bioEncodingEnabled: enabled });
    },
    [vault, persistVault],
  );

  const updateAlias = useCallback(
    (alias: string) => {
      if (!vault || !alias.trim()) return;
      persistVault({ ...vault, alias: alias.trim() });
    },
    [vault, persistVault],
  );

  const messagesRemaining = useMemo<number | "unlimited">(() => {
    if (!vault) return 0;
    const config = tierConfig(vault.tier);
    if (config.maxMessagesPerDay === "unlimited") return "unlimited";
    return Math.max(0, config.maxMessagesPerDay - dailyUsage.count);
  }, [vault, dailyUsage]);

  const friendSlotsRemaining = useMemo<number | "unlimited">(() => {
    if (!vault) return 0;
    const config = tierConfig(vault.tier);
    if (config.maxFriends === "unlimited") return "unlimited";
    return Math.max(0, config.maxFriends - friends.length);
  }, [vault, friends]);

  const value: VaultContextValue = {
    status,
    vault,
    friends,
    messages,
    messagesRemaining,
    friendSlotsRemaining,
    createVault,
    loadTestAccount,
    unlock,
    completeUnlock,
    lock,
    resetVault,
    addFriend,
    removeFriend,
    sendEncoded,
    decodeIncoming,
    dismissMessage,
    setTier,
    setTheme,
    setBioEncodingEnabled,
    updateAlias,
  };

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
