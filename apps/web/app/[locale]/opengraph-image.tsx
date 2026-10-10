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
          background: "linear-gradient(135deg, #0f1729 0%, #1e1b4b 100%)",
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
              background: "#0e0f1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "7px",
                  borderRadius: "4px",
                  background: "#ffffff",
                }}
              />
              <div
                style={{
                  width: "32px",
                  height: "7px",
                  borderRadius: "4px",
                  background: "#6366f1",
                  marginLeft: "6px",
                }}
              />
              <div
                style={{
                  width: "32px",
                  height: "7px",
                  borderRadius: "4px",
                  background: "#ffffff",
                }}
              />
            </div>
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
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            The fast, private way
            <br />
            to work with JSON
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#94a3b8",
              maxWidth: "800px",
            }}
          >
            Format, validate, minify, diff, repair & convert — all in your
            browser. Your data never leaves your device.
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
                  color: "#e2e8f0",
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
