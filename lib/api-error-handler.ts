import { randomUUID } from "node:crypto";

type RouteHandler<Args extends unknown[]> = (...args: Args) => Promise<Response>;

const friendlyMessage = (status: number) => {
  if (status === 401) return "Please log in to continue.";
  if (status === 403) return "You don’t have permission to do that.";
  if (status === 404) return "The requested resource was not found.";
  return "We couldn’t complete that request. Please try again.";
};

export function withApiErrorHandling<Args extends unknown[]>(
  handler: RouteHandler<Args>,
  route: string,
): RouteHandler<Args> {
  return async (...args) => {
    try {
      const response = await handler(...args);
      if (response.status < 400) return response;

      const code = response.status === 401
        ? "AUTH_REQUIRED"
        : response.status === 403
          ? "FORBIDDEN"
          : response.status === 404
            ? "NOT_FOUND"
            : response.status >= 500
              ? "INTERNAL_ERROR"
              : "REQUEST_ERROR";
      const payload = response.status >= 500
        ? { error: friendlyMessage(response.status) }
        : await response.clone().json().catch(() => ({ error: friendlyMessage(response.status) }));
      const message = typeof payload?.error === "string" && response.status < 500
        ? payload.error
        : friendlyMessage(response.status);
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "application/json; charset=utf-8");
      headers.delete("Content-Length");
      headers.delete("Content-Encoding");
      return new Response(JSON.stringify({ ...payload, error: message, code }), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const errorId = randomUUID().slice(0, 12);
      console.error("[API error]", { errorId, route }, error);
      return Response.json(
        { error: "We couldn’t complete that request. Please try again.", code: "INTERNAL_ERROR" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
