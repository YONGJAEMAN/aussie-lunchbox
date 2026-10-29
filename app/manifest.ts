import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aussie Lunchbox — NZ School Lunch Planner",
    short_name: "KiwiLunch",
    description: "Plan stress-free school lunches for NZ families. Weekly plans, shopping lists, allergy filters.",
    start_url: "/en/planner",
    display: "standalone",
    background_color: "#F5F7FA",
    theme_color: "#78B159",
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
