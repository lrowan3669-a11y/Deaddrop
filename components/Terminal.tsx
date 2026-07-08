"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export function TerminalFrame({
  title,
  footer,
  children,
  className = "",
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden border-4 border-double border-vault-encoded bg-black font-mono text-vault-encoded shadow-[0_0_25px_rgba(0,208,132,0.2)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_2px,rgba(0,0,0,0.35)_3px)]" />
      {title && (
        <div className="relative flex items-center justify-between border-b-2 border-vault-encoded/50 px-3 py-1.5 text-xs uppercase tracking-[0.3em]">
          <span>{title}</span>
        </div>
      )}
      <div className="relative p-4">{children}</div>
      {footer && (
        <div className="relative border-t-2 border-vault-encoded/50 px-3 py-1.5 text-[10px] uppercase tracking-widest text-vault-encoded/70">
          {footer}
        </div>
      )}
    </div>
  );
}

export function TerminalTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none border border-vault-encoded/50 bg-black px-3 py-2 font-mono text-sm text-vault-encoded caret-vault-encoded placeholder:text-vault-encoded/40 focus:border-vault-encoded focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function TerminalButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`border border-vault-encoded px-4 py-2 font-mono text-sm uppercase tracking-widest text-vault-encoded transition-colors hover:bg-vault-encoded/10 disabled:cursor-not-allowed disabled:opacity-40 ${props.className ?? ""}`}
    />
  );
}
