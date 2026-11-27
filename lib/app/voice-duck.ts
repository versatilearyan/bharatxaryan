"use client";

/**
 * Only one voice at a time: while another call is on (Duo Dash's game voice), the voice room you're still in goes
 * quiet (no sound from it, your room mic off), so there is never double sound and your words never reach the room.
 * When the other call ends the room's sound comes back; the mic stays off until you turn it on.
 */
let holders = 0;
const listeners = new Set<(ducked: boolean) => void>();

export function isVoiceDucked() {
  return holders > 0;
}

/** Start a call that should silence the voice room; call the returned function when it ends. */
export function duckRoomVoice(): () => void {
  holders++;
  if (holders === 1) listeners.forEach((l) => l(true));
  let done = false;
  return () => {
    if (done) return;
    done = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) listeners.forEach((l) => l(false));
  };
}

export function onVoiceDuck(l: (ducked: boolean) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
