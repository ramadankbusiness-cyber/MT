import { withApiErrorHandling } from "@/lib/api-error-handler";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";

const genericResponse = () => NextResponse.json(
  { message: "If the account exists, we sent a reset link." },
  { headers: { "Cache-Control": "no-store" } },
);

async function POSTInternal(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return genericResponse();

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, isActive: true },
  });
  if (!user?.isActive) return genericResponse();

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } }),
  ]);
  await writeAuditLog({ action: "user.password.reset.requested", targetType: "User", targetId: user.id });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (apiKey && from) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const resetUrl = new URL("/reset-password", origin);
    resetUrl.searchParams.set("token", token);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [user.email],
          subject: "Reset your MT Club password",
          text: `Use this one-time link to reset your MT Club password. It expires in one hour:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
        }),
      });
      if (!response.ok) console.error("[Password reset] Email delivery failed", { status: response.status });
    } catch (error) {
      console.error("[Password reset] Email delivery failed", error);
    }
  } else {
    console.error("[Password reset] RESEND_API_KEY and AUTH_EMAIL_FROM are required to send reset links.");
  }

  return genericResponse();
}

export const POST = withApiErrorHandling(POSTInternal, "/api/auth/forgot-password");
