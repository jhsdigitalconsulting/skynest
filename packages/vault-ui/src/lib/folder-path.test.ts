import { describe, it, expect } from "vitest";
import { resolveNewFolderPath } from "./folder-path";

describe("resolveNewFolderPath", () => {
  it("slugifies and joins under the parent", () => {
    expect(resolveNewFolderPath("nodes/knowledge", "Q4 Plans", [])).toEqual({
      ok: true,
      path: "nodes/knowledge/q4-plans",
    });
  });

  it("allows nested names and a root-level parent", () => {
    expect(resolveNewFolderPath("", "a/b", [])).toEqual({
      ok: true,
      path: "a/b",
    });
  });

  it("rejects empty, dot-segment and unsluggable names", () => {
    expect(resolveNewFolderPath("x", "  / ", []).ok).toBe(false);
    expect(resolveNewFolderPath("x", "../up", []).ok).toBe(false);
    expect(resolveNewFolderPath("x", "!!!", []).ok).toBe(false);
  });

  it("rejects a folder that already exists", () => {
    const r = resolveNewFolderPath("a", "b", ["a/b"]);
    expect(r.ok).toBe(false);
  });
});
