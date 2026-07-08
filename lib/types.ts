export type Tier = "free" | "agent" | "secret";

export interface Friend {
  id: string;
  nickname: string;
  friendCode: string;
  createdAt: number;
}

export interface Vault {
  alias: string;
  tier: Tier;
  theme: string;
  friendCode: string;
  cipherType: "affine" | "cascade";
  bioEncodingEnabled: boolean;
  createdAt: number;
}

export interface DecodedMessage {
  id: string;
  friendId: string;
  direction: "sent" | "received";
  plainText: string;
  cipherText: string;
  createdAt: number;
  read: boolean;
}

export interface DailyUsage {
  date: string;
  count: number;
}
