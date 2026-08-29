import { describe, it, expect } from "vitest";
import { normalizeSiteUrl } from "../../src/core/url";

describe("normalizeSiteUrl", () => {
  it("prefixes https on bare hosts", () => { expect(normalizeSiteUrl("example.com")).toBe("https://example.com"); });
  it("keeps existing schemes, any case, trimmed", () => {
    expect(normalizeSiteUrl(" HTTP://foo.org ")).toBe("HTTP://foo.org");
    expect(normalizeSiteUrl("https://bar.net/x?y")).toBe("https://bar.net/x?y");
  });
  it("empty stays empty", () => { expect(normalizeSiteUrl("")).toBe(""); expect(normalizeSiteUrl("   ")).toBe(""); });
});
