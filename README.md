# DeadDrop

A friendship-code encoder/decoder. Two people share a secret friend code,
DeadDrop derives a cipher from it, and messages are turned into unreadable
ciphertext before being pasted into whatever chat app you already use.

Real accounts, backed by Supabase (Postgres + Auth). No more `localStorage`
demo mode — you need a Supabase project to run this locally now.

## Setup

### 1. Create a Supabase project and run the schema

In your Supabase project's SQL Editor, paste and run the entire contents of
[`supabase/schema.sql`](supabase/schema.sql). It's idempotent - safe to
re-run if you change it later.

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
your Supabase project's **Settings -> API** page. These are safe to expose
client-side (that's what the anon key is for) - just don't commit
`.env.local` (it's gitignored already).

> **Email confirmation**: by default Supabase requires users to confirm
> their email before they get a session. For faster beta testing, you can
> turn this off in **Authentication -> Providers -> Email -> Confirm
> email**. If you leave it on, sign-up shows a "check your email" message
> and the account isn't usable until the user clicks the confirmation link.

### 3. Set up Stripe (subscriptions)

Tiers are billed via Stripe Checkout + Customer Portal, synced back to
Supabase by a webhook - card details never touch this app's own code.

1. In the [Stripe dashboard](https://dashboard.stripe.com), make sure
   **Test mode** is on (top right) while you build - you'll switch to live
   keys later, same setup, just different keys.
2. **Product catalog -> Add product** - create "DeadDrop Agent" with a
   recurring price of £1.99/month, and a second product "DeadDrop Secret
   Agent" at £5.99/month. Open each product and copy its **Price ID**
   (starts with `price_...`).
3. **Developers -> API keys** - copy the **Secret key** (`sk_test_...`).
   You don't need the publishable key; DeadDrop redirects to Stripe's
   hosted Checkout/Portal pages instead of using Stripe.js directly.
4. **Settings -> Billing -> Customer portal** - enable the portal, and
   under "Products" add both prices so customers can switch between Agent
   and Secret Agent from the portal (not just cancel).
5. Fill in `.env.local` (see below) with the secret key and both price
   IDs, and set `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's
   **Settings -> API** page (the `service_role` secret - server-only,
   never expose this to the browser).
6. **After you've deployed** (the webhook needs a real HTTPS URL - it
   won't work against localhost): **Developers -> Webhooks -> Add
   endpoint**, URL = `https://<your-domain>/api/stripe/webhook`, and
   subscribe to `checkout.session.completed`,
   `customer.subscription.updated`, and `customer.subscription.deleted`.
   Copy the endpoint's **Signing secret** (`whsec_...`) into
   `STRIPE_WEBHOOK_SECRET` (in Vercel's env vars, then redeploy).

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- **Accounts** — real email/password sign-up via Supabase Auth. Each user
  gets a `profiles` row (alias, tier, theme, friend code) created right
  after sign-up.
- **Vault PIN** — at sign-up you also choose a 4-6 digit PIN. That's what
  you enter into the vault door on every visit (`components/VaultUnlock.tsx`)
  to unlock the app - your email/password session persists in the browser,
  so you don't need to log in again each time, but the PIN gate still
  applies every visit. The PIN is verified server-side (`verify_pin` in
  `supabase/schema.sql`, bcrypt via pgcrypto) - the hash never reaches the
  client, and 5 wrong attempts locks it for 5 minutes. Forgot your PIN?
  Since you're still logged in, "Forgot PIN?" on the lock screen lets you
  set a new one immediately.
- **Friend code** — a shareable code like `RAVEN-4821`, generated once per
  account. Two people each add the other by code (`add_connection` RPC),
  which creates or reuses a single **mutual** `connections` row between
  them - not two one-sided records - so both sides derive the exact same
  cipher key (`lib/cipher.ts`) regardless of who added whom.
- **Encode/Decode** — write a message, encode it, and it's inserted as a
  real row in the `messages` table, visible to both participants. Only
  ciphertext is ever stored server-side - plaintext is decoded client-side
  on demand, so a database read never exposes message contents. **Copy**
  or **Share to App** (native OS share sheet on mobile - WhatsApp,
  Messages, etc, where supported) sends the ciphertext into any external
  messaging app; the **Decode** box handles ciphertext that arrives back
  through those external channels (or via the PWA share-target, below).
- **Destroying a message** deletes that single shared row outright - a
  real destroy-for-both, not a local approximation. Either participant can
  do it.
- **Invite via Contacts** (Connections tab) — uses the Contact Picker API
  (`navigator.contacts`, Android Chrome only) to grab a name/number, then
  sends an invite with your friend code via the Web Share API, falling
  back to an `sms:` link or clipboard copy where unsupported.
- **Disguised identity** — the browser tab title, favicon, and installed
  home-screen icon are a deliberately boring cover ("Notes", a plain grey
  sign-on-a-pole icon in `app/icon.svg`/`app/apple-icon.png`) so the app
  doesn't announce itself. If installed as a PWA on Android, DeadDrop also
  registers as a **share target** (`app/manifest.ts` + `app/shared/page.tsx`)
  - selecting text in another app and sharing it lands directly in the
  Decode box. This is the closest thing achievable from a web app; a true
  entry inside another app's own long-press Copy/Select-All menu needs a
  native iOS/Android app, out of scope for a Vercel-deployed site.
- **Vault themes** (`lib/theme-presets.ts`) — real colour/style presets
  applied live via CSS variables, gated by tier: Free Agent gets the default
  Classified digital-green look (matching the DeadDrop logo), Agent unlocks
  custom colour palettes (Sapphire, Emerald, Crimson), Secret Agent
  additionally unlocks military-grade designs (Desert Ops, Night Ops, Onyx
  Steel).
- **Bio encoding** (Secret Agent tier) — registers a real WebAuthn platform
  credential (Face ID/Touch ID/Windows Hello/fingerprint) via
  `lib/webauthn.ts`. The credential id lives only in this device's
  localStorage and is never sent to the server, so it's a per-device
  presence gate layered on top of the vault PIN (the actual, server-verified
  security boundary) rather than a server-verified passkey - enable it
  again on each new device/browser. A successful biometric check on the
  lock screen skips typing the PIN; typing it is always available as a
  fallback.
- **Tiers** — enforced via the real message/connection counts
  (`lib/tiers.ts`), and now driven entirely by a real Stripe subscription
  (there's no free manual switch anymore):
  - **Free Agent** — up to 3 friends, 5 messages/day, basic vault theme.
  - **Agent** (£1.99/mo) — unlimited friends, 30 messages/day, custom vault
    themes.
  - **Secret Agent** (£5.99/mo) — unlimited everything, multiple vault
    designs, military-grade themes, premium cipher functions, bio
    encoding (thumbprint), and the future chat feature flag.

  "Upgrade" in Settings redirects to a Stripe Checkout session
  (`app/api/stripe/checkout`); once subscribed, "Manage Subscription"
  redirects to the Stripe Customer Portal (`app/api/stripe/portal`) for
  switching plans, updating payment details, or cancelling. A webhook
  (`app/api/stripe/webhook`) is the only thing that ever changes
  `profiles.tier` - it verifies Stripe's signature, then writes the tier
  and subscription status via a service-role Supabase client (the only
  place in the app that uses that key, since Stripe calls this endpoint
  directly with no user session to authenticate as).
- **Content safety** — outgoing messages are checked against a banned-term
  list (`lib/content-safety.ts`, CSAM/child-exploitation terms) before
  they're ever encrypted or sent; matches are blocked with a themed error
  and logged as a metadata-only flag (`moderation_flags` table - who and
  when, never the message) so repeat abuse is visible from the Supabase
  dashboard. Sign-up requires accepting an Acceptable Use acknowledgement
  (`profiles.terms_accepted_at`).

## Known gaps

- **"Delete Vault"** removes your profile, connections, and messages
  (cascading deletes), but not the underlying Supabase Auth account itself
  - that needs a service-role server call (a Next.js API route with the
  service role key), which isn't built yet. You can still sign up again
  with the same email after deleting your vault, but you'd need to also
  manually remove the auth user from the Supabase dashboard first.
- No Realtime subscription yet - the message list refetches on unlock and
  after actions, but two people both looking at an open conversation won't
  see each other's messages appear live without navigating away and back.

## Project layout

- `lib/cipher.ts` — friend-code-derived AES-256-GCM encryption (real
  end-to-end encryption via the Web Crypto API, not a toy substitution
  cipher), formatted as an uppercase letters-only "cipher text".
- `lib/content-safety.ts` — client-side banned-term filter, checked before
  a message is ever encoded/sent.
- `lib/tiers.ts` — tier limits and feature flags.
- `lib/theme-presets.ts` — vault colour/style presets and tier gating.
- `lib/pending-share.ts` — bridges the PWA share-target route to the Decode box.
- `lib/webauthn.ts` — on-device biometric registration/verification (WebAuthn).
- `lib/billing.ts` — client-side helpers that call the Stripe API routes
  with the user's Supabase access token.
- `lib/stripe/server.ts` — server-only Stripe SDK client + tier/price ID mapping.
- `lib/supabase/client.ts` — browser Supabase client singleton (reads env vars).
- `lib/supabase/server.ts` — server-only Supabase clients: one that
  forwards the caller's own access token (RLS-scoped, used by the
  checkout/portal routes), and an admin client using the service role key
  (used only by the webhook, which has no user session).
- `lib/supabase/queries.ts` — all Supabase reads/writes/RPC calls, with
  every function normalizing network failures into `{ error }`/`{ ok }`
  shapes instead of throwing.
- `context/VaultContext.tsx` — app-wide auth/session/vault state and actions.
- `components/` — screens: sign-up/login + PIN gate, the vault door
  animation, friend exchange (+ contacts invite), the encode/decode
  workspace, and settings.
- `app/api/stripe/checkout/route.ts` — creates a Stripe Checkout session
  for a chosen paid tier.
- `app/api/stripe/portal/route.ts` — creates a Stripe Customer Portal
  session for the caller's existing subscription.
- `app/api/stripe/webhook/route.ts` — verifies Stripe's signature and
  syncs `profiles.tier`/subscription fields on checkout/subscription events.
- `app/manifest.ts` / `app/icon.svg` / `app/apple-icon.png` — disguised
  cover identity + PWA share-target registration.
- `app/shared/page.tsx` — receives shared text from the OS share sheet and
  hands it to the Decode box.
- `supabase/schema.sql` — the full Postgres schema: `profiles` (incl.
  Stripe/subscription fields), `connections` (mutual pairs), `messages`
  (ciphertext-only, shared rows), `moderation_flags` (metadata-only abuse
  signal), RLS policies, and the
  `add_connection`/`list_connections`/`set_pin`/`verify_pin` RPCs.

## Roadmap

Realtime message sync, encrypted live chat, QR dead drops, temporary
friend codes, image/file encoding, and full account deletion.
