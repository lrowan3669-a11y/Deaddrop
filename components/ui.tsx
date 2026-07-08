"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`vault-panel rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "rounded-md px-4 py-2 text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const variants = {
    primary:
      "bg-vault-gold text-vault-black hover:bg-vault-gold-dark hover:text-foreground",
    secondary:
      "border border-vault-gold-dark text-vault-gold hover:bg-vault-gold-dark/20",
    danger: "border border-vault-locked text-vault-locked hover:bg-vault-locked/10",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}

export function Badge({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "green" | "red";
}) {
  const tones = {
    gold: "border-vault-gold-dark text-vault-gold",
    green: "border-vault-encoded text-vault-encoded",
    red: "border-vault-locked text-vault-locked",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs uppercase tracking-widest ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-vault-steel bg-vault-black px-3 py-2 text-foreground placeholder:text-foreground/40 focus:border-vault-gold focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-vault-steel bg-vault-black px-3 py-2 text-foreground placeholder:text-foreground/40 focus:border-vault-gold focus:outline-none ${props.className ?? ""}`}
    />
  );
}
