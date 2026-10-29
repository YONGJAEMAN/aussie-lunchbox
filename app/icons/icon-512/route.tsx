import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 360, background: "linear-gradient(135deg, #314A37 0%, #78B159 100%)", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        🥝
      </div>
    ),
    { width: 512, height: 512 }
  );
}
