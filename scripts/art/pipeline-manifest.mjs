import { randomUUID } from "node:crypto";
import {
  constants as fsConstants,
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export const MANIFEST_SCHEMA_VERSION = "1.0.0";

const isNotFound = (error) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const exists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
};

const toRepositoryPath = (repoRoot, absolutePath) =>
  path.relative(repoRoot, absolutePath).split(path.sep).join("/");

const fromRepositoryPath = (repoRoot, repositoryPath) =>
  path.resolve(repoRoot, repositoryPath);

const assetDirectoryName = (assetId) => assetId.replaceAll(".", "__");
const runId = (runNumber) => `run-${String(runNumber).padStart(3, "0")}`;
const candidateName = (index) =>
  `candidate-${String(index).padStart(2, "0")}.png`;

export const buildRunPaths = (repoRoot, entry, runNumber) => {
  const asset = assetDirectoryName(entry.id);
  const versionParts = [entry.family, asset, entry.promptVersion];
  const id = runId(runNumber);
  const candidateDirectory = path.join(
    repoRoot,
    "production",
    "art-pipeline",
    "candidates",
    ...versionParts,
    id,
  );
  const manifest = path.join(
    repoRoot,
    "production",
    "art-pipeline",
    "manifests",
    ...versionParts,
    `${id}.manifest.json`,
  );
  const selectedSource = path.join(
    repoRoot,
    "production",
    "art-source",
    ...versionParts,
    `${id}-selected.png`,
  );
  const runtimeDirectory = path.join(
    repoRoot,
    "public",
    "assets",
    "art",
    ...versionParts,
    id,
  );
  const reviewContactSheet = path.join(
    repoRoot,
    "production",
    "art-pipeline",
    "review",
    ...versionParts,
    `${id}-contact-sheet.jpg`,
  );

  return {
    manifest: toRepositoryPath(repoRoot, manifest),
    candidateDirectory: toRepositoryPath(repoRoot, candidateDirectory),
    selectedSource: toRepositoryPath(repoRoot, selectedSource),
    runtimeDirectory: toRepositoryPath(repoRoot, runtimeDirectory),
    reviewContactSheet: toRepositoryPath(repoRoot, reviewContactSheet),
  };
};

const manifestDirectory = (repoRoot, entry) =>
  path.join(
    repoRoot,
    "production",
    "art-pipeline",
    "manifests",
    entry.family,
    assetDirectoryName(entry.id),
    entry.promptVersion,
  );

export const listRunManifests = async (repoRoot, entry) => {
  let names;
  try {
    names = await readdir(manifestDirectory(repoRoot, entry));
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  }
  return names
    .filter((name) => /^run-\d{3}\.manifest\.json$/.test(name))
    .sort()
    .map((name) => path.join(manifestDirectory(repoRoot, entry), name));
};

export const readManifest = async (manifestPath) =>
  JSON.parse(await readFile(manifestPath, "utf8"));

