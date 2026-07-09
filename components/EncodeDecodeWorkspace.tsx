"use client";

import { useMemo, useState } from "react";
import { useVault } from "@/context/VaultContext";
import { formatAsTransmission } from "@/lib/cipher";
import { takePendingSharedText } from "@/lib/pending-share";
import { tierConfig } from "@/lib/tiers";
import { TerminalButton, TerminalFrame, TerminalTextarea } from "./Terminal";
import { Badge, Panel } from "./ui";

export function EncodeDecodeWorkspace() {
  const {
    vault,
    friends,
    messages,
    sendEncoded,
    decodeIncoming,
    dismissMessage,
    messagesRemaining,
  } = useVault();

  const [friendId, setFriendId] = useState(friends[0]?.id ?? "");
  const [plainText, setPlainText] = useState("");
  const [cipherOutput, setCipherOutput] = useState("");
  const [incomingCipher, setIncomingCipher] = useState(takePendingSharedText);
  const [decodedText, setDecodedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const config = vault ? tierConfig(vault.tier) : null;
  const activeFriend = friends.find((f) => f.id === friendId);

  const history = useMemo(
    () => messages.filter((m) => m.connectionId === friendId),
    [messages, friendId],
  );

  async function handleEncode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!friendId) {
      setError("Add a connection first.");
      return;
    }
    if (!plainText.trim()) return;
    setBusy(true);
    const result = await sendEncoded(friendId, plainText);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not encode message.");
      return;
    }
    setCipherOutput(result.cipherText ?? "");
    setPlainText("");
  }

  function handleDecode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!friendId) {
      setError("Select a connection first.");
      return;
    }
    if (!incomingCipher.trim()) return;
    const result = decodeIncoming(friendId, incomingCipher);
    if (!result.ok) {
      setError(result.error ?? "Could not decode message.");
      return;
    }
    setDecodedText(result.plainText ?? "");
    setIncomingCipher("");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(cipherOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    if (typeof navigator.share !== "function") {
      await handleCopy();
      setError("Sharing isn't supported in this browser — copied instead.");
      return;
    }
    try {
      await navigator.share({ text: cipherOutput });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError("Could not open the share sheet.");
      }
    }
  }

  async function handleDestroy(id: string) {
    await dismissMessage(id);
    if (revealedId === id) setRevealedId(null);
  }

  function plainTextFor(connectionId: string, cipherText: string): string {
    const result = decodeIncoming(connectionId, cipherText);
    return result.plainText ?? "(could not decode)";
  }

  if (friends.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-foreground/60">
          You need a connection before you can encode or decode messages. Head
          to the Connections tab and exchange a friend code.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Connection
            <select
              value={friendId}
              onChange={(e) => {
                setFriendId(e.target.value);
                setCipherOutput("");
                setDecodedText("");
              }}
              className="rounded-md border border-vault-steel bg-vault-black px-3 py-2 text-foreground focus:border-vault-gold focus:outline-none"
            >
              {friends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.nickname}
                </option>
              ))}
            </select>
          </label>
          <Badge tone={messagesRemaining === 0 ? "red" : "gold"}>
            {messagesRemaining === "unlimited"
              ? "Unlimited messages today"
              : `${messagesRemaining} of ${config?.maxMessagesPerDay} left today`}
          </Badge>
        </div>
      </Panel>

      {error && (
        <p className="text-sm text-vault-locked" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <TerminalFrame title="Encode Transmission" footer="Press Encode to transmit">
          <form onSubmit={handleEncode} className="flex flex-col gap-3">
            <TerminalTextarea
              placeholder="Write your message..."
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              rows={4}
            />
            <TerminalButton type="submit" disabled={busy || messagesRemaining === 0}>
              Encode
            </TerminalButton>
          </form>
          {cipherOutput && (
            <div className="mt-4 border border-vault-encoded/40 bg-black p-3">
              <pre className="vault-scrollbar overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm text-vault-encoded">
                {formatAsTransmission(cipherOutput)}
              </pre>
              <div className="mt-3 flex flex-wrap gap-3">
                <TerminalButton type="button" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy"}
                </TerminalButton>
                <TerminalButton type="button" onClick={handleShare}>
                  Share to App
                </TerminalButton>
              </div>
            </div>
          )}
        </TerminalFrame>

        <TerminalFrame title="Decode Transmission" footer="Press Decode to reveal">
          <form onSubmit={handleDecode} className="flex flex-col gap-3">
            <TerminalTextarea
              placeholder="Paste the encoded message you received..."
              value={incomingCipher}
              onChange={(e) => setIncomingCipher(e.target.value)}
              rows={4}
            />
            <TerminalButton type="submit">Decode</TerminalButton>
          </form>
          {decodedText && (
            <div className="mt-4 border border-vault-encoded/40 bg-black p-3">
              <p className="whitespace-pre-wrap font-mono text-sm text-vault-encoded">
                {decodedText}
              </p>
            </div>
          )}
        </TerminalFrame>
      </div>

      <TerminalFrame
        title={`Message Log — ${activeFriend?.nickname ?? ""}`}
        footer="Destroying a message removes it for both sides"
      >
        {history.length === 0 ? (
          <p className="font-mono text-sm text-vault-encoded/50">
            No messages yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((m) => {
              const sent = m.senderId === vault?.id;
              return (
                <li key={m.id} className="border border-vault-encoded/30 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-vault-encoded/50">
                    <span>
                      {sent ? "You sent" : "Received"} ·{" "}
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                    <TerminalButton onClick={() => handleDestroy(m.id)}>
                      Destroy
                    </TerminalButton>
                  </div>
                  {sent || revealedId === m.id ? (
                    <p className="font-mono text-sm text-vault-encoded">
                      {plainTextFor(m.connectionId, m.cipherText)}
                    </p>
                  ) : (
                    <TerminalButton onClick={() => setRevealedId(m.id)}>
                      Reveal (one read only)
                    </TerminalButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </TerminalFrame>
    </div>
  );
}
