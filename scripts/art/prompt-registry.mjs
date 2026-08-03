import { readFile } from "node:fs/promises";
import path from "node:path";

export const LOCKED_BACKEND = Object.freeze({
  provider: "Azure AI Foundry",
  deployment: "mai-image-2-5-pro",
  model: "MAI-Image-2.5-Pro",
  modelVersion: "2026-06-19",
  modelId: "MAI-Image-2.5-Pro@2026-06-19",
  authentication: "Azure CLI / Entra ID",
});

export const REGISTRY_FILES = Object.freeze([
  "masters.json",
  "environment-interior.json",
  "environment-outdoor.json",
  "characters-core.json",
  "characters-supporting.json",
  "portraits.json",
]);

export const ALLOWED_FAMILIES = Object.freeze([
  "master",
  "environment",
  "character",
  "special-pose",
  "portrait",
]);

const ALLOWED_OUTPUTS = new Set(["reference", "source", "runtime"]);
const REQUIRED_ENTRY_KEYS = [
  "acceptance",
  "basePromptVersion",
  "candidateCount",
  "dependsOn",
  "family",
  "height",
  "id",
  "model",
  "output",
  "prompt",
  "promptVersion",
  "purpose",
  "runtime",
  "width",
].sort();
const OPTIONAL_ENTRY_KEYS = [
  "promptProfile",
  "requestHeight",
  "requestWidth",
  "transparentBackground",
].sort();
const PROMPT_PROFILES = new Set(["project", "moderation-safe-environment"]);

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const isVersion = (value) =>
  typeof value === "string" && /^v[1-9]\d*(?:\.[1-9]\d*)?$/.test(value);

const validateBackend = (style) => {
  assert(isObject(style), "style.json must contain an object.");
  assert(style.schemaVersion === "1.0.0", "Unsupported prompt schemaVersion.");
  assert(isVersion(style.registryVersion), "registryVersion must use vN format.");
  assert(isVersion(style.basePromptVersion), "basePromptVersion must use vN format.");
  assert(isObject(style.backend), "style.backend must be an object.");

  for (const [key, value] of Object.entries(LOCKED_BACKEND)) {
    assert(
      style.backend[key] === value,
      `Locked backend mismatch for backend.${key}.`,
    );
  }
};

const validateAcceptance = (acceptance, id) => {
  assert(isObject(acceptance), `${id}.acceptance must be an object.`);
  for (const key of ["machine", "visual"]) {
    assert(
      Array.isArray(acceptance[key]) &&
        acceptance[key].length > 0 &&
        acceptance[key].every(
          (item) => typeof item === "string" && item.trim().length > 0,
        ),
      `${id}.acceptance.${key} must contain non-empty checks.`,
    );
  }
};

const validateEntry = (entry, source, style) => {
  assert(isObject(entry), `${source} entries must be objects.`);
  const id = typeof entry.id === "string" ? entry.id : `${source}:unknown`;
  const entryKeys = Object.keys(entry).sort();
  const expectedKeys = [
    ...REQUIRED_ENTRY_KEYS,
    ...OPTIONAL_ENTRY_KEYS.filter((key) => entry[key] !== undefined),
  ].sort();
  assert(
    JSON.stringify(entryKeys) === JSON.stringify(expectedKeys),
    `${id} does not match the executable prompt schema.`,
  );
  assert(
    /^[a-z]+(?:[.-][a-z0-9]+)+$/.test(id),
    `${id}.id must use stable dot notation.`,
  );
  assert(ALLOWED_FAMILIES.includes(entry.family), `${id}.family is invalid.`);
  assert(
    typeof entry.purpose === "string" && entry.purpose.trim().length > 0,
    `${id}.purpose must be non-empty.`,
  );
  assert(typeof entry.runtime === "boolean", `${id}.runtime must be boolean.`);
  assert(
    entry.model === LOCKED_BACKEND.modelId,
    `${id}.model must be ${LOCKED_BACKEND.modelId}.`,
  );
  assert(
    Number.isInteger(entry.width) && entry.width > 0,
    `${id}.width must be a positive integer.`,
  );
  assert(
    Number.isInteger(entry.height) && entry.height > 0,
    `${id}.height must be a positive integer.`,
  );
  const hasRequestDimensions =
    entry.requestWidth !== undefined || entry.requestHeight !== undefined;
  if (hasRequestDimensions) {
    assert(
      Number.isInteger(entry.requestWidth) && entry.requestWidth > 0,
      `${id}.requestWidth must be a positive integer.`,
    );
    assert(
      Number.isInteger(entry.requestHeight) && entry.requestHeight > 0,
      `${id}.requestHeight must be a positive integer.`,
    );
    assert(
      entry.width * entry.requestHeight === entry.height * entry.requestWidth,
      `${id} request and output dimensions must have the same aspect ratio.`,
    );
    assert(
      entry.requestWidth <= entry.width && entry.requestHeight <= entry.height,
      `${id} request dimensions cannot exceed output dimensions.`,
    );
  }
  assert(
    entry.basePromptVersion === style.basePromptVersion,
    `${id}.basePromptVersion must match style.json.`,
  );
  assert(isVersion(entry.promptVersion), `${id}.promptVersion must use vN format.`);
  const promptProfile = entry.promptProfile ?? "project";
  assert(
    PROMPT_PROFILES.has(promptProfile),
    `${id}.promptProfile is invalid.`,
  );
  assert(
    typeof entry.prompt === "string" &&
      entry.prompt.trim().length > 0,
    `${id}.prompt must be non-empty.`,
  );
  if (promptProfile === "project") {
    assert(
      entry.prompt.startsWith(`${style.commonPrefix}\n\n`),
      `${id}.prompt must contain the locked common prefix.`,
    );
  }
  if (entry.transparentBackground !== undefined) {
    assert(
      entry.transparentBackground === true,
      `${id}.transparentBackground must be true when present.`,
    );
  }
  assert(
    entry.candidateCount === 2 || entry.candidateCount === 3,
    `${id}.candidateCount must be 2 or 3.`,
  );
  assert(
    Array.isArray(entry.dependsOn) &&
      entry.dependsOn.every((dependency) => typeof dependency === "string"),
    `${id}.dependsOn must be a string array.`,
  );
  assert(ALLOWED_OUTPUTS.has(entry.output), `${id}.output is invalid.`);
  validateAcceptance(entry.acceptance, id);
  return Object.freeze({ ...entry, source });
};

