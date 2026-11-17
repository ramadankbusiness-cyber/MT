import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

function messageKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? messageKeys(child, path)
      : [path];
  }).sort();
}

describe("locale message catalogs", () => {
  it("contains matching keys in English and Arabic", () => {
    expect(messageKeys(en)).toEqual(messageKeys(ar));
  });
});
