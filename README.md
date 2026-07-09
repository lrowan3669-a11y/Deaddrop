# DeadDrop

A friendship-code encoder/decoder. Two people share a secret friend code,
DeadDrop derives a cipher from it, and messages are turned into unreadable
ciphertext before being pasted into whatever chat app you already use.

This is the local beta build — everything runs client-side against
`localStorage`. There is no backend yet; Supabase + Vercel deployment come
later once the core flow is solid.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load you can
either create a new vault (just pick an alias) or click **Load Test Account
(Beta)** to jump straight into a seeded account with demo connections
already in place. Either path plays the vault door unlock animation before
dropping you into the encode/decode workspace.

> Password protection is intentionally switched off for this beta (it'll
> come back later) — opening or re-opening a vault is just one click.

## How it works

- **Vault** — a local profile (alias, tier, theme, friend code) stored in
  `localStorage`. Opening it (creating a vault, re-opening a locked one, or
  loading the test account) plays a vault-door animation
  (`components/VaultDoorAnimation.tsx`) before granting access.
- **Friend code** — a shareable code like `RAVEN-4821`. Both sides enter the
  same code, and DeadDrop deterministically derives an affine cipher
  (`lib/cipher.ts`) from it — no server round-trip needed.
- **Encode/Decode** — write a message, encode it with the selected
  connection's cipher, then **Copy** or **Share to App** (native OS share
  sheet on mobile — WhatsApp, Messages, etc, where supported; falls back to
  copy otherwise) it into any messaging app. The recipient pastes it back
  into DeadDrop and decodes it locally.
- **Disguised identity** — the browser tab title, favicon, and installed
  home-screen icon are a deliberately boring cover ("Notes", a plain grey
  sign-on-a-pole icon in `app/icon.svg`/`app/apple-icon.png`) so the app
  doesn't announce itself. If installed as a PWA on Android, DeadDrop also
  registers as a **share target** (`app/manifest.ts` + `app/shared/page.tsx`)
  - selecting text in another app and sharing it lands directly in the
  Decode box. This is the closest thing achievable from a web app; a true
  entry inside another app's own long-press Copy/Select-All menu needs a
  native iOS/Android app, which is out of scope for a Vercel-deployed site.
- **Destroying a message** removes both the sent and received copy of it
  from the conversation history it's found in — see the caveat below.
- **Vault themes** (`lib/theme-presets.ts`) — real colour/style presets
  applied live via CSS variables, gated by tier: Free Agent gets the default
  Classified digital-green look (matching the DeadDrop logo), Agent unlocks
  custom colour palettes (Sapphire, Emerald, Crimson), Secret Agent
  additionally unlocks military-grade designs (Desert Ops, Night Ops, Onyx
  Steel).
- **Tiers** — enforced client-side for now (`lib/tiers.ts`), switchable
  from Settings for beta testing:
  - **Free Agent** — up to 3 friends, 5 messages/day, basic vault theme.
  - **Agent** (£1.99/mo) — unlimited friends, 30 messages/day, custom vault
    themes.
  - **Secret Agent** (£5.99/mo) — unlimited everything, multiple vault
    designs, military-grade themes, premium cipher functions, bio
    encoding (thumbprint), and the future chat feature flag.

> **Caveat:** there's no backend yet, so "destroy for both sides" only
> works within a single vault's own local history (e.g. testing by encoding
> then decoding your own message). Two people on two separate
> devices/browsers don't share storage, so a real cross-device destroy will
> need Supabase (or similar) to sync deletions between accounts.

## Project layout

- `lib/cipher.ts` — friend-code-derived affine cipher (encode/decode).
- `lib/tiers.ts` — tier limits and feature flags.
- `lib/theme-presets.ts` — vault colour/style presets and tier gating.
- `lib/storage.ts` — localStorage persistence + test account seed.
- `lib/vault-store.ts` — external store powering the vault session
  (read via `useSyncExternalStore`).
- `context/VaultContext.tsx` — app-wide vault state and actions.
- `components/` — screens: vault unlock/create, the vault door animation,
  friend exchange, the encode/decode workspace, and settings.
- `app/manifest.ts` / `app/icon.svg` / `app/apple-icon.png` — disguised
  cover identity + PWA share-target registration.
- `app/shared/page.tsx` — receives shared text from the OS share sheet and
  hands it to the Decode box.
- `supabase/schema.sql` — Postgres schema for the eventual Supabase backend
  (not yet wired into the app - see below).

## Roadmap

Encrypted live chat, QR dead drops, temporary friend codes, image/file
encoding, and Supabase-backed accounts for a real Vercel deployment.
