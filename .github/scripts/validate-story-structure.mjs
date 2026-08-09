import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateContextContinuityPolicy } from "./context-continuity-policy.mjs";

export const REQUIRED_ENFORCEMENT_FILES = [
  ".github/scripts/context-continuity-policy.mjs",
  ".github/scripts/validate-story-structure.mjs",
  ".github/workflows/ci.yml",
  "scripts/validate-context-continuity.mjs",
  "tests/contextContinuityPolicy.test.mjs",
  "tests/workflowTrust.test.mjs",
];

const CHECKOUT_ACTION =
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
const SETUP_NODE_ACTION =
  "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020";

function parseStoryRoot(argv) {
  if (argv.length !== 2 || argv[0] !== "--story-root") {
    throw new Error("Usage: validate-story-structure.mjs --story-root <path>");
  }
  return path.resolve(argv[1]);
}

function extractJob(workflow, jobName) {
  const marker = `  ${jobName}:`;
  const start = workflow.indexOf(marker);
  if (start === -1) {
    throw new Error(`CI workflow is missing ${jobName} job.`);
  }
  const remainder = workflow.slice(start + marker.length);
  const nextJob = remainder.search(/\n  [a-zA-Z0-9_-]+:\s*(?:\n|$)/u);
  return nextJob === -1
    ? workflow.slice(start)
    : workflow.slice(start, start + marker.length + nextJob);
}

function requireText(content, expected, message) {
  if (!content.includes(expected)) {
    throw new Error(message);
  }
}

export function validateWorkflowTrust(workflow) {
  if (!/^\s{2}pull_request_target:\s*$/mu.test(workflow)) {
    throw new Error("CI workflow must retain pull_request_target enforcement.");
  }
  if (!/^permissions: \{\}\s*$/mu.test(workflow)) {
    throw new Error("CI workflow must deny permissions by default.");
  }

  const staticJob = extractJob(workflow, "validate-pr-static");
  requireText(
    staticJob,
    "if: github.event_name == 'pull_request_target'",
    "Trusted-base job must run only for pull_request_target.",
  );
  requireText(
    staticJob,
    "permissions:\n      contents: read",
    "Trusted-base job must grant only contents: read.",
  );
  requireText(
    staticJob,
    `uses: ${CHECKOUT_ACTION}`,
    "Trusted-base job must pin actions/checkout.",
  );
  requireText(
    staticJob,
    `uses: ${SETUP_NODE_ACTION}`,
    "Trusted-base job must pin actions/setup-node.",
  );
  for (const expected of [
    "ref: ${{ github.event.pull_request.base.sha }}",
    "path: trusted-base",
    "ref: ${{ github.event.pull_request.head.sha }}",
    "path: story-data",
    "EXPECTED_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}",
    'test "$(git -C trusted-base rev-parse HEAD)" = "$EXPECTED_BASE_SHA"',
    'test "$(git -C story-data rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"',
    "'http\\..*\\.extraheader|credential\\.'",
    "find story-data -path story-data/.git -prune -o \\",
    "-type l -print -quit | grep -q .",
    "node trusted-base/.github/scripts/validate-story-structure.mjs \\",
    "--story-root story-data",
  ]) {
    requireText(
      staticJob,
      expected,
      `Trusted-base job is missing required guard: ${expected}`,
    );
  }
  if ((staticJob.match(/persist-credentials: false/gu) ?? []).length !== 2) {
    throw new Error(
      "Trusted-base job must disable persisted credentials for both checkouts.",
    );
  }
  if (/\$\{\{\s*secrets\./u.test(staticJob)) {
    throw new Error("Trusted-base job must not access secrets.");
  }
  if (/\bnpm(?:\s|$)/mu.test(staticJob)) {
    throw new Error("Trusted-base job must remain dependency-free.");
  }
  const actions = [...staticJob.matchAll(/^\s+uses:\s+([^\s]+)$/gmu)];
  if (actions.length !== 3) {
    throw new Error("Trusted-base job must contain exactly three pinned actions.");
  }
  for (const [, action] of actions) {
    if (!/^[^@\s]+@[0-9a-f]{40}$/u.test(action)) {
      throw new Error(`Trusted-base job action is not commit-pinned: ${action}`);
    }
  }

  const validateJob = extractJob(workflow, "validate");
  for (const expected of [
    "if: github.event_name != 'pull_request_target'",
    "npm ci",
    "npm test",
    "npm run build",
  ]) {
    requireText(
      validateJob,
      expected,
      `Normal validation job is missing: ${expected}`,
    );
  }
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
  if (packageJson.scripts?.test !== "npm run validate:continuity && vitest run") {
    throw new Error(
      "package.json test must run validate:continuity before repository tests.",
    );
  }

  validateContextContinuityPolicy({
    foundationSkillContent,
    instructionsContent,
  });
  validateWorkflowTrust(
    enforcementContents[REQUIRED_ENFORCEMENT_FILES.indexOf(".github/workflows/ci.yml")],
  );
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await validateStoryStructure(parseStoryRoot(process.argv.slice(2)));
  console.log("Validated dependency-free story policy structure.");
}
