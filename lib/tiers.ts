import type { Tier } from "./types";

export interface TierConfig {
  id: Tier;
  label: string;
  priceLabel: string;
  maxFriends: number | "unlimited";
  maxMessagesPerDay: number | "unlimited";
  cipherTypes: Array<"affine" | "cascade">;
  futureChat: boolean;
  bioEncoding: boolean;
  features: string[];
}

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    id: "free",
    label: "Free Agent",
    priceLabel: "Free",
    maxFriends: 3,
    maxMessagesPerDay: 5,
    cipherTypes: ["affine"],
    futureChat: false,
    bioEncoding: false,
    features: ["Up to 3 friends", "5 messages a day", "Basic vault theme"],
  },
  agent: {
    id: "agent",
    label: "Agent",
    priceLabel: "£1.99 / month",
    maxFriends: "unlimited",
    maxMessagesPerDay: 30,
    cipherTypes: ["affine"],
    futureChat: false,
    bioEncoding: false,
    features: [
      "Unlimited friends",
      "30 messages a day",
      "Custom vault theme",
    ],
  },
  secret: {
    id: "secret",
    label: "Secret Agent",
    priceLabel: "£5.99 / month",
    maxFriends: "unlimited",
    maxMessagesPerDay: "unlimited",
    cipherTypes: ["affine", "cascade"],
    futureChat: true,
    bioEncoding: true,
    features: [
      "All Agent features",
      "Unlimited messages",
      "Multiple vault designs",
      "Military-grade themes",
      "Future chat feature",
      "Premium cipher functions",
      "Bio encoding (thumbprint)",
    ],
  },
};

export const TIER_ORDER: Tier[] = ["free", "agent", "secret"];

export function tierConfig(tier: Tier): TierConfig {
  return TIERS[tier];
}
