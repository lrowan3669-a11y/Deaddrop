"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { decodeMessage, encodeMessage } from "@/lib/cipher";
import {
  addConnection,
  countMessagesToday,
  createProfile,
  deleteMessage,
  deleteProfile,
  fetchProfile,
  getSession,
  listConnections,
  listMessages,
  onAuthStateChange,
  removeConnection,
  sendMessage,
  setPin as setPinQuery,
  signIn,
  signOut,
  signUp,
  updateProfile,
  verifyPin as verifyPinQuery,
} from "@/lib/supabase/queries";
import { DEFAULT_SKIN_ID, getVaultSkin, isSkinUnlockedForTier } from "@/lib/theme-presets";
import { tierConfig } from "@/lib/tiers";
import type { Connection, Message, Tier, Vault } from "@/lib/types";

type Status = "loading" | "signed-out" | "locked" | "unlocking" | "unlocked";

type ActionResult = { ok: boolean; error?: string };

interface VaultContextValue {
  status: Status;
  vault: Vault | null;
  friends: Connection[];
  messages: Message[];
  messagesRemaining: number | "unlimited";
  friendSlotsRemaining: number | "unlimited";

  signUp: (
    email: string,
    password: string,
    alias: string,
    pin: string,
  ) => Promise<ActionResult & { needsEmailConfirmation?: boolean }>;
  logIn: (email: string, password: string) => Promise<ActionResult>;
  verifyPin: (pin: string) => Promise<ActionResult>;
  changePin: (pin: string) => Promise<ActionResult>;
  biometricUnlock: () => Promise<ActionResult>;
  completeUnlock: () => void;
  lock: () => void;
  logOut: () => Promise<void>;
  resetVault: () => Promise<void>;

  addFriend: (nickname: string, friendCode: string) => Promise<ActionResult>;
  removeFriend: (id: string) => Promise<void>;

  sendEncoded: (
    connectionId: string,
    plainText: string,
  ) => Promise<{ ok: boolean; cipherText?: string; error?: string }>;
  decodeIncoming: (
    connectionId: string,
    cipherText: string,
  ) => { ok: boolean; plainText?: string; error?: string };
  dismissMessage: (id: string) => Promise<void>;

