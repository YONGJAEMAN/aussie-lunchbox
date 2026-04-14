import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aussie Lunchbox — Australian School Lunch Planner",
    short_name: "AussieLunch",
    description: "Plan stress-free school lunches for Australian families. Weekly plans, shopping lists, allergy filters.",
    start_url: "/en/planner",
    display: "standalone",
    background_color: "#FDFAF2",
    theme_color: "#F5A623",
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
