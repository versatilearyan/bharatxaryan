import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The id of the build that is running, so open pages can tell when a newer release has been deployed. */
export const dynamic = "force-dynamic";

export function GET() {
  let id = "dev";
  try {
    id = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim() || "dev";
  } catch {
    // development, or the file isn't there
  }
  return Response.json({ id }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
