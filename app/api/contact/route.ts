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

// Reject anything that could smuggle email headers (CR/LF) or extra addresses.
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkIpRateLimit(ip, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const data = await req.json();
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    const subject = typeof data?.subject === "string" ? data.subject.trim() : "";
    const message = typeof data?.message === "string" ? data.message.trim() : "";

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (name.length > 100 || subject.length > 150 || message.length > 5000) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    const safeName = oneLine(name);
    const safeSubject = oneLine(subject) || "General Inquiry";

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Aussie Lunchbox Contact <noreply@aussielunchbox.com>",
      replyTo: email,
      to: ["aussielunchbox@gmail.com"],
      subject: `[Contact] ${safeSubject} — from ${safeName}`,
      text: `Name: ${safeName}\nEmail: ${email}\nSubject: ${safeSubject}\n\nMessage:\n${message}`,
    });

    if (error) {
      console.error("contact send error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
