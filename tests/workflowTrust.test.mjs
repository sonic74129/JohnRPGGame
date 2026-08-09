import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("trusted-base workflow", () => {
  it("runs pinned trusted code against the pull request checkout as data", async () => {
    const workflow = await fs.readFile(
      path.join(root, ".github", "workflows", "ci.yml"),
      "utf8",
    );
    const staticJobStart = workflow.indexOf("  validate-pr-static:");
    const nextJobStart = workflow.indexOf("\n  validate:", staticJobStart);
    const staticJob = workflow.slice(staticJobStart, nextJobStart);

    expect(workflow).toMatch(/^\s{2}pull_request_target:/mu);
    expect(workflow).toMatch(/^permissions: \{\}$/mu);
    expect(staticJob).toContain("ref: ${{ github.event.pull_request.base.sha }}");
    expect(staticJob).toContain("path: trusted-base");
    expect(staticJob).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(staticJob).toContain("path: story-data");
    expect(staticJob).toMatch(
      /node trusted-base\/\.github\/scripts\/validate-story-structure\.mjs \\\n\s+--story-root story-data/u,
    );
    expect(staticJob).not.toMatch(/\bnpm\b/u);
    for (const match of staticJob.matchAll(/^\s+uses:\s+([^\s]+)$/gmu)) {
      expect(match[1]).toMatch(/^[^@\s]+@[0-9a-f]{40}$/u);
    }
  });
});
