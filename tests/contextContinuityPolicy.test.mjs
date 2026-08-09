import { promises as fs } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertContextContinuityPolicyParity,
  extractCanonicalContextContinuityBlockFromSkill,
  extractContextContinuityBlockFromInstructions,
} from "../.github/scripts/context-continuity-policy.mjs";
import { validateStoryStructure } from "../.github/scripts/validate-story-structure.mjs";

const canonicalBlock = `<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN -->
### Canonical context continuity policy

Policy version: 1.
<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_END -->`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("context continuity policy", () => {
  it("extracts identical marked blocks from the skill and instructions", () => {
    expect(
      extractCanonicalContextContinuityBlockFromSkill(
        `# Foundation skill\n\n${canonicalBlock}\n`,
      ),
    ).toBe(canonicalBlock);
    expect(
      extractContextContinuityBlockFromInstructions(
        `# Instructions\n\n${canonicalBlock}\n`,
      ),
    ).toBe(canonicalBlock);
  });

  it("rejects changed, missing, and duplicated instruction blocks", () => {
    expect(() =>
      assertContextContinuityPolicyParity({
        canonicalBlock,
        instructionsContent: canonicalBlock.replace("version: 1", "version: 2"),
      }),
    ).toThrow(/does not match Foundation canonical block/u);
    expect(() =>
      extractContextContinuityBlockFromInstructions("# Instructions\n"),
    ).toThrow(/FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN/u);
    expect(() =>
      extractContextContinuityBlockFromInstructions(
        `${canonicalBlock}\n${canonicalBlock}\n`,
      ),
    ).toThrow(/exactly once/u);
  });

  it("uses the trusted base to reject matching edits to both story copies", async () => {
    const storyRoot = await mkdtemp(path.join(tmpdir(), "johnrpg-continuity-"));
    temporaryDirectories.push(storyRoot);
    const skillPath = path.join(
      storyRoot,
      ".foundation",
      "skills",
      "bible-story-game-builder",
      "SKILL.md",
    );
    const instructionsPath = path.join(
      storyRoot,
      ".github",
      "copilot-instructions.md",
    );
    await Promise.all([
      fs.mkdir(path.dirname(skillPath), { recursive: true }),
      fs.mkdir(path.dirname(instructionsPath), { recursive: true }),
    ]);
    const [skillContent, instructionsContent] = await Promise.all([
      fs.readFile(
        path.join(
          root,
          ".foundation",
          "skills",
          "bible-story-game-builder",
          "SKILL.md",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(root, ".github", "copilot-instructions.md"),
        "utf8",
      ),
    ]);
    await Promise.all([
      fs.writeFile(skillPath, skillContent),
      fs.writeFile(instructionsPath, instructionsContent),
    ]);

    await expect(validateStoryStructure(storyRoot)).resolves.toBeUndefined();

    const changedSkill = skillContent.replace(
      "Policy version: 1.",
      "Policy version: 2.",
    );
    const changedInstructions = instructionsContent.replace(
      "Policy version: 1.",
      "Policy version: 2.",
    );
    await Promise.all([
      fs.writeFile(skillPath, changedSkill),
      fs.writeFile(instructionsPath, changedInstructions),
    ]);
    await expect(validateStoryStructure(storyRoot)).rejects.toThrow(
      /does not match trusted canonical block/u,
    );
  });
});
