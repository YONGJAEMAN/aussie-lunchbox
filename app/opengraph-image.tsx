import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Aussie Lunchbox — Australian School Lunch Planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #314A37 0%, #78B159 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
          <span style={{ fontSize: "80px" }}>🥝</span>
          <span style={{ fontSize: "72px", fontWeight: "bold", color: "white", letterSpacing: "-2px" }}>
            Aussie Lunchbox
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "32px",
            color: "rgba(255,255,255,0.9)",
            textAlign: "center",
            marginBottom: "40px",
            maxWidth: "800px",
          }}
        >
          Stress-free school lunches for Australian families
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["🍱 Weekly Plans", "🛒 Shopping Lists", "🥜 Allergy Filters", "💰 Price Estimates"].map(
            (text) => (
              <div
                key={text}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "30px",
                  fontSize: "20px",
                  fontWeight: "600",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                {text}
              </div>
            )
          )}
        </div>

        {/* URL */}
        <p style={{ position: "absolute", bottom: "32px", color: "rgba(255,255,255,0.6)", fontSize: "20px" }}>
          aussielunchbox.com.au
        </p>
      </div>
    ),
    { ...size }
  );
}
