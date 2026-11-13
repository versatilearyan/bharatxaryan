import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { APK_PATH } from "@/lib/apk";

/**
 * Sends the Android app file. The file itself is too big for the code repository, so it sits on the server
 * (APK_PATH, default /opt/panchayat-deploy/apk/panchayat.apk) and is replaced there whenever a new app is built.
 * Supports resuming (Range) so a dropped download on a phone carries on instead of starting again.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = {
  "Content-Type": "application/vnd.android.package-archive",
  "Content-Disposition": 'attachment; filename="Panchayat.apk"',
  "Accept-Ranges": "bytes",
  "Cache-Control": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(req: Request) {
  let size = 0;
  let mtime = new Date();
  try {
    const s = await stat(APK_PATH);
    if (!s.isFile()) throw new Error("not a file");
    size = s.size;
    mtime = s.mtime;
  } catch {
    return new Response("The app file isn't uploaded yet. Please try again later.", { status: 404 });
  }
  const headers: Record<string, string> = { ...BASE, "Last-Modified": mtime.toUTCString() };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let start = 0;
  let end = size - 1;
  let status = 200;
  if (range && (range[1] || range[2])) {
    if (range[1]) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(Number(range[2]), size - 1);
    } else {
      start = Math.max(0, size - Number(range[2])); // the last N bytes
    }
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);
  const stream = createReadStream(APK_PATH, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers });
}

export async function HEAD() {
  try {
    const s = await stat(APK_PATH);
    return new Response(null, { status: 200, headers: { ...BASE, "Content-Length": String(s.size) } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
