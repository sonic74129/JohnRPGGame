import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { validateWorkflowTrust } from "../.github/scripts/validate-story-structure.mjs";

const workflowPath = ".github/workflows/ci.yml";

describe("trusted-base workflow", () => {
  it("runs pinned dependency-free base code against pull request data", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    expect(() => validateWorkflowTrust(workflow)).not.toThrow();
  });

  it.each([
    [
      "head-owned validator",
      "node trusted-base/.github/scripts/validate-story-structure.mjs",
      "node story-data/.github/scripts/validate-story-structure.mjs",
    ],
    [
      "unpinned checkout",
      "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
      "actions/checkout@v4",
    ],
    [
      "dependency execution",
      "node trusted-base/.github/scripts/validate-story-structure.mjs \\",
      "npm test\n          node trusted-base/.github/scripts/validate-story-structure.mjs \\",
    ],
    [
      "secret access",
      "EXPECTED_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
      "TOKEN: ${{ secrets.UNTRUSTED_TOKEN }}",
    ],
    [
      "missing symbolic-link guard",
      "-type l -print -quit | grep -q .",
      "-type f -print -quit | grep -q .",
    ],
    [
      "missing head SHA guard",
      'test "$(git -C story-data rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"',
      'echo "$EXPECTED_HEAD_SHA"',
    ],
  ])("rejects %s", async (_name, original, replacement) => {
    const workflow = await readFile(workflowPath, "utf8");
    expect(workflow).toContain(original);
    expect(() =>
      validateWorkflowTrust(workflow.replace(original, replacement)),
    ).toThrow();
  });
});
