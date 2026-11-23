"use client";

import { useEffect } from "react";

/**
 * The last resort: only renders if even the root layout itself throws. Has to bring its own
 * <html>/<body> (it replaces the whole page), so it stays plain and self-contained on purpose —
 * never shows the error itself, only ever a plain "try again".
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050507", color: "#fff1d5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Something didn&apos;t load right</h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#aaa6b0", marginTop: 8 }}>We hit a snag on our side. Please try again — if it keeps happening, come back in a few minutes.</p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            style={{ borderRadius: 999, background: "#e7bc72", color: "#050507", padding: "8px 20px", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
