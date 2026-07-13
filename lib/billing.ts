import { supabase } from "@/lib/supabase/client";

async function authorizedPost(path: string, body?: unknown): Promise<{ url?: string; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Not signed in." };

  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "Something went wrong." };
    return { url: json.url };
  } catch {
    return { error: "Network error. Check your connection and try again." };
  }
}

export async function startCheckout(tier: "agent" | "secret"): Promise<{ url?: string; error?: string }> {
  return authorizedPost("/api/stripe/checkout", { tier });
}

export async function openBillingPortal(): Promise<{ url?: string; error?: string }> {
  return authorizedPost("/api/stripe/portal");
}
