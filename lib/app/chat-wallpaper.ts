"use client";

import { useEffect, useState } from "react";

/**
 * A chat background you pick from your gallery. It is yours alone (the other person doesn't see it) and is kept on this device,
 * one picture per chat. The picture is shrunk first so it stays small.
 */
const KEY = (conversationId: string) => `panchayat.chatBg.${conversationId}`;
const EVENT = "panchayat-chat-bg";
const MAX_SIDE = 960;

export function getChatWallpaper(conversationId: string | undefined | null): string | null {
  if (!conversationId) return null;
  try {
    return window.localStorage.getItem(KEY(conversationId));
  } catch {
    return null;
  }
}

function announce(conversationId: string) {
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: conversationId }));
  } catch {
    /* no window */
  }
}

export function clearChatWallpaper(conversationId: string) {
  try {
    window.localStorage.removeItem(KEY(conversationId));
  } catch {
    /* storage blocked */
  }
  announce(conversationId);
}

/** Shrinks the picked image to a JPEG and keeps it for this chat. Throws a readable message if it can't. */
export async function setChatWallpaperFromFile(conversationId: string, file: File): Promise<void> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Pick a JPG, PNG or WebP picture.");
  if (file.size > 15 * 1024 * 1024) throw new Error("That picture is too big. Pick one under 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that picture."));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't read that picture.");
    ctx.drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL("image/jpeg", 0.72);
    try {
      window.localStorage.setItem(KEY(conversationId), data);
    } catch {
      throw new Error("Not enough space on this phone to keep a background.");
    }
    announce(conversationId);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The background for a chat, updating when it changes. */
export function useChatWallpaper(conversationId: string | undefined | null): string | null {
  const [bg, setBg] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setBg(getChatWallpaper(conversationId));
    read();
    const on = (e: Event) => {
      if (!conversationId || (e as CustomEvent).detail === conversationId) read();
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [conversationId]);
  return bg;
}

/** A square JPEG cut from the middle of a picture (for a group's photo). */
export async function squareJpegBlob(file: File, side = 512): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Pick a JPG, PNG or WebP picture.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that picture."));
      i.src = url;
    });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't read that picture.");
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, side, side);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that picture."))), "image/jpeg", 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}
