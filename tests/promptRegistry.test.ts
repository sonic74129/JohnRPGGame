import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REGISTRY_FILES = [
  "masters.json",
  "environment-interior.json",
  "environment-outdoor.json",
  "characters-core.json",
  "characters-supporting.json",
  "portraits.json",
] as const;

const REQUIRED_KEYS = [
  "id",
  "family",
  "purpose",
  "runtime",
  "model",
  "width",
  "height",
  "basePromptVersion",
  "promptVersion",
  "prompt",
  "acceptance",
  "candidateCount",
  "dependsOn",
  "output",
] as const;
const OPTIONAL_KEYS = ["requestWidth", "requestHeight"] as const;

const ALLOWED_FAMILIES = new Set([
  "master",
  "environment",
  "character",
  "special-pose",
  "portrait",
]);
const ALLOWED_OUTPUTS = new Set(["reference", "source", "runtime"]);
const LOCKED_MODEL = "MAI-Image-2.5-Pro@2026-06-19";
const EXPECTED_PROMPT_COUNT = 33;

type JsonObject = Record<string, unknown>;

interface Acceptance {
  machine: string[];
  visual: string[];
}

interface PromptEntry {
  id: string;
  family: string;
  purpose: string;
  runtime: boolean;
  model: string;
  width: number;
  height: number;
  requestWidth?: number;
  requestHeight?: number;
  basePromptVersion: string;
  promptVersion: string;
  prompt: string;
  acceptance: Acceptance;
  candidateCount: number;
  dependsOn: string[];
  output: string;
}

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(path), "utf8")) as unknown;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isNonEmptyString);

const parseAcceptance = (value: unknown, id: string): Acceptance => {
  expect(isObject(value), `${id}.acceptance must be an object`).toBe(true);
  const acceptance = value as JsonObject;
  expect(
    isStringArray(acceptance.machine) && acceptance.machine.length > 0,
    `${id}.acceptance.machine must contain checks`,
  ).toBe(true);
  expect(
    isStringArray(acceptance.visual) && acceptance.visual.length > 0,
    `${id}.acceptance.visual must contain checks`,
  ).toBe(true);
  return acceptance as unknown as Acceptance;
};

const parsePromptEntry = (value: unknown, source: string): PromptEntry => {
  expect(isObject(value), `${source} entries must be objects`).toBe(true);
  const entry = value as JsonObject;
  const id = isNonEmptyString(entry.id) ? entry.id : `${source}:unknown`;

  const hasRequestDimensions =
    entry.requestWidth !== undefined || entry.requestHeight !== undefined;
  expect(Object.keys(entry).sort(), `${id} must use the executable schema`).toEqual(
    [
      ...REQUIRED_KEYS,
      ...(hasRequestDimensions ? OPTIONAL_KEYS : []),
    ].sort(),
  );
  expect(entry.id, `${id}.id must be stable dot notation`).toMatch(
    /^[a-z]+(?:[.-][a-z0-9]+)+$/,
  );
  expect(ALLOWED_FAMILIES.has(entry.family as string), `${id}.family`).toBe(
    true,
  );
  expect(isNonEmptyString(entry.purpose), `${id}.purpose`).toBe(true);
  expect(typeof entry.runtime, `${id}.runtime`).toBe("boolean");
  expect(entry.model, `${id}.model`).toBe(LOCKED_MODEL);
  expect(Number.isInteger(entry.width) && Number(entry.width) > 0, `${id}.width`).toBe(
    true,
  );
  expect(
    Number.isInteger(entry.height) && Number(entry.height) > 0,
    `${id}.height`,
  ).toBe(true);
  if (hasRequestDimensions) {
    expect(Number.isInteger(entry.requestWidth), `${id}.requestWidth`).toBe(true);
    expect(Number.isInteger(entry.requestHeight), `${id}.requestHeight`).toBe(true);
    expect(
      Number(entry.width) * Number(entry.requestHeight),
      `${id} request aspect ratio`,
    ).toBe(Number(entry.height) * Number(entry.requestWidth));
  }
  expect(entry.basePromptVersion, `${id}.basePromptVersion`).toMatch(/^v\d+$/);
  expect(entry.promptVersion, `${id}.promptVersion`).toMatch(/^v\d+$/);
  expect(isNonEmptyString(entry.prompt), `${id}.prompt`).toBe(true);
  expect([2, 3], `${id}.candidateCount`).toContain(entry.candidateCount);
  expect(isStringArray(entry.dependsOn), `${id}.dependsOn`).toBe(true);
  expect(ALLOWED_OUTPUTS.has(entry.output as string), `${id}.output`).toBe(true);

  const acceptance = parseAcceptance(entry.acceptance, id);
  if (entry.runtime === true) {
    expect(entry.model).toBe(LOCKED_MODEL);
    expect(entry.basePromptVersion).toMatch(/^v\d+$/);
    expect(entry.promptVersion).toMatch(/^v\d+$/);
    expect(acceptance.machine.length).toBeGreaterThan(0);
    expect(acceptance.visual.length).toBeGreaterThan(0);
  }

  return entry as unknown as PromptEntry;
};

