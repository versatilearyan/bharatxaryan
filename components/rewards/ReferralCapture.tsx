"use client";

/**
 * Invite links (panchayat.world/?ref=1234567): the code is kept on this device
 * until the person has signed up and set up their profile, then sent once
 * (POST /api/v1/referrals/apply). The server decides whether it counts.
 */
import { useEffect } from "react";
import { api } from "@/lib/api/client";
import { readToken } from "@/lib/auth/token";
import { useApp } from "@/lib/app/store";

const KEY = "panchayat-ref";

export function ReferralCapture() {
  const { session } = useApp();

  // Remember ?ref= from the link
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^\d{4,12}$/.test(ref)) window.localStorage.setItem(KEY, ref);
    } catch {
      /* private mode */
    }
  }, []);

  // Signed up with a finished profile: tell the server who invited you
  useEffect(() => {
    if (!session?.profileCompleted || !readToken()) return;
    let code: string | null = null;
    try {
      code = window.localStorage.getItem(KEY);
    } catch {
      return;
    }
    if (!code) return;
    api("/api/v1/referrals/apply", { method: "POST", auth: true, body: { code } })
      .catch(() => undefined)
      .finally(() => {
        try {
          window.localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
      });
  }, [session?.profileCompleted]);

  return null;
}
