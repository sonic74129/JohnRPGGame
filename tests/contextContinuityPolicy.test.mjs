import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1,
  END_MARKER,
  extractCanonicalContextContinuityBlockFromSkill,
  extractContextContinuityBlockFromInstructions,
  validateContextContinuityPolicy,
} from "../.github/scripts/context-continuity-policy.mjs";
import { validateStoryStructure } from "../.github/scripts/validate-story-structure.mjs";

const temporaryDirectories = [];
const enforcementFiles = [
  ".github/scripts/context-continuity-policy.mjs",
  ".github/scripts/validate-story-structure.mjs",
  ".github/workflows/ci.yml",
  "scripts/validate-context-continuity.mjs",
];

async function createStructuralFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "john-rpg-continuity-"));
  temporaryDirectories.push(root);
  const files = {
    ".foundation/skills/bible-story-game-builder/SKILL.md":
      CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1,
    ".github/copilot-instructions.md":
      CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1,
    "package.json": JSON.stringify({
      scripts: {
        test: "npm run validate:continuity && vitest run",
        "validate:continuity":
          "node scripts/validate-context-continuity.mjs",
      },
    }),
    ...Object.fromEntries(
      enforcementFiles.map((relativePath) => [relativePath, "// retained\n"]),
    ),
  };
  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const target = path.join(root, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }),
  );
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("canonical context continuity policy", () => {
  it("matches Foundation v1 byte-for-byte in both repository documents", async () => {
    const [foundationSkillContent, instructionsContent] = await Promise.all([
      readFile(
        ".foundation/skills/bible-story-game-builder/SKILL.md",
        "utf8",
      ),
      readFile(".github/copilot-instructions.md", "utf8"),
    ]);

    expect(
      extractCanonicalContextContinuityBlockFromSkill(foundationSkillContent),
    ).toBe(CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1);
    expect(
      extractContextContinuityBlockFromInstructions(instructionsContent),
    ).toBe(CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1);
    expect(() =>
      validateContextContinuityPolicy({
        foundationSkillContent,
        instructionsContent,
      }),
    ).not.toThrow();
  });

  it("fails when the instruction block diverges", () => {
    expect(() =>
      validateContextContinuityPolicy({
        foundationSkillContent: CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1,
        instructionsContent: CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1.replace(
          "Policy version: 1.",
          "Policy version: 999.",
        ),
      }),
    ).toThrow(/does not match local Foundation skill block/u);
  });

  it("fails when an end marker appears before the canonical block", () => {
    expect(() =>
      extractContextContinuityBlockFromInstructions(
        `${END_MARKER}\n${CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1}`,
      ),
    ).toThrow(/invalid continuity marker ordering/u);
  });

  it("fails dependency-free structural validation when policy is deleted", async () => {
    const root = await createStructuralFixture();
    await writeFile(
      path.join(root, ".github", "copilot-instructions.md"),
      "# Policy deleted\n",
    );

    await expect(validateStoryStructure(root)).rejects.toThrow(
      /FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN/u,
    );
  });

  it("fails dependency-free structural validation when a checker is deleted", async () => {
    const root = await createStructuralFixture();
    await unlink(
      path.join(root, ".github", "scripts", "context-continuity-policy.mjs"),
    );

    await expect(validateStoryStructure(root)).rejects.toThrow(
      /context-continuity-policy\.mjs/u,
    );
  });

  it("keeps the PR trust check on base-owned code and head data", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("pull_request_target:");
    expect(workflow).toContain("ref: ${{ github.event.pull_request.base.sha }}");
    expect(workflow).toContain("path: trusted-base");
    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(workflow).toContain("path: story-data");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain(
      "node trusted-base/.github/scripts/validate-story-structure.mjs",
    );
  });
});
