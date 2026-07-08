import { generateFriendCode } from "./cipher";
import type { DailyUsage, DecodedMessage, Friend, Vault } from "./types";

const KEYS = {
  vault: "deaddrop_vault",
  friends: "deaddrop_friends",
  messages: "deaddrop_messages",
  usage: "deaddrop_usage",
} as const;

export const TEST_ACCOUNT_ALIAS = "Agent Zero";
export const TEST_ACCOUNT_PASSWORD = "0000";

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string): T | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

export function getVault(): Vault | null {
  return read<Vault>(KEYS.vault);
}

export function saveVault(vault: Vault): void {
  write(KEYS.vault, vault);
}

export function clearAllData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEYS.vault);
  window.localStorage.removeItem(KEYS.friends);
  window.localStorage.removeItem(KEYS.messages);
  window.localStorage.removeItem(KEYS.usage);
}

export function getFriends(): Friend[] {
  return read<Friend[]>(KEYS.friends) ?? [];
}

export function saveFriends(friends: Friend[]): void {
  write(KEYS.friends, friends);
}

export function getMessages(): DecodedMessage[] {
  return read<DecodedMessage[]>(KEYS.messages) ?? [];
}

export function saveMessages(messages: DecodedMessage[]): void {
  write(KEYS.messages, messages);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyUsage(): DailyUsage {
  const usage = read<DailyUsage>(KEYS.usage);
  if (!usage || usage.date !== todayKey()) {
    const fresh: DailyUsage = { date: todayKey(), count: 0 };
    write(KEYS.usage, fresh);
    return fresh;
  }
  return usage;
}

export function incrementDailyUsage(): DailyUsage {
  const current = getDailyUsage();
  const next: DailyUsage = { date: current.date, count: current.count + 1 };
  write(KEYS.usage, next);
  return next;
}

export async function seedTestAccount(): Promise<Vault> {
  const vault: Vault = {
    alias: TEST_ACCOUNT_ALIAS,
    passwordHash: await hashPassword(TEST_ACCOUNT_PASSWORD),
    tier: "secret",
    theme: "classified",
    friendCode: generateFriendCode(),
    cipherType: "affine",
    bioEncodingEnabled: false,
    createdAt: Date.now(),
  };
  saveVault(vault);

  const demoFriends: Friend[] = [
    {
      id: crypto.randomUUID(),
      nickname: "The Analyst",
      friendCode: generateFriendCode(),
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      nickname: "Night Owl",
      friendCode: generateFriendCode(),
      createdAt: Date.now(),
    },
  ];
  saveFriends(demoFriends);
  saveMessages([]);
  write(KEYS.usage, { date: todayKey(), count: 0 });

  return vault;
}
