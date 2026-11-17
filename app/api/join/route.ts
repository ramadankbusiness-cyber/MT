import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { joinApplicationSchema } from "@/lib/schemas";

async function POSTInternal(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = joinApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide valid application details" }, { status: 400 });
  }
  const application = parsed.data;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Application storage is not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error: storageError } = await supabase.from("join_applications").insert(application);
  if (storageError) {
    console.error("[Join] Failed to store application", storageError.message);
    return NextResponse.json({ error: "Application could not be stored" }, { status: 503 });
  }

  const destination = process.env.JOIN_WEBHOOK_URL;
  if (destination) {
    let webhook: URL;
    try {
      webhook = new URL(destination);
      if (webhook.protocol !== "https:" && webhook.protocol !== "http:") throw new Error("Unsupported protocol");
    } catch {
      console.error("[Join] JOIN_WEBHOOK_URL must be a valid HTTP(S) URL");
      return NextResponse.json({ ok: true, forwarded: false }, { status: 201 });
    }

    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...application, submittedAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!response.ok) {
        console.error(`[Join] Submission destination returned ${response.status}`);
        return NextResponse.json({ ok: true, forwarded: false }, { status: 201 });
      }
      return NextResponse.json({ ok: true, forwarded: true }, { status: 201 });
    } catch (error) {
      console.error("[Join] Failed to forward application", error instanceof Error ? error.message : "unknown error");
      return NextResponse.json({ ok: true, forwarded: false }, { status: 201 });
    }
  }

  return NextResponse.json({ ok: true, forwarded: false }, { status: 201 });
}

export const POST = withApiErrorHandling(POSTInternal, "/api/join");
