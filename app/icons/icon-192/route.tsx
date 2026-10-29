import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 140, background: "linear-gradient(135deg, #6B3600 0%, #F5A623 100%)", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        🦘
      </div>
    ),
    { width: 192, height: 192 }
  );
}
