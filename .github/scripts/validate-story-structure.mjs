import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateTrustedContextContinuityPolicy } from "./context-continuity-policy.mjs";

const trustedRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const foundationSkillPath = path.join(
  ".foundation",
  "skills",
  "bible-story-game-builder",
  "SKILL.md",
);

export async function validateStoryStructure(storyRoot) {
  const resolvedStoryRoot = path.resolve(storyRoot);
  const [
    trustedFoundationSkillContent,
    storyFoundationSkillContent,
    instructionsContent,
  ] = await Promise.all([
    fs.readFile(path.join(trustedRoot, foundationSkillPath), "utf8"),
    fs.readFile(path.join(resolvedStoryRoot, foundationSkillPath), "utf8"),
    fs.readFile(
      path.join(resolvedStoryRoot, ".github", "copilot-instructions.md"),
      "utf8",
    ),
  ]);

  validateTrustedContextContinuityPolicy({
    trustedFoundationSkillContent,
    storyFoundationSkillContent,
    instructionsContent,
  });
}

function parseStoryRoot(args) {
  if (args.length !== 2 || args[0] !== "--story-root" || !args[1]) {
    throw new Error(
      "Usage: node .github/scripts/validate-story-structure.mjs --story-root <path>",
    );
  }
  return args[1];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await validateStoryStructure(parseStoryRoot(process.argv.slice(2)));
    console.log("Story structure matches the trusted continuity policy.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
