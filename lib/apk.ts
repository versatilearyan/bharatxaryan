import { stat } from "node:fs/promises";

/** Where the Android app file sits on the server. It is too big for the code repository, so it is copied there on its own. */
export const APK_PATH = process.env.APK_PATH || "/opt/panchayat-deploy/apk/panchayat.apk";

/** Size and date of the app file, or null when it isn't uploaded yet. */
export async function apkInfo(): Promise<{ size: number; updated: Date } | null> {
  try {
    const s = await stat(APK_PATH);
    return s.isFile() ? { size: s.size, updated: s.mtime } : null;
  } catch {
    return null;
  }
}
