import { describe, it, expect } from "vitest";
import { normalizeHandle, parseCompetitorsFile, resolveHandles } from "./resolve-handles.ts";

describe("resolve-handles", () => {
  it("normalizes @, urls, whitespace, case", () => {
    expect(normalizeHandle("@Foo")).toBe("foo");
    expect(normalizeHandle("  Bar ")).toBe("bar");
    expect(normalizeHandle("https://www.instagram.com/baz/")).toBe("baz");
  });
  it("parses file ignoring comments and blanks", () => {
    const content = "# meus concorrentes\n@alpha\n\nbeta\n# fim\n@Gamma\n";
    expect(parseCompetitorsFile(content)).toEqual(["alpha", "beta", "gamma"]);
  });
  it("merges file + inline and dedups", () => {
    const out = resolveHandles({ fileContent: "@alpha\nbeta\n", inline: ["@Beta", "delta"] });
    expect(out).toEqual(["alpha", "beta", "delta"]);
  });
  it("throws when nothing resolves", () => {
    expect(() => resolveHandles({})).toThrow();
  });
});
