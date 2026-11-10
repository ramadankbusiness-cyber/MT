import { afterEach, describe, expect, it, vi } from "vitest";
import { withApiErrorHandling } from "../../lib/api-error-handler";

describe("API error handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("adds a stable error code to rejected JSON responses", async () => {
    const handler = withApiErrorHandling(async () => Response.json(
      { error: "Please sign in." },
      { status: 401 },
    ), "/api/example");

    const response = await handler();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Please sign in.",
      code: "AUTH_REQUIRED",
    });
  });

  it("logs unexpected exceptions and returns only a friendly response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      throw new Error("database credentials leaked");
    }, "/api/example");

    const response = await handler();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "We couldn’t complete that request. Please try again.",
      code: "INTERNAL_ERROR",
    });
    expect(console.error).toHaveBeenCalledWith(
      "[API error]",
      expect.objectContaining({ route: "/api/example" }),
      expect.any(Error),
    );
  });
});
