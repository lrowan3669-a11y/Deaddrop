// Client-side check that blocks a message from ever being encoded/sent if it
// matches known CSAM/child-exploitation terms. This runs before encryption,
// which is the only point in DeadDrop's architecture where the app ever sees
// plaintext - once a message is encoded, the server only ever stores
// ciphertext, so nothing past this point can be scanned or un-sent.
//
// This is a best-effort deterrent against casual misuse, not a guarantee: it
// only matches this fixed English term list, and determined evasion can
// still get past pattern matching. It is not a substitute for reporting
// genuine abuse to the relevant authority (e.g. the IWF/NCA in the UK,
// NCMEC in the US).

const BANNED_TERMS = [
  "cp",
  "csam",
  "child porn",
  "child pornography",
  "grooming",
  "groom",
  "minor sex",
  "underage sex",
  "underage",
  "preteens",
  "preteen",
  "lolicon",
  "pedo",
  "paedo",
  "pedophile",
  "paedophile",
  "molest",
  "molestation",
  "sexual child",
];

// Maps common leetspeak substitutions back to their letter equivalents so
// e.g. "p3d0" is checked as "pedo".
const LEETSPEAK_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  "$": "s",
  "!": "i",
};

const COMBINING_DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeForMatching(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_PATTERN, "")
    .split("")
    .map((ch) => LEETSPEAK_MAP[ch] ?? ch)
    .join("");
}

function escapeRegexChar(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Builds a pattern that still matches a term even if junk characters
// (punctuation, spaces, symbols) are inserted between its letters - e.g.
// "c.p.", "c-p", "p e d o" - while keeping whole-word/phrase boundaries so it
// doesn't fire on unrelated words that merely contain the same letters
// (e.g. "groomsman" doesn't match "groom").
function buildTermPattern(term: string): RegExp {
  const letters = term.toLowerCase().replace(/[^a-z]/g, "").split("");
  const withGaps = letters.map(escapeRegexChar).join("[^a-z]*");
  return new RegExp(`\\b${withGaps}\\b`);
}

const TERM_PATTERNS = BANNED_TERMS.map(buildTermPattern);

export function containsBannedContent(text: string): boolean {
  const normalized = normalizeForMatching(text);
  return TERM_PATTERNS.some((pattern) => pattern.test(normalized));
}
