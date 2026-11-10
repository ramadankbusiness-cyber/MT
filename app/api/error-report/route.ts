import { withApiErrorHandling } from "@/lib/api-error-handler";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-guards";

const reportSchema = z.object({
  errorId: z.string().trim().min(1).max(100),
  route: z.string().trim().startsWith("/").max(500),
});

async function POSTInternal(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const report = reportSchema.safeParse(body);
  if (!report.success) {
    return Response.json({ error: "Invalid error report.", code: "INVALID_REPORT" }, { status: 400 });
  }
  const user = await getCurrentUser();
  console.error("[Client error report]", {
    errorId: report.data.errorId,
    route: report.data.route,
    userId: user?.id ?? null,
  });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = withApiErrorHandling(POSTInternal, "/api/error-report");
