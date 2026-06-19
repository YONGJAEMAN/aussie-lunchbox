import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // 1. Authentication required
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit: 5 emails per user per hour
  if (!checkRateLimit(`email:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await req.json();
    const { to, subject, body: emailBody, pdfBase64 } = body;

    if (!to || !pdfBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Validate recipient matches authenticated user (no sending to arbitrary addresses)
    if (to !== user.email) {
      return NextResponse.json({ error: "Recipient must match your account email" }, { status: 403 });
    }

    // 4. Validate the attachment is a real, reasonably-sized base64 PDF (DoS / abuse guard)
    if (
      typeof pdfBase64 !== "string" ||
      pdfBase64.length > 8_000_000 ||
      !/^[A-Za-z0-9+/=\r\n]+$/.test(pdfBase64)
    ) {
      return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
    }
    const pdfBuf = Buffer.from(pdfBase64, "base64");
    if (pdfBuf.length < 5 || pdfBuf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
    }

    // 5. This endpoint only ever mails the user their own plan — clamp/sanitise
    //    any client-supplied subject/body rather than trusting them.
    const safeSubject =
      typeof subject === "string" && subject.trim()
        ? subject.replace(/[\r\n]+/g, " ").trim().slice(0, 150)
        : "Your Aussie Lunchbox Plan 🦘";
    const safeBody =
      typeof emailBody === "string" && emailBody.trim()
        ? emailBody.slice(0, 5000)
        : "Here is your weekly lunchbox plan!";

    const { error } = await resend.emails.send({
      from: "Aussie Lunchbox <noreply@aussielunchbox.com>",
      to: [to],
      subject: safeSubject,
      text: safeBody,
      attachments: [
        {
          filename: "aussie_lunchbox_plan.pdf",
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      console.error("email send error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