const style = readJson("art/prompts/style.json") as JsonObject;
const entries = REGISTRY_FILES.flatMap((file) => {
  const value = readJson(`art/prompts/${file}`);
  expect(Array.isArray(value), `${file} must contain an array`).toBe(true);
  return (value as unknown[]).map((entry) => parsePromptEntry(entry, file));
});

describe("MAI prompt registry", () => {
  it("locks the approved Foundry backend and retires the monolithic list", () => {
    expect(isObject(style.backend)).toBe(true);
    const backend = style.backend as JsonObject;
    expect(backend.provider).toBe("Azure AI Foundry");
    expect(backend.deployment).toBe("mai-image-2-5-pro");
    expect(backend.model).toBe("MAI-Image-2.5-Pro");
    expect(backend.modelVersion).toBe("2026-06-19");
    expect(backend.modelId).toBe(LOCKED_MODEL);
    expect(backend.authentication).toBe("Azure CLI / Entra ID");

    const legacy = readJson("art/prompts.json") as JsonObject;
    expect(legacy.status).toBe("retired");
    expect(legacy).not.toHaveProperty("prompt");
    expect(legacy).not.toBeInstanceOf(Array);
  });

  it("validates the executable schema and complete direct-use prompts", () => {
    expect(entries).toHaveLength(EXPECTED_PROMPT_COUNT);
    expect(isNonEmptyString(style.commonPrefix)).toBe(true);
    const commonPrefix = style.commonPrefix as string;

    for (const entry of entries) {
      expect(entry.prompt.startsWith(`${commonPrefix}\n\n`), entry.id).toBe(true);
      expect(entry.prompt.length, entry.id).toBeGreaterThan(commonPrefix.length);
      expect(entry.prompt, entry.id).not.toMatch(/\b(?:TODO|TBD)\b/i);
    }
  });

  it("keeps IDs unique, dependencies closed and candidate batches bounded", () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    const idSet = new Set(ids);
    const unresolved = entries.flatMap((entry) =>
      entry.dependsOn
        .filter((dependency) => !idSet.has(dependency))
        .map((dependency) => `${entry.id} -> ${dependency}`),
    );
    expect(unresolved).toEqual([]);
    expect(entries.every((entry) => [2, 3].includes(entry.candidateCount))).toBe(
      true,
    );
  });

  it("contains no story-illustration family or retired generation entry", () => {
    const retiredGroups = style.retiredGenerationPlans;
    expect(Array.isArray(retiredGroups)).toBe(true);
    const retiredIds = (retiredGroups as JsonObject[]).flatMap((group) => {
      expect(isStringArray(group.ids)).toBe(true);
      return group.ids as string[];
    });

    expect(retiredIds).toEqual(
      expect.arrayContaining([
        "opening-sickroom",
        "journey-to-jesus",
        "bethany-village",
        "tomb-garden",
        "story-martha-meets-jesus",
        "story-jesus-weeps",
        "story-lazarus-comes-out",
        "story-ending-reflection",
        "map-road-to-jesus-clean",
        "map-village-edge-clean",
        "map-road-to-tomb-clean",
        "map-tomb-clean",
      ]),
    );
    expect(
      entries.some((entry) => /story|illustration/i.test(entry.family)),
    ).toBe(false);
    expect(entries.some((entry) => retiredIds.includes(entry.id))).toBe(false);
  });

  it("freezes the unified world map prompt to the approved profile-B contract", () => {
    const worldMap = entries.find((entry) => entry.id === "environment.world-map");
    expect(worldMap).toMatchObject({
      family: "environment",
      runtime: true,
      model: LOCKED_MODEL,
      width: 2720,
      height: 1536,
      requestWidth: 1360,
      requestHeight: 768,
      basePromptVersion: "v1",
      promptVersion: "v1",
      candidateCount: 3,
      output: "source",
    });
    expect(worldMap?.prompt).toContain(
      "Martha's house is approximately 400 pixels wide and 250 pixels high.",
    );
    expect(worldMap?.prompt).toContain(
      "Village houses are 260-340 pixels wide and 215-235 pixels high.",
    );
    expect(worldMap?.prompt).toContain(
      "Assume approved runtime people are 90 pixels tall.",
    );
    expect(worldMap?.prompt).toContain(
      "Sunlight comes from upper left; soft shadows fall consistently toward lower right.",
    );
    expect(worldMap?.prompt).toContain("No repeated 128-pixel tile pattern.");
    expect(worldMap?.prompt).not.toMatch(/\[[^\]]+\]/);
  });

  it("records the mandatory single-variable v2+ revision rule", () => {
    expect(isObject(style.iterationRule)).toBe(true);
    const iterationRule = style.iterationRule as JsonObject;
    expect(iterationRule.versioning).toMatch(
      /v2\+ revision changes exactly one observed defect/i,
    );
    expect(iterationRule.template).toMatch(/Revision target:/);
    expect(iterationRule.template).toMatch(/Change only:/);
    expect(iterationRule.template).toMatch(/Keep unchanged:/);
    expect(iterationRule.template).toMatch(/Acceptance:/);
  });
});
