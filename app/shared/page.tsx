"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setPendingSharedText } from "@/lib/pending-share";

export default function SharedPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get("text") || params.get("url") || "";
    if (text) {
      setPendingSharedText(text);
    }
    router.replace("/");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm uppercase tracking-widest text-vault-gold-dark">
        Opening...
      </p>
    </div>
  );
}
