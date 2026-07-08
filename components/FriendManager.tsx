"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { tierConfig } from "@/lib/tiers";
import { Badge, Button, Input, Panel } from "./ui";

export function FriendManager() {
  const { vault, friends, addFriend, removeFriend, friendSlotsRemaining } =
    useVault();
  const [nickname, setNickname] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!vault) return null;
  const config = tierConfig(vault.tier);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const result = addFriend(nickname, friendCode);
    if (!result.ok) {
      setError(result.error ?? "Could not add connection.");
      return;
    }
    setError(null);
    setNickname("");
    setFriendCode("");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(vault!.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <h2 className="mb-1 text-sm uppercase tracking-widest text-vault-gold-dark">
          Your Friend Code
        </h2>
        <p className="mb-4 text-xs text-foreground/50">
          Share this with someone you trust. It is the secret function behind
          every message you exchange.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-md border border-vault-gold-dark bg-vault-black px-4 py-3 text-lg tracking-widest text-vault-gold">
            {vault.friendCode}
          </code>
          <Button type="button" variant="secondary" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-vault-gold-dark">
            Exchange Connection
          </h2>
          <Badge tone={friendSlotsRemaining === 0 ? "red" : "gold"}>
            {config.maxFriends === "unlimited"
              ? "Unlimited friends"
              : `${friendSlotsRemaining} of ${config.maxFriends} left`}
          </Badge>
        </div>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Nickname (e.g. Night Owl)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Input
            placeholder="Their friend code"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
          />
          <Button type="submit" className="whitespace-nowrap">
            Add Connection
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-vault-locked">{error}</p>}
      </Panel>

      <Panel>
        <h2 className="mb-4 text-sm uppercase tracking-widest text-vault-gold-dark">
          Connections ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-foreground/40">
            No connections yet. Exchange a friend code to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex items-center justify-between rounded-md border border-vault-steel px-4 py-3"
              >
                <div>
                  <p className="font-medium">{friend.nickname}</p>
                  <p className="text-xs text-foreground/40">
                    {friend.friendCode}
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => removeFriend(friend.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
