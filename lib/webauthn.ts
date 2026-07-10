// On-device biometric app-lock via the WebAuthn API. This is a convenience
// gate, not a server-verified credential: registration and verification both
// happen entirely in the browser, and the resulting credential id is stored
// only in this device's localStorage. The vault PIN (verified server-side in
// supabase/schema.sql) remains the real security boundary — this just adds
// friction so someone holding an already-logged-in phone can't casually open
// the vault without the fingerprint/Face ID this device already trusts.

const RP_NAME = "DeadDrop";

function storageKey(userId: string): string {
  return `deaddrop:webauthn:${userId}`;
}

function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "NotAllowedError") {
      return "Biometric check was cancelled or timed out.";
    }
    return err.message;
  }
  return "Biometric check failed.";
}

export function isBiometricSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasLocalBiometricCredential(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(storageKey(userId)));
}

export function clearLocalBiometricCredential(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(userId));
}

export async function registerBiometric(
  userId: string,
  alias: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isPlatformAuthenticatorAvailable())) {
    return {
      ok: false,
      error: "No Face ID, Touch ID, Windows Hello, or fingerprint sensor detected on this device.",
    };
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: RP_NAME },
        user: {
          id: new TextEncoder().encode(userId),
          name: alias,
          displayName: alias,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    if (!credential) return { ok: false, error: "Biometric registration was cancelled." };

    localStorage.setItem(storageKey(userId), (credential as PublicKeyCredential).id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toErrorMessage(err) };
  }
}

export async function verifyBiometric(userId: string): Promise<{ ok: boolean; error?: string }> {
  const credentialId = typeof window !== "undefined" ? localStorage.getItem(storageKey(userId)) : null;
  if (!credentialId) return { ok: false, error: "No biometric registered on this device." };

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: "public-key", id: base64UrlToBuffer(credentialId) }],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) return { ok: false, error: "Biometric check was cancelled." };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toErrorMessage(err) };
  }
}