const writeManifest = async (repoRoot, manifest) => {
  const manifestPath = fromRepositoryPath(repoRoot, manifest.paths.manifest);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const temporaryPath = `${manifestPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  await rename(temporaryPath, manifestPath);
};

const timestamp = (now) => (now ?? new Date()).toISOString();

const updateRecoveryPoint = (manifest) => {
  const completed = manifest.candidates
    .filter((candidate) =>
      ["generated", "selected", "rejected"].includes(candidate.status),
    )
    .map((candidate) => candidate.index);
  const next = manifest.candidates.find((candidate) =>
    ["pending", "failed", "generating"].includes(candidate.status),
  );
  manifest.recovery.lastCompletedCandidate =
    completed.length === 0 ? null : Math.max(...completed);
  manifest.recovery.nextCandidate = next?.index ?? null;
};

const assertManifestIdentity = (manifest, entry, registryVersion, expectedPaths) => {
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(`Unsupported manifest schema for ${entry.id}.`);
  }
  if (manifest.registryVersion !== registryVersion) {
    throw new Error(`Registry version changed for ${entry.id}; regenerate explicitly.`);
  }
  const expectedAsset = {
    id: entry.id,
    family: entry.family,
    model: entry.model,
    basePromptVersion: entry.basePromptVersion,
    promptVersion: entry.promptVersion,
    candidateCount: entry.candidateCount,
  };
  for (const [key, value] of Object.entries(expectedAsset)) {
    if (manifest.asset?.[key] !== value) {
      throw new Error(`Manifest identity mismatch for ${entry.id}.${key}.`);
    }
  }
  if (JSON.stringify(manifest.paths) !== JSON.stringify(expectedPaths)) {
    throw new Error(`Manifest output paths changed for ${entry.id}.`);
  }
};

const createManifest = async ({
  repoRoot,
  entry,
  registryVersion,
  backend,
  runNumber,
  mode,
  now,
}) => {
  const createdAt = timestamp(now);
  const paths = buildRunPaths(repoRoot, entry, runNumber);
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    registryVersion,
    backend: {
      provider: backend.provider,
      deployment: backend.deployment,
      modelId: backend.modelId,
    },
    asset: {
      id: entry.id,
      family: entry.family,
      purpose: entry.purpose,
      runtime: entry.runtime,
      output: entry.output,
      width: entry.width,
      height: entry.height,
      model: entry.model,
      basePromptVersion: entry.basePromptVersion,
      promptVersion: entry.promptVersion,
      candidateCount: entry.candidateCount,
      dependsOn: [...entry.dependsOn],
    },
    run: {
      number: runNumber,
      id: runId(runNumber),
      mode,
      status: "ready",
      createdAt,
      updatedAt: createdAt,
    },
    paths,
    candidates: Array.from({ length: entry.candidateCount }, (_, offset) => ({
      index: offset + 1,
      status: "pending",
      attempts: 0,
      outputPath: `${paths.candidateDirectory}/${candidateName(offset + 1)}`,
      generatedAt: null,
      lastFailure: null,
      failures: [],
    })),
    selection: null,
    recovery: {
      resumeCount: 0,
      lastCompletedCandidate: null,
      nextCandidate: 1,
    },
  };
  await mkdir(fromRepositoryPath(repoRoot, paths.candidateDirectory), {
    recursive: true,
  });
  await writeManifest(repoRoot, manifest);
  return manifest;
};

const resumeManifest = async ({
  repoRoot,
  entry,
  registryVersion,
  manifestPath,
  now,
}) => {
  const manifest = await readManifest(manifestPath);
  const expectedPaths = buildRunPaths(repoRoot, entry, manifest.run?.number);
  assertManifestIdentity(manifest, entry, registryVersion, expectedPaths);
  if (manifest.run.status === "approved" || manifest.selection !== null) {
    throw new Error(
      `${entry.id} is already approved; increment promptVersion before regenerating.`,
    );
  }

  for (const candidate of manifest.candidates) {
    const outputExists = await exists(
      fromRepositoryPath(repoRoot, candidate.outputPath),
    );
    if (["generated", "selected", "rejected"].includes(candidate.status)) {
      if (!outputExists) {
        throw new Error(
          `Manifest marks ${entry.id} candidate ${candidate.index} complete, but its file is missing.`,
        );
      }
      continue;
    }
    if (outputExists) {
      throw new Error(
        `Untracked candidate file exists for ${entry.id} candidate ${candidate.index}; use regenerate.`,
      );
    }
    candidate.status = "pending";
  }

  manifest.recovery.resumeCount += 1;
  manifest.run.mode = "resume";
  manifest.run.status = manifest.candidates.every((item) => item.status === "generated")
    ? "awaiting-review"
    : "ready";
  manifest.run.updatedAt = timestamp(now);
  updateRecoveryPoint(manifest);
  await writeManifest(repoRoot, manifest);
  return manifest;
};

export const prepareGenerationRun = async ({
  repoRoot,
  entry,
  registryVersion,
  backend,
  mode,
  now,
}) => {
  const manifests = await listRunManifests(repoRoot, entry);
  if (mode === "start") {
    if (manifests.length > 0) {
      throw new Error(`${entry.id} already has a run; use resume or regenerate.`);
    }
    return createManifest({
      repoRoot,
      entry,
      registryVersion,
      backend,
      runNumber: 1,
      mode,
      now,
    });
  }

  if (mode === "resume") {
    if (manifests.length === 0) {
      throw new Error(`${entry.id} has no run to resume.`);
    }
    return resumeManifest({
      repoRoot,
      entry,
      registryVersion,
      manifestPath: manifests.at(-1),
      now,
    });
  }

  if (mode !== "regenerate") {
    throw new Error(`Unsupported generation mode: ${mode}.`);
  }
  if (manifests.length === 0) {
    throw new Error(`${entry.id} has no prior run to regenerate.`);
  }
  for (const manifestPath of manifests) {
    const existing = await readManifest(manifestPath);
    if (existing.run?.status === "approved" || existing.selection !== null) {
      throw new Error(
        `${entry.id} has an approved run; increment promptVersion before regenerating.`,
      );
    }
  }
  return createManifest({
    repoRoot,
    entry,
    registryVersion,
    backend,
    runNumber: manifests.length + 1,
    mode,
    now,
  });
};

const updateCandidate = async ({
  repoRoot,
  manifest,
  candidateIndex,
  expectedStatus,
  now,
  mutate,
}) => {
  const candidate = manifest.candidates.find(
    (item) => item.index === candidateIndex,
  );
  if (!candidate) {
    throw new Error(`Unknown candidate ${candidateIndex} for ${manifest.asset.id}.`);
  }
  if (candidate.status !== expectedStatus) {
    throw new Error(
      `Candidate ${candidateIndex} for ${manifest.asset.id} is ${candidate.status}, expected ${expectedStatus}.`,
    );
  }
  mutate(candidate);
  manifest.run.updatedAt = timestamp(now);
  updateRecoveryPoint(manifest);
  await writeManifest(repoRoot, manifest);
  return manifest;
};

export const recordCandidateStarted = async (
  repoRoot,
  manifest,
  candidateIndex,
  now,
) =>
  updateCandidate({
    repoRoot,
    manifest,
    candidateIndex,
    expectedStatus: "pending",
    now,
    mutate: (candidate) => {
      candidate.status = "generating";
      candidate.attempts += 1;
      manifest.run.status = "generating";
    },
  });

export const recordCandidateSuccess = async (
  repoRoot,
  manifest,
  candidateIndex,
  now,
) => {
  const candidate = manifest.candidates.find(
    (item) => item.index === candidateIndex,
  );
  if (
    !candidate ||
    !(await exists(fromRepositoryPath(repoRoot, candidate.outputPath)))
  ) {
    throw new Error(
      `Candidate ${candidateIndex} output must exist before recording success.`,
    );
  }
  return updateCandidate({
    repoRoot,
    manifest,
    candidateIndex,
    expectedStatus: "generating",
    now,
    mutate: (item) => {
      item.status = "generated";
      item.generatedAt = timestamp(now);
      item.lastFailure = null;
      manifest.run.status = manifest.candidates.every(
        (candidateItem) =>
          candidateItem.index === candidateIndex ||
          candidateItem.status === "generated",
      )
        ? "awaiting-review"
        : "ready";
    },
  });
};

export const recordCandidateFailure = async (
  repoRoot,
  manifest,
  candidateIndex,
  error,
  now,
) =>
  updateCandidate({
    repoRoot,
    manifest,
    candidateIndex,
    expectedStatus: "generating",
    now,
    mutate: (candidate) => {
      const failure = {
        at: timestamp(now),
        attempt: candidate.attempts,
        reason: error instanceof Error ? error.message : String(error),
      };
      candidate.status = "failed";
      candidate.lastFailure = failure;
      candidate.failures.push(failure);
      manifest.run.status = "failed";
    },
  });

export const pendingCandidates = (manifest) =>
  manifest.candidates.filter((candidate) => candidate.status === "pending");

export const approveCandidate = async ({
  repoRoot,
  entry,
  registryVersion,
  candidateIndex,
  reason,
  now,
}) => {
  const manifests = await listRunManifests(repoRoot, entry);
  if (manifests.length === 0) {
    throw new Error(`${entry.id} has no run to approve.`);
  }
  const manifest = await readManifest(manifests.at(-1));
  assertManifestIdentity(
    manifest,
    entry,
    registryVersion,
    buildRunPaths(repoRoot, entry, manifest.run?.number),
  );
  if (manifest.selection !== null || manifest.run.status === "approved") {
    throw new Error(`${entry.id} already has an approved candidate.`);
  }
  if (!manifest.candidates.every((candidate) => candidate.status === "generated")) {
    throw new Error(`All ${entry.id} candidates must be generated before approval.`);
  }
  const candidate = manifest.candidates.find(
    (item) => item.index === candidateIndex,
  );
  if (!candidate) {
    throw new Error(`Unknown candidate ${candidateIndex} for ${entry.id}.`);
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new Error("Candidate approval requires a selection reason.");
  }

  const sourcePath = fromRepositoryPath(repoRoot, candidate.outputPath);
  const selectedPath = fromRepositoryPath(repoRoot, manifest.paths.selectedSource);
  if (!(await exists(sourcePath))) {
    throw new Error(`Selected candidate file is missing for ${entry.id}.`);
  }
  await mkdir(path.dirname(selectedPath), { recursive: true });
  await copyFile(sourcePath, selectedPath, fsConstants.COPYFILE_EXCL);

  for (const item of manifest.candidates) {
    item.status = item.index === candidateIndex ? "selected" : "rejected";
  }
  manifest.selection = {
    candidate: candidateIndex,
    sourcePath: candidate.outputPath,
    selectedSourcePath: manifest.paths.selectedSource,
    reason: reason.trim(),
    selectedAt: timestamp(now),
  };
  manifest.run.status = "approved";
  manifest.run.updatedAt = timestamp(now);
  updateRecoveryPoint(manifest);
  await writeManifest(repoRoot, manifest);
  return manifest;
};

export const repositoryPathToAbsolute = fromRepositoryPath;
