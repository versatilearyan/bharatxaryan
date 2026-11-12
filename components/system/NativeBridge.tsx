"use client";

import { useEffect, useRef } from "react";
import { isNativeApp, nativeEmit } from "@/lib/native/bridge";
import { recoverPurchases } from "@/lib/native/play";
import { readToken } from "@/lib/auth/token";
import { useApp } from "@/lib/app/store";

/**
 * Only does anything inside the Android app. It tells the app who is signed in (so the phone can get notifications for
 * that person, and stop when they sign out) and credits any Google Play purchase that was paid but never credited.
 */
export function NativeBridge() {
  const { refreshCoins, toast } = useApp();
  const last = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isNativeApp()) return;
    const tick = () => {
      const token = readToken()?.accessToken ?? null;
      if (token === last.current) return;
      const first = last.current === undefined;
      last.current = token;
      nativeEmit("auth", { token });
      if (token && first) {
        void recoverPurchases().then((n) => {
          if (n > 0) {
            toast(n === 1 ? "Your Google Play purchase was added" : `${n} Google Play purchases were added`, "gold");
            void refreshCoins();
          }
        });
      }
    };
    tick();
    const t = window.setInterval(tick, 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
