import { getDailyUsage, getFriends, getMessages, getVault } from "./storage";
import type { DailyUsage, DecodedMessage, Friend, Vault } from "./types";

export type Status = "loading" | "no-vault" | "locked" | "unlocked";

export interface Session {
  status: Status;
  vault: Vault | null;
  friends: Friend[];
  messages: DecodedMessage[];
  dailyUsage: DailyUsage;
}

export const EMPTY_USAGE: DailyUsage = { date: "", count: 0 };

const SERVER_SNAPSHOT: Session = {
  status: "loading",
  vault: null,
  friends: [],
  messages: [],
  dailyUsage: EMPTY_USAGE,
};

let session: Session = SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

function loadFromDisk(): Session {
  const existing = getVault();
  return existing
    ? {
        status: "locked",
        vault: existing,
        friends: getFriends(),
        messages: getMessages(),
        dailyUsage: getDailyUsage(),
      }
    : { status: "no-vault", vault: null, friends: [], messages: [], dailyUsage: EMPTY_USAGE };
}

export function subscribe(listener: () => void): () => void {
  if (!initialized) {
    initialized = true;
    session = loadFromDisk();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Session {
  if (!initialized) {
    initialized = true;
    session = loadFromDisk();
  }
  return session;
}

export function getServerSnapshot(): Session {
  return SERVER_SNAPSHOT;
}

export function setSession(next: Session): void {
  session = next;
  listeners.forEach((listener) => listener());
}

export function updateSession(updater: (current: Session) => Session): void {
  session = updater(session);
  listeners.forEach((listener) => listener());
}
