import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const RATE_LIMIT_MAP = new Map<string, number[]>();

function checkIpRateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = RATE_LIMIT_MAP.get(ip)?.filter((t) => now - t < windowMs) ?? [];
  if (timestamps.length >= max) return false;
  timestamps.push(now);
  RATE_LIMIT_MAP.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkIpRateLimit(ip, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const { name, email, subject, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Aussie Lunchbox Contact <noreply@aussielunchbox.com>",
      replyTo: email,
      to: ["aussielunchbox@gmail.com"],
      subject: `[Contact] ${subject || "General Inquiry"} — from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject || "General Inquiry"}\n\nMessage:\n${message}`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
