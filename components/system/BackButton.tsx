"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Goes back one step like the phone's Back button; with nothing to go back to (a link opened fresh) it goes to the app. */
export function BackButton({ className = "" }: Readonly<{ className?: string }>) {
  const router = useRouter();
  const go = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      const from = window.location.href;
      router.back();
      // Nothing to go back to (the page was opened fresh): land on the app instead of staying stuck
      window.setTimeout(() => {
        if (window.location.href === from) router.push("/");
      }, 700);
    } else router.push("/");
  };
  return (
    <button
      type="button"
      onClick={go}
      aria-label="Go back"
      className={`inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-cream/[0.08] px-4 text-[14px] font-semibold text-cream ring-1 ring-line hover:bg-cream/[0.14] ${className}`}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Back
    </button>
  );
}
