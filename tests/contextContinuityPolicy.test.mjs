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
  BEGIN_MARKER,
  CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1,
  END_MARKER,
  extractCanonicalContextContinuityBlockFromSkill,
  extractContextContinuityBlockFromInstructions,
  validateContextContinuityPolicy,
} from "../.github/scripts/context-continuity-policy.mjs";
import {
  REQUIRED_ENFORCEMENT_FILES,
  validateStoryStructure,
} from "../.github/scripts/validate-story-structure.mjs";

const repositoryRoot = process.cwd();
const temporaryDirectories = [];

async function createStructuralFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "john-rpg-continuity-"));
  temporaryDirectories.push(root);
  const copiedFiles = await Promise.all(
    REQUIRED_ENFORCEMENT_FILES.map(async (relativePath) => [
      relativePath,
      await readFile(path.join(repositoryRoot, relativePath), "utf8"),
    ]),
  );
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
    ...Object.fromEntries(copiedFiles),
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

  it("rejects a divergent local skill or instruction block", () => {
    const divergent = CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1.replace(
      "Policy version: 1.",
      "Policy version: 999.",
    );
    expect(() =>
      validateContextContinuityPolicy({
        foundationSkillContent: divergent,
        instructionsContent: divergent,
      }),
    ).toThrow(/not canonical v1/u);
    expect(() =>
      validateContextContinuityPolicy({
        foundationSkillContent: CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1,
        instructionsContent: divergent,
      }),
    ).toThrow(/does not match local Foundation skill block/u);
  });

  it("rejects duplicate or out-of-order policy markers", () => {
    expect(() =>
      extractCanonicalContextContinuityBlockFromSkill(
        `${CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1}\n${BEGIN_MARKER}`,
      ),
    ).toThrow(/exactly once/u);
    expect(() =>
      extractContextContinuityBlockFromInstructions(
        `${END_MARKER}\n${CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1.replace(END_MARKER, "")}`,
      ),
    ).toThrow(/invalid continuity marker ordering/u);
  });

  it("rejects deleted policy and enforcement files", async () => {
    const policyDeletedRoot = await createStructuralFixture();
    await writeFile(
      path.join(policyDeletedRoot, ".github", "copilot-instructions.md"),
      "# Policy deleted\n",
    );
    await expect(validateStoryStructure(policyDeletedRoot)).rejects.toThrow(
      /FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN/u,
    );

    const checkerDeletedRoot = await createStructuralFixture();
    await unlink(
      path.join(
        checkerDeletedRoot,
        ".github",
        "scripts",
        "context-continuity-policy.mjs",
      ),
    );
    await expect(validateStoryStructure(checkerDeletedRoot)).rejects.toThrow(
      /context-continuity-policy\.mjs/u,
    );
  });

  it("rejects broken package test wiring", async () => {
    const root = await createStructuralFixture();
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        scripts: {
          test: "vitest run",
          "validate:continuity":
            "node scripts/validate-context-continuity.mjs",
        },
      }),
    );
    await expect(validateStoryStructure(root)).rejects.toThrow(
      /must run validate:continuity/u,
    );
  });
});
