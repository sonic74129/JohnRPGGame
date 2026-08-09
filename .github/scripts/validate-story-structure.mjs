import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateContextContinuityPolicy } from "./context-continuity-policy.mjs";

const REQUIRED_ENFORCEMENT_FILES = [
  ".github/scripts/context-continuity-policy.mjs",
  ".github/scripts/validate-story-structure.mjs",
  ".github/workflows/ci.yml",
  "scripts/validate-context-continuity.mjs",
];

function parseStoryRoot(argv) {
  if (argv.length !== 2 || argv[0] !== "--story-root") {
    throw new Error("Usage: validate-story-structure.mjs --story-root <path>");
  }
  return path.resolve(argv[1]);
}

export async function validateStoryStructure(storyRoot) {
  const [
    foundationSkillContent,
    instructionsContent,
    packageContent,
    ...enforcementContents
  ] = await Promise.all([
    fs.readFile(
      path.join(
        storyRoot,
        ".foundation",
        "skills",
        "bible-story-game-builder",
        "SKILL.md",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(storyRoot, ".github", "copilot-instructions.md"),
      "utf8",
    ),
    fs.readFile(path.join(storyRoot, "package.json"), "utf8"),
    ...REQUIRED_ENFORCEMENT_FILES.map((relativePath) =>
      fs.readFile(path.join(storyRoot, relativePath), "utf8"),
    ),
  ]);
  for (const [index, content] of enforcementContents.entries()) {
    if (content.trim() === "") {
      throw new Error(
        `Required continuity enforcement file is empty: ${REQUIRED_ENFORCEMENT_FILES[index]}`,
      );
    }
  }
  const packageJson = JSON.parse(packageContent);
  if (
    packageJson.scripts?.["validate:continuity"] !==
    "node scripts/validate-context-continuity.mjs"
  ) {
    throw new Error(
      "package.json must retain the canonical validate:continuity command.",
    );
  }
  if (
    typeof packageJson.scripts?.test !== "string" ||
    !packageJson.scripts.test.startsWith("npm run validate:continuity &&")
  ) {
    throw new Error(
      "package.json test must run validate:continuity before repository tests.",
    );
  }
  validateContextContinuityPolicy({
    foundationSkillContent,
    instructionsContent,
  });
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await validateStoryStructure(parseStoryRoot(process.argv.slice(2)));
  console.log("Validated dependency-free story policy structure.");
}
