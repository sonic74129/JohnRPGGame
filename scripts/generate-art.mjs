import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  loadPromptRegistry,
  parseGeneratorArgs,
  selectPrompts,
} from "./art/prompt-registry.mjs";
import {
  approveCandidate,
  buildRunPaths,
  listRunManifests,
  pendingCandidates,
  prepareGenerationRun,
  recordCandidateFailure,
  recordCandidateStarted,
  recordCandidateSuccess,
  repositoryPathToAbsolute,
} from "./art/pipeline-manifest.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const MAX_REQUEST_ATTEMPTS = 4;

const usage = `Usage:
  npm run art:generate -- --family <family> [--asset <id>] [--mode start|resume|regenerate] [--dry-run]
  npm run art:generate -- --family <family> --asset <id> --select <candidate> --reason <text>

Only one registry family is allowed per invocation. Candidate counts come from the registry.`;

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requireGenerationEnvironment = (backend) => {
  const subscription = process.env.AZURE_SUBSCRIPTION_ID;
  const endpoint = process.env.AZURE_MAI_ENDPOINT;
  const deploymentOverride = process.env.AZURE_MAI_DEPLOYMENT;
  if (!subscription || !endpoint) {
    throw new Error("Set AZURE_SUBSCRIPTION_ID and AZURE_MAI_ENDPOINT.");
  }
  if (
    deploymentOverride !== undefined &&
    deploymentOverride !== backend.deployment
  ) {
    throw new Error(
      `AZURE_MAI_DEPLOYMENT must remain locked to ${backend.deployment}.`,
    );
  }
  const parsedEndpoint = new URL(endpoint);
  if (parsedEndpoint.protocol !== "https:") {
    throw new Error("AZURE_MAI_ENDPOINT must use HTTPS.");
  }
  return {
    subscription,
    endpoint: parsedEndpoint.toString().replace(/\/$/, ""),
  };
};

const getAzureToken = (subscription) =>
  execFileSync(
    "az",
    [
      "account",
      "get-access-token",
      "--subscription",
      subscription,
      "--resource",
      "https://cognitiveservices.azure.com/",
      "--query",
      "accessToken",
      "--output",
      "tsv",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  ).trim();

const requestCandidate = async ({ endpoint, token, backend, entry }) => {
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${endpoint}/mai/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: backend.deployment,
        prompt: entry.prompt,
        width: entry.width,
        height: entry.height,
      }),
    });
    if (response.ok) {
      const result = await response.json();
      const base64Image = result.data?.[0]?.b64_json;
      if (typeof base64Image !== "string" || base64Image.length === 0) {
        throw new Error(`Unexpected image response for ${entry.id}.`);
      }
      return Buffer.from(base64Image, "base64");
    }

    const errorText = await response.text();
    if (response.status !== 429 || attempt === MAX_REQUEST_ATTEMPTS) {
      throw new Error(
        `Image generation failed for ${entry.id}: ${response.status} ${errorText}`,
      );
    }
    const retryHeader = Number(response.headers.get("retry-after"));
    const retrySeconds =
      Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : 65;
    console.error(
      `${entry.id} was rate limited; retrying in ${retrySeconds} seconds (${attempt}/${MAX_REQUEST_ATTEMPTS}).`,
    );
    await delay(retrySeconds * 1000);
  }
  throw new Error(`Image generation exhausted retries for ${entry.id}.`);
};

const dryRunPlan = async (entries, mode) =>
  Promise.all(
    entries.map(async (entry) => {
      const manifests = await listRunManifests(REPO_ROOT, entry);
      let runNumber;
      if (mode === "start") {
        runNumber = 1;
      } else if (mode === "resume") {
        runNumber = Math.max(1, manifests.length);
      } else {
        runNumber = manifests.length + 1;
      }
      return {
        id: entry.id,
        family: entry.family,
        model: entry.model,
        promptVersion: entry.promptVersion,
        candidateCount: entry.candidateCount,
        mode,
        paths: buildRunPaths(REPO_ROOT, entry, runNumber),
      };
    }),
  );

const generateEntry = async ({
  registry,
  entry,
  requestedMode,
  endpoint,
  token,
}) => {
  const priorRuns = await listRunManifests(REPO_ROOT, entry);
  const mode =
    priorRuns.length === 0 && requestedMode !== "start"
      ? "start"
      : requestedMode;
  let manifest = await prepareGenerationRun({
    repoRoot: REPO_ROOT,
    entry,
    registryVersion: registry.style.registryVersion,
    backend: registry.style.backend,
    mode,
  });

  for (const candidate of pendingCandidates(manifest)) {
    manifest = await recordCandidateStarted(
      REPO_ROOT,
      manifest,
      candidate.index,
    );
    try {
      const image = await requestCandidate({
        endpoint,
        token,
        backend: registry.style.backend,
        entry,
      });
      const outputPath = repositoryPathToAbsolute(
        REPO_ROOT,
        candidate.outputPath,
      );
      await writeFile(outputPath, image, { flag: "wx" });
      manifest = await recordCandidateSuccess(
        REPO_ROOT,
        manifest,
        candidate.index,
      );
      console.log(
        `${entry.id}: generated candidate ${candidate.index}/${entry.candidateCount} at ${candidate.outputPath}`,
      );
    } catch (error) {
      await recordCandidateFailure(
        REPO_ROOT,
        manifest,
        candidate.index,
        error,
      );
      throw error;
    }
  }
  console.log(
    `${entry.id}: ${manifest.run.status}; review sheet path ${manifest.paths.reviewContactSheet}`,
  );
};

export const main = async (args = process.argv.slice(2)) => {
  const options = parseGeneratorArgs(args);
  if (options.help) {
    console.log(usage);
    return;
  }

  const registry = await loadPromptRegistry({
    registryDirectory: path.join(REPO_ROOT, "art", "prompts"),
  });
  const entries = selectPrompts(registry.entries, options);

  if (options.selectCandidate !== undefined) {
    const [entry] = entries;
    const manifest = await approveCandidate({
      repoRoot: REPO_ROOT,
      entry,
      registryVersion: registry.style.registryVersion,
      candidateIndex: options.selectCandidate,
      reason: options.selectionReason,
    });
    console.log(
      `${entry.id}: approved candidate ${options.selectCandidate} at ${manifest.paths.selectedSource}`,
    );
    return;
  }

  if (options.dryRun) {
    console.log(JSON.stringify(await dryRunPlan(entries, options.mode), null, 2));
    return;
  }

  const environment = requireGenerationEnvironment(registry.style.backend);
  const token = getAzureToken(environment.subscription);
  if (token.length === 0) {
    throw new Error("Azure CLI returned an empty access token.");
  }
  for (const entry of entries) {
    await generateEntry({
      registry,
      entry,
      requestedMode: options.mode,
      endpoint: environment.endpoint,
      token,
    });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
