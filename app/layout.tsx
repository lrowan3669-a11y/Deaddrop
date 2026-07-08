import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VaultProvider } from "@/context/VaultContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeadDrop — Secure. Private. Unreadable.",
  description:
    "DeadDrop is a friendship-code encoder/decoder for turning messages into unreadable ciphertext before you send them anywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <VaultProvider>{children}</VaultProvider>
      </body>
    </html>
  );
}
