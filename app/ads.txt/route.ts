import { NextResponse } from "next/server";

/** Belt-and-suspenders: serve ads.txt via route handler in case public/ serving fails */
export function GET() {
  const body = "google.com, pub-2079938386322416, DIRECT, f08c47fec0942fa0\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
