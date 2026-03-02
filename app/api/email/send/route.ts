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

    const { error } = await resend.emails.send({
      from: "Aussie Lunchbox <noreply@aussielunchbox.com.au>",
      to: [to],
      subject: subject ?? "Your Aussie Lunchbox Plan 🥝",
      text: emailBody ?? "Here is your weekly lunchbox plan!",
      attachments: [
        {
          filename: "aussie_lunchbox_plan.pdf",
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
