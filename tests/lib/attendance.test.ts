import { describe, expect, it } from "vitest";
import { haversineMeters, isInsideZone } from "../../lib/attendance";

const CAIRO = { latitude: 30.0444, longitude: 31.2357 };

describe("haversineMeters", () => {
  it("returns 0 for the same point", () => {
    expect(haversineMeters(CAIRO, CAIRO)).toBeCloseTo(0, 0);
  });

  it("computes a known distance (Cairo to Giza ~18 km)", () => {
    const giza = { latitude: 30.0131, longitude: 31.2089 };
    const meters = haversineMeters(CAIRO, giza);
    expect(meters).toBeGreaterThan(15_000);
    expect(meters).toBeLessThan(22_000);
  });

  it("is symmetric", () => {
    const a = { latitude: 30.1, longitude: 31.2 };
    const b = { latitude: 30.0, longitude: 31.0 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 0);
  });
});

describe("isInsideZone (radius boundaries)", () => {
  const radius = 100;

  it("accepts a member exactly at the center", () => {
    expect(isInsideZone(0, 5, radius)).toBe(true);
  });

  it("accepts a member exactly on the edge with zero accuracy", () => {
    expect(isInsideZone(radius, 0, radius)).toBe(true);
  });

  it("rejects a member exactly on the edge with nonzero accuracy", () => {
    expect(isInsideZone(radius, 1, radius)).toBe(false);
  });

  it("rejects a member just outside the edge", () => {
    expect(isInsideZone(radius + 1, 0, radius)).toBe(false);
  });

  it("rejects a member far outside", () => {
    expect(isInsideZone(240, 5, radius)).toBe(false);
  });

  it("accounts for reported GPS accuracy", () => {
    expect(isInsideZone(95, 6, 100)).toBe(true);
    expect(isInsideZone(95, 6, 100)).toBe(true);
  });
});
