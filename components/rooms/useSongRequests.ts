"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribe } from "@/lib/realtime/stomp";
import { readSongRequests, songRequestApi, songRequestsTopic, type SongRequest } from "@/lib/api/song-requests";
import { useApp } from "@/lib/app/store";
import type { Song } from "@/lib/app/music";

/** The songs people in a (backend) room asked for. Anyone adds; the owner and admins order and play them. */
export function useSongRequests(serverId: string | null) {
  const { toast } = useApp();
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const version = useRef(-1);

  useEffect(() => {
    version.current = -1;
    setRequests([]);
    if (!serverId) return;
    let off = false;
    const apply = (m: { version: number; requests: SongRequest[] } | null) => {
      if (off || !m || m.version < version.current) return;
      version.current = m.version;
      setRequests(m.requests);
    };
    songRequestApi.list(serverId).then(apply).catch(() => undefined);
    const stop = subscribe(songRequestsTopic(serverId), (body) => {
      const m = readSongRequests(body);
      if (m) apply(m);
    });
    return () => {
      off = true;
      stop();
    };
  }, [serverId]);

  const fail = useCallback((e: unknown) => toast(e instanceof Error && e.message ? e.message : "That didn't work. Try again.", "error"), [toast]);
  const add = useCallback(
    (song: Song) => {
      if (!serverId) return;
      songRequestApi
        .add(serverId, song)
        .then((m) => {
          if (m) {
            version.current = Math.max(version.current, m.version);
            setRequests(m.requests);
          }
          toast(`🎵 ${song.title} added. The room owner will play it.`);
        })
        .catch(fail);
    },
    [serverId, toast, fail],
  );
  const remove = useCallback(
    (id: string) => {
      if (!serverId) return;
      songRequestApi
        .remove(serverId, id)
        .then((m) => {
          if (m) {
            version.current = Math.max(version.current, m.version);
            setRequests(m.requests);
          }
        })
        .catch(fail);
    },
    [serverId, fail],
  );
  return { requests, add, remove, enabled: Boolean(serverId) };
}

export type SongRequestsState = ReturnType<typeof useSongRequests>;