  setTier: (tier: Tier) => void;
  setTheme: (theme: string) => void;
  setBioEncodingEnabled: (enabled: boolean) => void;
  updateAlias: (alias: string) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [vault, setVault] = useState<Vault | null>(null);
  const [friends, setFriends] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesSentToday, setMessagesSentToday] = useState(0);
  const signupInProgress = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadForSession(session: Session | null) {
      if (signupInProgress.current) return;
      if (cancelled) return;

      if (!session) {
        setUserId(null);
        setVault(null);
        setFriends([]);
        setMessages([]);
        setStatus("signed-out");
        return;
      }

      setUserId(session.user.id);
      const profile = await fetchProfile(session.user.id);
      if (cancelled) return;

      if (!profile) {
        await signOut();
        if (!cancelled) setStatus("signed-out");
        return;
      }

      setVault(profile);
      setStatus("locked");
    }

    getSession().then(loadForSession);
    const subscription = onAuthStateChange(loadForSession);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshUnlockedData = useCallback(async (uid: string) => {
    const [conns, msgs, sentToday] = await Promise.all([
      listConnections(),
      listMessages(),
      countMessagesToday(uid),
    ]);
    setFriends(conns);
    setMessages(msgs);
    setMessagesSentToday(sentToday);
  }, []);

  const signUpAction = useCallback(
    async (email: string, password: string, alias: string, pin: string) => {
      signupInProgress.current = true;
      try {
        const result = await signUp(email, password);
        if (result.error) return { ok: false, error: result.error };
        if (!result.userId) return { ok: false, error: "Sign up failed." };

        if (result.needsEmailConfirmation) {
          return { ok: true, needsEmailConfirmation: true };
        }

        const { profile, error: createError } = await createProfile(result.userId, alias);
        if (createError || !profile) {
          return { ok: false, error: createError ?? "Could not create profile." };
        }
        const pinResult = await setPinQuery(pin);
        if (pinResult.error) return { ok: false, error: pinResult.error };

        setUserId(result.userId);
        setVault(profile);
        await refreshUnlockedData(result.userId);
        setStatus("unlocking");
        return { ok: true, needsEmailConfirmation: false };
      } finally {
        signupInProgress.current = false;
      }
    },
    [refreshUnlockedData],
  );

  const logInAction = useCallback(async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  const verifyPinAction = useCallback(
    async (pin: string) => {
      const result = await verifyPinQuery(pin);
      if (!result.ok) return { ok: false, error: result.error ?? "Incorrect PIN." };
      if (userId) await refreshUnlockedData(userId);
      setStatus("unlocking");
      return { ok: true };
    },
    [userId, refreshUnlockedData],
  );

  const changePinAction = useCallback(async (pin: string) => {
    const result = await setPinQuery(pin);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  const biometricUnlockAction = useCallback(async () => {
    if (!userId) return { ok: false, error: "Not signed in." };
    await refreshUnlockedData(userId);
    setStatus("unlocking");
    return { ok: true };
  }, [userId, refreshUnlockedData]);

  const completeUnlock = useCallback(() => {
    setStatus("unlocked");
  }, []);

  const lock = useCallback(() => {
    setStatus("locked");
  }, []);

  const logOutAction = useCallback(async () => {
    await signOut();
    setUserId(null);
    setVault(null);
    setFriends([]);
    setMessages([]);
    setStatus("signed-out");
  }, []);

  const resetVaultAction = useCallback(async () => {
    if (!userId) return;
    const { error } = await deleteProfile(userId);
    if (error) {
      console.error("Could not delete vault:", error);
      return;
    }
    await signOut();
    setUserId(null);
    setVault(null);
    setFriends([]);
    setMessages([]);
    setStatus("signed-out");
  }, [userId]);

  const persistVault = useCallback((patch: Partial<Vault>) => {
    setVault((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const addFriendAction = useCallback(
    async (nickname: string, friendCode: string) => {
      if (!vault) return { ok: false, error: "No vault loaded" };
      const config = tierConfig(vault.tier);
      if (config.maxFriends !== "unlimited" && friends.length >= config.maxFriends) {
        return {
          ok: false,
          error: `${config.label} is limited to ${config.maxFriends} friends. Upgrade to add more.`,
        };
      }
      if (!nickname.trim() || !friendCode.trim()) {
        return { ok: false, error: "Nickname and friend code are required." };
      }
      const result = await addConnection(friendCode.trim(), nickname.trim());
      if (!result.ok) return { ok: false, error: result.error ?? "Could not add connection." };
      const conns = await listConnections();
      setFriends(conns);
      return { ok: true };
    },
    [friends, vault],
  );

  const removeFriendAction = useCallback(async (id: string) => {
    const { error } = await removeConnection(id);
    if (error) {
      console.error("Could not remove connection:", error);
      return;
    }
    setFriends((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const sendEncodedAction = useCallback(
    async (connectionId: string, plainText: string) => {
      if (!vault) return { ok: false, error: "No vault loaded" };
      const config = tierConfig(vault.tier);
      if (
        config.maxMessagesPerDay !== "unlimited" &&
        messagesSentToday >= config.maxMessagesPerDay
      ) {
        return {
          ok: false,
          error: `${config.label} is limited to ${config.maxMessagesPerDay} messages a day. Upgrade for more.`,
        };
      }
      const friend = friends.find((f) => f.id === connectionId);
      if (!friend) return { ok: false, error: "Unknown connection." };

      const cipherText = encodeMessage(plainText, vault.friendCode, friend.friendCode);
      const { message, error } = await sendMessage(connectionId, vault.id, cipherText);
      if (error || !message) {
        return { ok: false, error: error ?? "Could not send message." };
      }
      setMessages((prev) => [message, ...prev]);
      setMessagesSentToday((n) => n + 1);
      return { ok: true, cipherText };
    },
    [friends, messagesSentToday, vault],
  );

  const decodeIncomingAction = useCallback(
    (connectionId: string, cipherText: string) => {
      if (!vault) return { ok: false, error: "No vault loaded" };
      const friend = friends.find((f) => f.id === connectionId);
      if (!friend) return { ok: false, error: "Unknown connection." };
      const plainText = decodeMessage(cipherText, vault.friendCode, friend.friendCode);
      return { ok: true, plainText };
    },
    [friends, vault],
  );

  const dismissMessageAction = useCallback(async (id: string) => {
    const { error } = await deleteMessage(id);
    if (error) {
      console.error("Could not destroy message:", error);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const setTierAction = useCallback(
    (tier: Tier) => {
      if (!vault || !userId) return;
      const currentSkin = getVaultSkin(vault.theme);
      const nextTheme = isSkinUnlockedForTier(currentSkin, tier) ? vault.theme : DEFAULT_SKIN_ID;
      persistVault({ tier, theme: nextTheme });
      updateProfile(userId, { tier, theme: nextTheme }).then(({ error }) => error && console.error(error));
    },
    [vault, userId, persistVault],
  );

  const setThemeAction = useCallback(
    (theme: string) => {
      if (!vault || !userId) return;
      const skin = getVaultSkin(theme);
      if (!isSkinUnlockedForTier(skin, vault.tier)) return;
      persistVault({ theme });
      updateProfile(userId, { theme }).then(({ error }) => error && console.error(error));
    },
    [vault, userId, persistVault],
  );

  const setBioEncodingEnabledAction = useCallback(
    (enabled: boolean) => {
      if (!vault || !userId) return;
      if (!tierConfig(vault.tier).bioEncoding) return;
      persistVault({ bioEncodingEnabled: enabled });
      updateProfile(userId, { bio_encoding_enabled: enabled }).then(({ error }) => error && console.error(error));
    },
    [vault, userId, persistVault],
  );

  const updateAliasAction = useCallback(
    (alias: string) => {
      if (!vault || !userId || !alias.trim()) return;
      persistVault({ alias: alias.trim() });
      updateProfile(userId, { alias: alias.trim() }).then(({ error }) => error && console.error(error));
    },
    [vault, userId, persistVault],
  );

  const messagesRemaining = useMemo<number | "unlimited">(() => {
    if (!vault) return 0;
    const config = tierConfig(vault.tier);
    if (config.maxMessagesPerDay === "unlimited") return "unlimited";
    return Math.max(0, config.maxMessagesPerDay - messagesSentToday);
  }, [vault, messagesSentToday]);

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
    signUp: signUpAction,
    logIn: logInAction,
    verifyPin: verifyPinAction,
    changePin: changePinAction,
    biometricUnlock: biometricUnlockAction,
    completeUnlock,
    lock,
    logOut: logOutAction,
    resetVault: resetVaultAction,
    addFriend: addFriendAction,
    removeFriend: removeFriendAction,
    sendEncoded: sendEncodedAction,
    decodeIncoming: decodeIncomingAction,
    dismissMessage: dismissMessageAction,
    setTier: setTierAction,
    setTheme: setThemeAction,
    setBioEncodingEnabled: setBioEncodingEnabledAction,
    updateAlias: updateAliasAction,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
