import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, tierForPriceId } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string,
  metadataUserId: string | undefined,
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = await resolveUserId(admin, customerId, subscription.metadata?.supabase_user_id);
  if (!userId) {
    console.error("Stripe webhook: could not resolve user for customer", customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const tier = isActive && priceId ? (tierForPriceId(priceId) ?? "free") : "free";

  await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      tier,
    })
    .eq("id", userId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.subscription === "string") {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handling error:", err);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