export const loadPromptRegistry = async ({ registryDirectory } = {}) => {
  const directory = registryDirectory ?? path.resolve("art/prompts");
  const style = JSON.parse(
    await readFile(path.join(directory, "style.json"), "utf8"),
  );
  validateBackend(style);

  const fileEntries = await Promise.all(
    REGISTRY_FILES.map(async (file) => {
      const value = JSON.parse(await readFile(path.join(directory, file), "utf8"));
      assert(Array.isArray(value), `${file} must contain an array.`);
      return value.map((entry) => validateEntry(entry, file, style));
    }),
  );
  const entries = fileEntries.flat();
  const ids = new Set();
  for (const entry of entries) {
    assert(!ids.has(entry.id), `Duplicate prompt ID: ${entry.id}.`);
    ids.add(entry.id);
  }
  for (const entry of entries) {
    for (const dependency of entry.dependsOn) {
      assert(ids.has(dependency), `${entry.id} has unknown dependency ${dependency}.`);
    }
  }

  return Object.freeze({
    style: Object.freeze(style),
    entries: Object.freeze(entries),
  });
};

export const selectPrompts = (entries, { family, assetId } = {}) => {
  assert(typeof family === "string", "Exactly one --family is required.");
  assert(ALLOWED_FAMILIES.includes(family), `Unknown family: ${family}.`);
  const familyEntries = entries.filter((entry) => entry.family === family);
  assert(familyEntries.length > 0, `No prompts found for family ${family}.`);

  if (assetId === undefined) {
    return familyEntries;
  }
  assert(typeof assetId === "string" && assetId.length > 0, "--asset needs an ID.");
  const entry = entries.find((candidate) => candidate.id === assetId);
  assert(entry, `Unknown asset ID: ${assetId}.`);
  assert(
    entry.family === family,
    `${assetId} belongs to family ${entry.family}, not ${family}.`,
  );
  return [entry];
};

export const parseGeneratorArgs = (args) => {
  const valueOptions = new Set([
    "--family",
    "--asset",
    "--mode",
    "--select",
    "--reason",
  ]);
  const flagOptions = new Set(["--dry-run", "--help"]);
  const values = new Map();
  const flags = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    assert(option.startsWith("--"), `Unexpected positional argument: ${option}.`);
    assert(
      valueOptions.has(option) || flagOptions.has(option),
      `Unknown option: ${option}.`,
    );
    assert(!values.has(option) && !flags.has(option), `Duplicate option: ${option}.`);
    if (flagOptions.has(option)) {
      flags.add(option);
      continue;
    }
    const value = args[index + 1];
    assert(value !== undefined && !value.startsWith("--"), `${option} needs a value.`);
    values.set(option, value);
    index += 1;
  }

  if (flags.has("--help")) {
    return { help: true };
  }

  const family = values.get("--family");
  assert(family !== undefined, "Exactly one --family is required.");
  assert(!family.includes(","), "Only one family may be selected per invocation.");
  const mode = values.get("--mode") ?? "start";
  assert(
    ["start", "resume", "regenerate"].includes(mode),
    "--mode must be start, resume, or regenerate.",
  );

  const selectValue = values.get("--select");
  const selectCandidate =
    selectValue === undefined ? undefined : Number.parseInt(selectValue, 10);
  if (selectValue !== undefined) {
    assert(
      String(selectCandidate) === selectValue && selectCandidate >= 1,
      "--select must be a positive candidate number.",
    );
    assert(values.has("--asset"), "--select requires --asset.");
    assert(values.has("--reason"), "--select requires --reason.");
    assert(!values.has("--mode"), "--select cannot be combined with --mode.");
    assert(!flags.has("--dry-run"), "--select cannot be combined with --dry-run.");
  } else {
    assert(!values.has("--reason"), "--reason requires --select.");
  }

  return {
    help: false,
    family,
    assetId: values.get("--asset"),
    mode,
    dryRun: flags.has("--dry-run"),
    selectCandidate,
    selectionReason: values.get("--reason"),
  };
};
