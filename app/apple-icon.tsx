import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 120, background: "linear-gradient(135deg, #314A37 0%, #78B159 100%)", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "36px" }}>
        🥝
      </div>
    ),
    { ...size }
  );
}
