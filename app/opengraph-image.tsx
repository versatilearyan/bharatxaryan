import { ImageResponse } from "next/og";

// Generated Open Graph card (1200×630). Replace with a designed image by
// adding app/opengraph-image.png and deleting this file.
export const alt = "Panchayat — Play, Chat, Connect. The web app is coming soon.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 120%, #5a1d2a 0%, #101014 60%)",
          color: "#fff1d5",
        }}
      >
        <svg width="120" height="90" viewBox="0 0 64 48">
          <path d="M6 16 L18 28 L32 6 L46 28 L58 16 L53 40 Q32 45 11 40 Z" fill="#e7bc72" />
          <circle cx="6" cy="15" r="3.4" fill="#ff647c" />
          <circle cx="32" cy="5" r="3.8" fill="#f4515b" />
          <circle cx="58" cy="15" r="3.4" fill="#ff647c" />
        </svg>
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -6, color: "#ff8a6e", marginTop: 10 }}>Panchayat</div>
        <div style={{ fontSize: 34, letterSpacing: 10, color: "#e7bc72", marginTop: 10 }}>PLAY • CHAT • CONNECT</div>
        <div style={{ fontSize: 28, color: "#aaa6b0", marginTop: 40 }}>The web app is coming soon</div>
      </div>
    ),
    size,
  );
}
