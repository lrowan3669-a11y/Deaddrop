const PENDING_DECODE_KEY = "deaddrop_pending_decode";

export function setPendingSharedText(text: string): void {
  window.localStorage.setItem(PENDING_DECODE_KEY, text);
}

export function takePendingSharedText(): string {
  if (typeof window === "undefined") return "";
  const pending = window.localStorage.getItem(PENDING_DECODE_KEY);
  if (pending) window.localStorage.removeItem(PENDING_DECODE_KEY);
  return pending ?? "";
}
