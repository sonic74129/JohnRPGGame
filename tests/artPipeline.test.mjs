import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  loadPromptRegistry,
  parseGeneratorArgs,
  selectPrompts,
} from "../scripts/art/prompt-registry.mjs";
import {
  approveCandidate,
  buildRunPaths,
  prepareGenerationRun,
  recordCandidateStarted,
  recordCandidateSuccess,
  repositoryPathToAbsolute,
} from "../scripts/art/pipeline-manifest.mjs";

const temporaryDirectories = [];

const temporaryDirectory = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "john-rpg-art-"));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("recoverable art registry", () => {
  it("merges the locked split registry and selects one family", async () => {
    const registry = await loadPromptRegistry();

    expect(registry.entries).toHaveLength(32);
    expect(selectPrompts(registry.entries, { family: "master" })).toHaveLength(3);
    expect(
      selectPrompts(registry.entries, {
        family: "portrait",
        assetId: "portrait.messenger",
      }).map((entry) => entry.id),
    ).toEqual(["portrait.messenger"]);
    expect(() =>
      selectPrompts(registry.entries, {
        family: "character",
        assetId: "portrait.messenger",
      }),
    ).toThrow(/belongs to family portrait/);
  });

  it("rejects cross-family and duplicate family invocations", () => {
    expect(() =>
      parseGeneratorArgs(["--family", "character,portrait"]),
    ).toThrow(/Only one family/);
    expect(() =>
      parseGeneratorArgs([
        "--family",
        "character",
        "--family",
        "portrait",
      ]),
    ).toThrow(/Duplicate option/);
  });

  it("locks portrait composition and character identity across emotion states", async () => {
    const registry = await loadPromptRegistry();
    const portraits = selectPrompts(registry.entries, { family: "portrait" });
    const identityLock = (entry) =>
      entry.prompt.match(/Identity lock: (.+)\n\nEmotion:/s)?.[1];

    expect(portraits).toHaveLength(12);
    for (const portrait of portraits) {
      expect(portrait.prompt).toContain(
        "one centered chest-up subject at eye level",
      );
      expect(portrait.prompt).toContain(
        "for a small map-visible dialogue window",
      );
      expect(identityLock(portrait)).toBeTruthy();
    }

    for (const character of ["martha", "mary", "jesus"]) {
      const states = portraits.filter((entry) =>
        entry.id.startsWith(`portrait.${character}-`),
      );
      expect(states).toHaveLength(3);
      expect(new Set(states.map(identityLock)).size).toBe(1);
    }
  });

  it("strictly rejects changed model and prompt versions", async () => {
    const sourceDirectory = path.resolve("art/prompts");
    const registryDirectory = await temporaryDirectory();
    const files = [
      "style.json",
      "masters.json",
      "environment-interior.json",
      "environment-outdoor.json",
      "characters-core.json",
      "characters-supporting.json",
      "portraits.json",
    ];
    await Promise.all(
      files.map(async (file) => {
        const value = JSON.parse(
          await readFile(path.join(sourceDirectory, file), "utf8"),
        );
        if (file === "masters.json") {
          value[0].model = "another-model";
          value[0].promptVersion = "latest";
        }
        await writeFile(
          path.join(registryDirectory, file),
          `${JSON.stringify(value)}\n`,
        );
      }),
    );

    await expect(loadPromptRegistry({ registryDirectory })).rejects.toThrow(
      /model must be MAI-Image-2.5-Pro@2026-06-19/,
    );
  });
});

describe("versioned generation manifests", () => {
  it("builds separate versioned candidate, source, runtime, and review paths", async () => {
    const registry = await loadPromptRegistry();
    const entry = registry.entries.find(
      (candidate) => candidate.id === "master.house-interior",
    );
    const paths = buildRunPaths("/repo", entry, 2);

    expect(paths.candidateDirectory).toBe(
      "production/art-pipeline/candidates/master/master__house-interior/v1/run-002",
    );
    expect(paths.selectedSource).toBe(
      "production/art-source/master/master__house-interior/v1/run-002-selected.png",
    );
    expect(paths.runtimeDirectory).toBe(
      "public/assets/art/master/master__house-interior/v1/run-002",
    );
    expect(paths.reviewContactSheet).toBe(
      "production/art-pipeline/review/master/master__house-interior/v1/run-002-contact-sheet.jpg",
    );
  });

  it("resumes from manifest state and rejects untracked candidate files", async () => {
    const repoRoot = await temporaryDirectory();
    const registry = await loadPromptRegistry();
    const entry = registry.entries.find(
      (candidate) => candidate.id === "character.messenger",
    );
    let manifest = await prepareGenerationRun({
      repoRoot,
      entry,
      registryVersion: registry.style.registryVersion,
      backend: registry.style.backend,
      mode: "start",
    });
    manifest = await recordCandidateStarted(repoRoot, manifest, 1);
    const firstOutput = repositoryPathToAbsolute(
      repoRoot,
      manifest.candidates[0].outputPath,
    );
    await writeFile(firstOutput, "candidate one");
    await recordCandidateSuccess(repoRoot, manifest, 1);

    const resumed = await prepareGenerationRun({
      repoRoot,
      entry,
      registryVersion: registry.style.registryVersion,
      backend: registry.style.backend,
      mode: "resume",
    });
    expect(resumed.recovery).toMatchObject({
      resumeCount: 1,
      lastCompletedCandidate: 1,
      nextCandidate: 2,
    });
    expect(resumed.candidates.map((candidate) => candidate.status)).toEqual([
      "generated",
      "pending",
    ]);

    const secondOutput = repositoryPathToAbsolute(
      repoRoot,
      resumed.candidates[1].outputPath,
    );
    await writeFile(secondOutput, "untracked candidate");
    await expect(
      prepareGenerationRun({
        repoRoot,
        entry,
        registryVersion: registry.style.registryVersion,
        backend: registry.style.backend,
        mode: "resume",
      }),
    ).rejects.toThrow(/Untracked candidate file/);
  });

  it("regenerates into a new run and protects approved results", async () => {
    const repoRoot = await temporaryDirectory();
    const registry = await loadPromptRegistry();
    const entry = registry.entries.find(
      (candidate) => candidate.id === "portrait.messenger",
    );
    let manifest = await prepareGenerationRun({
      repoRoot,
      entry,
      registryVersion: registry.style.registryVersion,
      backend: registry.style.backend,
      mode: "start",
    });
    for (const candidate of manifest.candidates) {
      manifest = await recordCandidateStarted(
        repoRoot,
        manifest,
        candidate.index,
      );
      const output = repositoryPathToAbsolute(
        repoRoot,
        candidate.outputPath,
      );
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, `candidate ${candidate.index}`);
      manifest = await recordCandidateSuccess(
        repoRoot,
        manifest,
        candidate.index,
      );
    }
    const approved = await approveCandidate({
      repoRoot,
      entry,
      registryVersion: registry.style.registryVersion,
      candidateIndex: 2,
      reason: "Best identity match.",
    });
    expect(approved.run.status).toBe("approved");
    expect(approved.selection.candidate).toBe(2);

    await expect(
      prepareGenerationRun({
        repoRoot,
        entry,
        registryVersion: registry.style.registryVersion,
        backend: registry.style.backend,
        mode: "regenerate",
      }),
    ).rejects.toThrow(/increment promptVersion/);
  });
});
