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
either create a new vault (alias + password) or click **Load Test Account
(Beta)** to jump straight into a seeded account (password `deaddrop`) with
demo connections already in place.

## How it works

- **Vault** — a local password-protected profile (alias, tier, theme,
  friend code). Stored hashed in `localStorage`.
- **Friend code** — a shareable code like `RAVEN-4821`. Both sides enter the
  same code, and DeadDrop deterministically derives an affine cipher
  (`lib/cipher.ts`) from it — no server round-trip needed.
- **Encode/Decode** — write a message, encode it with the selected
  connection's cipher, copy the result into any messaging app. The
  recipient pastes it back into DeadDrop and decodes it locally.
- **Tiers** — enforced client-side for now (`lib/tiers.ts`), switchable
  from Settings for beta testing:
  - **Free Agent** — up to 3 friends, 5 messages/day, basic vault theme.
  - **Agent** (£1.99/mo) — unlimited friends, 30 messages/day, custom vault
    theme.
  - **Secret Agent** (£5.99/mo) — unlimited everything, multiple vault
    designs, military-grade themes, premium cipher functions, bio
    encoding (thumbprint), and the future chat feature flag.

## Project layout

- `lib/cipher.ts` — friend-code-derived affine cipher (encode/decode).
- `lib/tiers.ts` — tier limits and feature flags.
- `lib/storage.ts` — localStorage persistence + test account seed.
- `lib/vault-store.ts` — external store powering the vault session
  (read via `useSyncExternalStore`).
- `context/VaultContext.tsx` — app-wide vault state and actions.
- `components/` — screens: vault unlock/create, friend exchange, the
  encode/decode workspace, and settings.

## Roadmap

Encrypted live chat, QR dead drops, temporary friend codes, image/file
encoding, and Supabase-backed accounts for a real Vercel deployment.
