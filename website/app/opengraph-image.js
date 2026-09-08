import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const alt = "Orbitvoice — voice typing and speech to text for Windows";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function SocialImage() {
  const logo = await readFile(
    path.join(process.cwd(), "public", "orbitvoice-logo.png"),
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 72px",
          background: "#0a1210",
          color: "#f1f6f2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              overflow: "hidden",
              background: "#f5fff7",
              borderRadius: 16,
            }}
          >
            <img
              src={`data:image/png;base64,${logo.toString("base64")}`}
              width="64"
              height="64"
              alt=""
            />
          </div>
          <span style={{ fontSize: 32 }}>Orbitvoice</span>
          <span style={{ marginLeft: "auto", color: "#a7b8ad", fontSize: 20 }}>
            ov.orbitdor.com
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 64,
            fontSize: 82,
            letterSpacing: "-4px",
            lineHeight: 1.05,
          }}
        >
          <span>Your voice,</span>
          <span style={{ color: "#b1efc9" }}>everywhere.</span>
        </div>
        <span style={{ marginTop: 32, fontSize: 26, color: "#c1d0c5" }}>
          Voice typing &amp; speech to text for Windows.
        </span>
        <div
          style={{
            display: "flex",
            gap: 40,
            borderTop: "1px solid #293c32",
            paddingTop: 26,
            marginTop: "auto",
            fontSize: 18,
            color: "#b1efc9",
          }}
        >
          <span>Local recognition</span>
          <span>Multilingual dictation</span>
          <span>Optional AI cleanup</span>
        </div>
      </div>
    ),
    size,
  );
}
