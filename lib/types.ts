export type Tier = "free" | "agent" | "secret";

export interface Vault {
  id: string;
  alias: string;
  tier: Tier;
  theme: string;
  friendCode: string;
  cipherType: "affine" | "cascade";
  bioEncodingEnabled: boolean;
  createdAt: number;
}

export interface Connection {
  id: string;
  nickname: string;
  counterpartAlias: string;
  friendCode: string;
  createdAt: number;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  cipherText: string;
  createdAt: number;
  readAt: number | null;
}
