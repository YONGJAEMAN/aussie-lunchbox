import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit, getClientIp, isUnknownIp } from "@/lib/rateLimit";

/**
 * 🔴 2026-08-31까지 이 파일은 lib/rateLimit.ts를 쓰지 않고 **자기 복사본**을
 *    들고 있었다. 한도가 시간당 3건이라 몇 번 시도하면 바로 429가 났고,
 *    화면은 그걸 "필수 항목을 채우세요"로 보여줘 원인을 못 찾았다.
 *    문의폼은 사용자가 고장을 알려 오는 유일한 통로다 — 넉넉해야 한다.
 */
const MAX_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000;

// Reject anything that could smuggle email headers (CR/LF) or extra addresses.
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isUnknownIp(ip)) {
    // 🔴 IP를 못 뽑으면 전 방문자가 한 바구니를 쓴다. 조용히 지나가면
    //    "왜 다들 막히지"를 영영 못 찾는다.
    console.warn("contact: client IP unresolved — rate limit bucket is shared");
  }
  const verdict = rateLimit(`contact:${ip}`, MAX_PER_HOUR, WINDOW_MS);
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSec) } },
    );
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
