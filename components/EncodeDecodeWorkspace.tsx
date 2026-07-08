"use client";

import { useMemo, useState } from "react";
import { useVault } from "@/context/VaultContext";
import { formatAsTransmission } from "@/lib/cipher";
import { tierConfig } from "@/lib/tiers";
import { Badge, Button, Panel, Textarea } from "./ui";

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
  const [incomingCipher, setIncomingCipher] = useState("");
  const [decodedText, setDecodedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const config = vault ? tierConfig(vault.tier) : null;
  const activeFriend = friends.find((f) => f.id === friendId);

  const history = useMemo(
    () => messages.filter((m) => m.friendId === friendId),
    [messages, friendId],
  );

  function handleEncode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!friendId) {
      setError("Add a connection first.");
      return;
    }
    if (!plainText.trim()) return;
    const result = sendEncoded(friendId, plainText);
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

  function handleDestroy(id: string) {
    dismissMessage(id);
    if (revealedId === id) setRevealedId(null);
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
        <Panel>
          <h2 className="mb-3 text-sm uppercase tracking-widest text-vault-gold-dark">
            Encode
          </h2>
          <form onSubmit={handleEncode} className="flex flex-col gap-3">
            <Textarea
              placeholder="Write your message..."
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              rows={4}
            />
            <Button type="submit" disabled={messagesRemaining === 0}>
              Encode
            </Button>
          </form>
          {cipherOutput && (
            <div className="mt-4 rounded-md border border-vault-gold-dark bg-vault-black p-3">
              <pre className="vault-scrollbar overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm text-vault-encoded">
                {formatAsTransmission(cipherOutput)}
              </pre>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={handleCopy}
              >
                {copied ? "Copied" : "Copy & Paste Into Chat"}
              </Button>
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm uppercase tracking-widest text-vault-gold-dark">
            Decode
          </h2>
          <form onSubmit={handleDecode} className="flex flex-col gap-3">
            <Textarea
              placeholder="Paste the encoded message you received..."
              value={incomingCipher}
              onChange={(e) => setIncomingCipher(e.target.value)}
              rows={4}
            />
            <Button type="submit">Decode</Button>
          </form>
          {decodedText && (
            <div className="mt-4 rounded-md border border-vault-steel bg-vault-black p-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {decodedText}
              </p>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <h2 className="text-sm uppercase tracking-widest text-vault-gold-dark">
          History with {activeFriend?.nickname}
        </h2>
        <p className="mb-4 text-xs text-foreground/40">
          Destroying a message removes it for both sides of the conversation.
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-foreground/40">No messages yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-vault-steel px-4 py-3"
              >
                <div className="mb-2 flex items-center justify-between text-xs text-foreground/40">
                  <span>
                    {m.direction === "sent" ? "You sent" : "Received"} ·{" "}
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                  <Button variant="danger" onClick={() => handleDestroy(m.id)}>
                    Destroy
                  </Button>
                </div>
                {m.direction === "sent" || revealedId === m.id ? (
                  <p className="text-sm">{m.plainText}</p>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setRevealedId(m.id)}
                  >
                    Reveal (one read only)
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
