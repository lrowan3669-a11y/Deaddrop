import type { Session } from "@supabase/supabase-js";
import { generateFriendCode } from "@/lib/cipher";
import type { Connection, Message, Tier, Vault } from "@/lib/types";
import { supabase } from "./client";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Network error. Check your connection and try again.";
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ userId: string | null; needsEmailConfirmation: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { userId: null, needsEmailConfirmation: false, error: error.message };
    return {
      userId: data.user?.id ?? null,
      needsEmailConfirmation: !data.session,
      error: null,
    };
  } catch (err) {
    return { userId: null, needsEmailConfirmation: false, error: toErrorMessage(err) };
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Best-effort: if this fails (e.g. offline), local state is cleared by
    // the caller regardless, so there's nothing more to do here.
  }
}

interface ProfileRow {
  id: string;
  alias: string;
  tier: Tier;
  theme: string;
  friend_code: string;
  cipher_type: "affine" | "cascade";
  bio_encoding_enabled: boolean;
  created_at: string;
}

function mapProfile(row: ProfileRow): Vault {
  return {
    id: row.id,
    alias: row.alias,
    tier: row.tier,
    theme: row.theme,
    friendCode: row.friend_code,
    cipherType: row.cipher_type,
    bioEncodingEnabled: row.bio_encoding_enabled,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function fetchProfile(userId: string): Promise<Vault | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, alias, tier, theme, friend_code, cipher_type, bio_encoding_enabled, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return mapProfile(data as ProfileRow);
  } catch {
    return null;
  }
}

export async function createProfile(
  userId: string,
  alias: string,
  agreedToTerms: boolean,
): Promise<{ profile: Vault | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        alias,
        friend_code: generateFriendCode(),
        terms_accepted_at: agreedToTerms ? new Date().toISOString() : null,
      })
      .select("id, alias, tier, theme, friend_code, cipher_type, bio_encoding_enabled, created_at")
      .single();
    if (error || !data) return { profile: null, error: error?.message ?? "Could not create profile" };
    return { profile: mapProfile(data as ProfileRow), error: null };
  } catch (err) {
    return { profile: null, error: toErrorMessage(err) };
  }
}

export async function updateProfile(
  userId: string,
  patch: Partial<{
    alias: string;
    tier: Tier;
    theme: string;
    bio_encoding_enabled: boolean;
  }>,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

export async function deleteProfile(userId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

export async function setPin(pin: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc("set_pin", { new_pin: pin });
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

export async function verifyPin(pin: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc("verify_pin", { pin });
    if (error) return { ok: false, error: error.message };
    return { ok: Boolean(data), error: null };
  } catch (err) {
    return { ok: false, error: toErrorMessage(err) };
  }
}

interface ConnectionRow {
  connection_id: string;
  counterpart_id: string;
  counterpart_alias: string;
  counterpart_friend_code: string;
  my_nickname: string | null;
  created_at: string;
}

function mapConnection(row: ConnectionRow): Connection {
  return {
    id: row.connection_id,
    nickname: row.my_nickname ?? row.counterpart_alias,
    counterpartAlias: row.counterpart_alias,
    friendCode: row.counterpart_friend_code,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function listConnections(): Promise<Connection[]> {
  try {
    const { data, error } = await supabase.rpc("list_connections");
    if (error || !data) return [];
    return (data as ConnectionRow[]).map(mapConnection);
  } catch {
    return [];
  }
}

export async function addConnection(
  theirFriendCode: string,
  myNickname: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc("add_connection", {
      their_friend_code: theirFriendCode,
      my_nickname: myNickname,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toErrorMessage(err) };
  }
}

export async function removeConnection(connectionId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("connections").delete().eq("id", connectionId);
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

interface MessageRow {
  id: string;
  connection_id: string;
  sender_id: string;
  cipher_text: string;
  created_at: string;
  read_at: string | null;
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    connectionId: row.connection_id,
    senderId: row.sender_id,
    cipherText: row.cipher_text,
    createdAt: new Date(row.created_at).getTime(),
    readAt: row.read_at ? new Date(row.read_at).getTime() : null,
  };
}

export async function listMessages(): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("id, connection_id, sender_id, cipher_text, created_at, read_at")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as MessageRow[]).map(mapMessage);
  } catch {
    return [];
  }
}

export async function sendMessage(
  connectionId: string,
  senderId: string,
  cipherText: string,
): Promise<{ message: Message | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({ connection_id: connectionId, sender_id: senderId, cipher_text: cipherText })
      .select("id, connection_id, sender_id, cipher_text, created_at, read_at")
      .single();
    if (error || !data) return { message: null, error: error?.message ?? "Could not send message" };
    return { message: mapMessage(data as MessageRow), error: null };
  } catch (err) {
    return { message: null, error: toErrorMessage(err) };
  }
}

export async function deleteMessage(messageId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}

export async function markMessageRead(messageId: string): Promise<void> {
  try {
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", messageId);
  } catch {
    // Best-effort read receipt - not critical if it fails.
  }
}

export async function countMessagesToday(userId: string): Promise<number> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .gte("created_at", startOfDay.toISOString());
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function logModerationFlag(userId: string): Promise<void> {
  try {
    await supabase.from("moderation_flags").insert({ user_id: userId });
  } catch {
    // Best-effort abuse signal - not critical if it fails.
  }
}
