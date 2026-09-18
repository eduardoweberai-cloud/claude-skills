import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs, defaultRange, resolveRunDir, diffShortcodes } from "./run.ts";

describe("run cli", () => {
  it("defaults to last 7 days", () => {
    const r = defaultRange("2026-07-18");
    expect(r.to).toBe("2026-07-18");
    expect(r.from).toBe("2026-07-11");
  });
  it("parses prepare mode with slug and topN", () => {
    const a = parseArgs(["--prepare", "--slug", "meu-nicho", "--top", "10"]);
    expect(a.mode).toBe("prepare");
    expect(a.slug).toBe("meu-nicho");
    expect(a.topN).toBe(10);
  });
  it("parses inline handles", () => {
    const a = parseArgs(["--prepare", "--handles", "@foo,bar"]);
    expect(a.handles).toEqual(["@foo", "bar"]);
  });
  it("parses render mode", () => {
    expect(parseArgs(["--render", "--slug", "x"]).mode).toBe("render");
  });
  it("defaults topN to 15", () => {
    expect(parseArgs(["--prepare", "--slug", "x"]).topN).toBe(15);
  });
});

describe("resolveRunDir", () => {
  let tmpBase: string;

  afterEach(() => {
    if (tmpBase) fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it("returns the most recent date dir that contains prepared.json, skipping dates without it", () => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "ig-competitor-research-rundir-"));
    const slugDir = path.join(tmpBase, "meu-slug");
    const older = path.join(slugDir, "2026-07-10");
    const newer = path.join(slugDir, "2026-07-15");
    const newestNoPrepared = path.join(slugDir, "2026-07-18");
    fs.mkdirSync(older, { recursive: true });
    fs.mkdirSync(newer, { recursive: true });
    fs.mkdirSync(newestNoPrepared, { recursive: true });
    fs.writeFileSync(path.join(older, "prepared.json"), "{}");
    fs.writeFileSync(path.join(newer, "prepared.json"), "{}");
    // newestNoPrepared intentionally has no prepared.json

    const resolved = resolveRunDir("meu-slug", tmpBase);
    expect(resolved).toBe(newer);
  });

  it("throws a clear PT-BR error when no prepared.json exists for the slug", () => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "ig-competitor-research-rundir-empty-"));
    expect(() => resolveRunDir("slug-inexistente", tmpBase)).toThrow(/prepared\.json/);
  });
});

describe("diffShortcodes", () => {
  it("detects missing analysis and orphan analysis", () => {
    const result = diffShortcodes(["abc", "def"], ["def", "xyz"]);
    expect(result.missingAnalysis).toEqual(["abc"]);
    expect(result.orphanAnalysis).toEqual(["xyz"]);
  });
});
