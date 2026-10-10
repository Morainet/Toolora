import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Toolora — Fast, private, local-first developer tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph image. Renders a branded social-share card with the
 * Toolora mark, name, and tagline. Used for both OpenGraph and Twitter cards
 * automatically (Next.js wires it into metadata).
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "#1e3a5f",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top: brand mark + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#175cd3",
              display: "flex",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", left: "13px", top: "17px", width: "38px", height: "8px", borderRadius: "3px", background: "#ffffff" }} />
            <div style={{ position: "absolute", left: "28px", top: "17px", width: "8px", height: "31px", borderRadius: "3px", background: "#ffffff" }} />
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: "32px",
              fontWeight: 600,
            }}
          >
            Toolora
          </div>
        </div>

        {/* Center: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.1,
              display: "flex",
              flexDirection: "column",
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            <span>All your tools,</span>
            <span>one focused workspace</span>
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#c8dcff",
              maxWidth: "800px",
            }}
          >
            Work with JSON, Word, Excel, and PDF in your browser. Your files
            stay on your device.
          </div>
        </div>

        {/* Bottom: badges */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["Local-first", "100% private", "Open source", "Free"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "8px 20px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.1)",
                  color: "#f4f7fb",
                  fontSize: "20px",
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
