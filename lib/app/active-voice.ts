"use client";

/**
 * The room you're in, for screens shown on top of it (like Ludo): mic state and
 * controls, without opening the room. Published by ActiveRoomHost.
 */
import { useSyncExternalStore } from "react";

export type ActiveVoice = {
  roomServerId?: string;
  seated: boolean;
  muted: boolean;
  speakingIds: string[];
  toggleMute: () => void;
  /** Takes a free seat (you need one to talk), then you can unmute. */
  sitToTalk: () => boolean;
};

let current: ActiveVoice | null = null;
const listeners = new Set<() => void>();

export function publishActiveVoice(v: ActiveVoice | null) {
  current = v;
  listeners.forEach((l) => l());
}

export function useActiveVoice(): ActiveVoice | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}
