const CODE_WORDS = [
  "RAVEN",
  "FALCON",
  "VIPER",
  "GHOST",
  "SHADOW",
  "COBRA",
  "PHANTOM",
  "WOLF",
  "HAWK",
  "CIPHER",
  "ONYX",
  "NOMAD",
  "ECHO",
  "TALON",
  "SABLE",
  "DRIFTER",
];

export function generateFriendCode(): string {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${number}`;
}

// Real end-to-end encryption: AES-256-GCM with a key derived (PBKDF2-SHA256,
// 200k iterations) from both friends' codes. A fixed app-wide salt means
// both sides derive the identical key from the same code pair with nothing
// new to store or exchange. Everything runs through the browser's native
// Web Crypto API - no plaintext or keys ever leave the device.

const PBKDF2_ITERATIONS = 200_000;
const APP_SALT = "DeadDrop-Vault-Cipher-Salt-v1";
const IV_BYTES = 12;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTER_BASE = BigInt(26);
const BYTE_BASE = BigInt(256);

const keyCache = new Map<string, Promise<CryptoKey>>();

function pairKey(codeA: string, codeB: string): string {
  return [codeA.trim().toUpperCase(), codeB.trim().toUpperCase()].sort().join("|");
}

function deriveAesKey(codeA: string, codeB: string): Promise<CryptoKey> {
  const pair = pairKey(codeA, codeB);
  const cached = keyCache.get(pair);
  if (cached) return cached;

  const promise = (async () => {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(pair),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(APP_SALT),
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  })();

  keyCache.set(pair, promise);
  return promise;
}

// Letters-only (base-26) codec for arbitrary bytes - visually matches the
// app's uppercase cipher-text style with no digits or padding characters.
// Leading zero bytes are tracked separately (as leading "A"s) since base
// conversion alone can't distinguish them from a shorter value.
function bytesToLetters(bytes: Uint8Array): string {
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros++;

  let num = BigInt(0);
  for (const byte of bytes) num = num * BYTE_BASE + BigInt(byte);

  let digits = "";
  while (num > BigInt(0)) {
    digits = LETTERS[Number(num % LETTER_BASE)] + digits;
    num = num / LETTER_BASE;
  }

  return LETTERS[0].repeat(leadingZeros) + digits;
}

function lettersToBytes(letters: string): Uint8Array {
  if (!letters) return new Uint8Array(0);

  let leadingZeros = 0;
  while (leadingZeros < letters.length && letters[leadingZeros] === LETTERS[0]) leadingZeros++;

  let num = BigInt(0);
  for (const ch of letters) {
    const value = LETTERS.indexOf(ch);
    if (value === -1) throw new Error("Invalid character in cipher text");
    num = num * LETTER_BASE + BigInt(value);
  }

  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.unshift(Number(num % BYTE_BASE));
    num = num / BYTE_BASE;
  }

  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);
}

export async function encodeMessage(
  plainText: string,
  myFriendCode: string,
  theirFriendCode: string,
): Promise<string> {
  const key = await deriveAesKey(myFriendCode, theirFriendCode);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plainBytes = new TextEncoder().encode(plainText);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);

  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return bytesToLetters(combined);
}

export async function decodeMessage(
  cipherText: string,
  myFriendCode: string,
  theirFriendCode: string,
): Promise<string> {
  const key = await deriveAesKey(myFriendCode, theirFriendCode);
  const combined = lettersToBytes(cipherText.toUpperCase().replace(/[^A-Z]/g, ""));
  if (combined.length <= IV_BYTES) throw new Error("Cipher text too short");

  const iv = combined.slice(0, IV_BYTES);
  const data = combined.slice(IV_BYTES);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

export function formatAsTransmission(cipherText: string): string {
  const lettersOnly = cipherText.toUpperCase().replace(/[^A-Z]/g, "");
  const blocks: string[] = [];
  for (let i = 0; i < lettersOnly.length; i += 4) {
    blocks.push(lettersOnly.slice(i, i + 4));
  }
  const rows: string[] = [];
  for (let i = 0; i < blocks.length; i += 4) {
    rows.push(blocks.slice(i, i + 4).join(" "));
  }
  return rows.join("\n");
}
