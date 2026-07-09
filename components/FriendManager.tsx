"use client";

import { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { tierConfig } from "@/lib/tiers";
import { Badge, Button, Input, Panel } from "./ui";

interface ContactsManagerLike {
  select: (
    properties: string[],
    options: { multiple: boolean },
  ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
}

export function FriendManager() {
  const { vault, friends, addFriend, removeFriend, friendSlotsRemaining } =
    useVault();
  const [nickname, setNickname] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  if (!vault) return null;
  const config = tierConfig(vault.tier);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await addFriend(nickname, friendCode);
    setBusy(false);
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

  async function handlePickContact() {
    setInviteMessage(null);
    const nav = navigator as Navigator & { contacts?: ContactsManagerLike };
    if (!nav.contacts?.select) {
      setInviteMessage(
        "Contact picking isn't supported in this browser — enter a number below instead.",
      );
      return;
    }
    try {
      const [contact] = await nav.contacts.select(["name", "tel"], {
        multiple: false,
      });
      if (contact?.tel?.[0]) setInvitePhone(contact.tel[0]);
      if (contact?.name?.[0]) setInviteName(contact.name[0]);
    } catch {
      // user cancelled the picker - not an error
    }
  }

  async function handleSendInvite() {
    setInviteMessage(null);
    const greeting = inviteName.trim() ? `Hey ${inviteName.trim()}, ` : "";
    const message = `${greeting}join me on Notes: ${window.location.origin}\nOnce you're in, add me using my code: ${vault!.friendCode}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: message });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    if (invitePhone.trim()) {
      window.location.href = `sms:${encodeURIComponent(invitePhone.trim())}?body=${encodeURIComponent(message)}`;
      return;
    }

    await navigator.clipboard.writeText(message);
    setInviteMessage("Sharing isn't available here — invite message copied instead.");
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
        <h2 className="mb-1 text-sm uppercase tracking-widest text-vault-gold-dark">
          Invite a Friend
        </h2>
        <p className="mb-4 text-xs text-foreground/50">
          Pick someone from your contacts (where supported) or enter their
          number, then send them your friend code.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Name (optional)"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />
          <Input
            type="tel"
            placeholder="Phone number"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={handlePickContact}>
            Pick from Contacts
          </Button>
          <Button type="button" onClick={handleSendInvite}>
            Send Invite
          </Button>
        </div>
        {inviteMessage && (
          <p className="mt-2 text-sm text-foreground/60">{inviteMessage}</p>
        )}
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
          <Button type="submit" disabled={busy} className="whitespace-nowrap">
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
                    {friend.counterpartAlias} · {friend.friendCode}
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
