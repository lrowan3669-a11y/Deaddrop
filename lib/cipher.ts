const ALPHABET_SIZE = 26;
const VALID_MULTIPLIERS = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

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

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function modInverse(a: number, m: number): number {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x;
  }
  return 1;
}

export interface CipherKey {
  a: number;
  b: number;
}

export function deriveKeyFromFriendCode(friendCode: string): CipherKey {
  const normalized = friendCode.trim().toUpperCase();
  const hash = hashString(normalized);
  const a = VALID_MULTIPLIERS[hash % VALID_MULTIPLIERS.length];
  const b = Math.floor(hash / VALID_MULTIPLIERS.length) % ALPHABET_SIZE;
  return { a, b };
}

export function generateFriendCode(): string {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${number}`;
}

function shiftChar(
  char: string,
  key: CipherKey,
  direction: "encode" | "decode",
): string {
  const code = char.charCodeAt(0);
  const isUpper = code >= 65 && code <= 90;
  const isLower = code >= 97 && code <= 122;
  if (!isUpper && !isLower) return char;

  const base = isUpper ? 65 : 97;
  const x = code - base;
  let y: number;

  if (direction === "encode") {
    y = (key.a * x + key.b) % ALPHABET_SIZE;
  } else {
    const aInverse = modInverse(key.a, ALPHABET_SIZE);
    y = (aInverse * (x - key.b + ALPHABET_SIZE * ALPHABET_SIZE)) % ALPHABET_SIZE;
  }

  return String.fromCharCode(base + y);
}

export function encodeMessage(plainText: string, friendCode: string): string {
  const key = deriveKeyFromFriendCode(friendCode);
  return plainText
    .split("")
    .map((char) => shiftChar(char, key, "encode"))
    .join("");
}

export function decodeMessage(cipherText: string, friendCode: string): string {
  const key = deriveKeyFromFriendCode(friendCode);
  return cipherText
    .split("")
    .map((char) => shiftChar(char, key, "decode"))
    .join("");
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
