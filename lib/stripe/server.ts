import "server-only";
import Stripe from "stripe";
import type { Tier } from "@/lib/types";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export type PaidTier = Extract<Tier, "agent" | "secret">;

const PRICE_ENV_VARS: Record<PaidTier, string> = {
  agent: "STRIPE_PRICE_AGENT",
  secret: "STRIPE_PRICE_SECRET",
};

export function priceIdForTier(tier: PaidTier): string {
  const envVar = PRICE_ENV_VARS[tier];
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(`${envVar} is not set.`);
  }
  return priceId;
}

export function tierForPriceId(priceId: string): PaidTier | null {
  if (priceId === process.env.STRIPE_PRICE_AGENT) return "agent";
  if (priceId === process.env.STRIPE_PRICE_SECRET) return "secret";
  return null;
}

export function isPaidTier(tier: string): tier is PaidTier {
  return tier === "agent" || tier === "secret";
}
