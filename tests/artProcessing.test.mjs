import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories = [];
const processScript = path.resolve("scripts/process-art.py");

const temporaryDirectory = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "john-rpg-process-"));
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

const runProcessor = (args) =>
  JSON.parse(
    execFileSync("python3", [processScript, ...args], {
      encoding: "utf8",
    }),
  );

const createManifest = async (repoRoot, family = "portrait") => {
  const manifestPath = path.join(
    repoRoot,
    "production/art-pipeline/manifests/portrait/portrait__messenger/v1/run-001.manifest.json",
  );
  const candidateDirectory =
    "production/art-pipeline/candidates/portrait/portrait__messenger/v1/run-001";
  const selectedSource =
    "production/art-source/portrait/portrait__messenger/v1/run-001-selected.png";
  const runtimeDirectory =
    "public/assets/art/portrait/portrait__messenger/v1/run-001";
  const reviewContactSheet =
    "production/art-pipeline/review/portrait/portrait__messenger/v1/run-001-contact-sheet.jpg";
  const candidatePaths = [1, 2].map(
    (index) => `${candidateDirectory}/candidate-0${index}.png`,
  );
  await Promise.all(
    [selectedSource, ...candidatePaths].map(async (relativePath) => {
      const absolutePath = path.join(repoRoot, relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, "placeholder");
    }),
  );
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      registryVersion: "v1",
      asset: {
        id: "portrait.messenger",
        family,
        promptVersion: "v1",
        candidateCount: 2,
      },
      run: { number: 1, status: "approved" },
      paths: {
        manifest:
          "production/art-pipeline/manifests/portrait/portrait__messenger/v1/run-001.manifest.json",
        candidateDirectory,
        selectedSource,
        runtimeDirectory,
        reviewContactSheet,
      },
      candidates: candidatePaths.map((outputPath, offset) => ({
        index: offset + 1,
        status: offset === 0 ? "selected" : "rejected",
        outputPath,
      })),
      selection: {
        candidate: 1,
        selectedSourcePath: selectedSource,
      },
    })}\n`,
  );
  return manifestPath;
};

describe("family processing profiles", () => {
  it(
    "covers all registry families with Lanczos defaults",
    () => {
      for (const family of [
        "master",
        "environment",
        "character",
        "special-pose",
        "portrait",
      ]) {
        const description = runProcessor(["--family", family, "--describe"]);
        expect(description.family).toBe(family);
        expect(description.default_resampling).toBe("lanczos");
        expect(description.selectedResampling).toBe("lanczos");
      }
    },
    15_000,
  );

  it("uses nearest-neighbor only when explicitly requested", () => {
    const description = runProcessor([
      "--family",
      "character",
      "--describe",
      "--resampling",
      "nearest",
    ]);
    expect(description.default_resampling).toBe("lanczos");
    expect(description.selectedResampling).toBe("nearest");
  });
});

describe("manifest processing plans", () => {
  it("plans approved runtime and bounded review outputs without opening images", async () => {
    const repoRoot = await temporaryDirectory();
    const manifestPath = await createManifest(repoRoot);
    const common = [
      "--family",
      "portrait",
      "--asset",
      "portrait.messenger",
      "--manifest",
      manifestPath,
      "--repo-root",
      repoRoot,
      "--plan",
    ];
    const runtime = runProcessor([...common, "--mode", "runtime"]);
    expect(runtime).toMatchObject({
      family: "portrait",
      assetId: "portrait.messenger",
      mode: "runtime",
      resampling: "lanczos",
    });
    expect(runtime.outputPaths[0]).toMatch(
      /public\/assets\/art\/portrait\/portrait__messenger\/v1\/run-001\/portrait__messenger\.png$/,
    );

    const review = runProcessor([...common, "--mode", "review"]);
    expect(review.review).toEqual({
      maxEdge: 1600,
      maxBytes: 921600,
    });
    expect(review.sourcePaths).toHaveLength(2);
  });

  it("refuses to overwrite an existing planned runtime output", async () => {
    const repoRoot = await temporaryDirectory();
    const manifestPath = await createManifest(repoRoot);
    const outputPath = path.join(
      repoRoot,
      "public/assets/art/portrait/portrait__messenger/v1/run-001/portrait__messenger.png",
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, "approved runtime");

    const result = spawnSync(
      "python3",
      [
        processScript,
        "--family",
        "portrait",
        "--manifest",
        manifestPath,
        "--repo-root",
        repoRoot,
        "--mode",
        "runtime",
        "--plan",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Refusing to overwrite existing processed output/);
  });
});
