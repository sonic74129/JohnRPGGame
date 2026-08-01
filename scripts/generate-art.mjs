import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";

const subscription = process.env.AZURE_SUBSCRIPTION_ID;
const endpoint = process.env.AZURE_MAI_ENDPOINT;
const deployment = process.env.AZURE_MAI_DEPLOYMENT;

if (!subscription || !endpoint || !deployment) {
  throw new Error(
    "Set AZURE_SUBSCRIPTION_ID, AZURE_MAI_ENDPOINT, and AZURE_MAI_DEPLOYMENT.",
  );
}

const allPrompts = JSON.parse(
  await readFile(new URL("../art/prompts.json", import.meta.url), "utf8"),
);
const category = process.env.ART_CATEGORY;
const prompts = category
  ? allPrompts.filter((item) => item.category === category)
  : allPrompts;
const publicOutputDirectory = new URL("../public/assets/art/", import.meta.url);
const sourceOutputDirectory = new URL("../production/art-source/", import.meta.url);
await Promise.all([
  mkdir(publicOutputDirectory, { recursive: true }),
  mkdir(sourceOutputDirectory, { recursive: true }),
]);

const token = execFileSync(
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
  { encoding: "utf8" },
).trim();

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

for (const [index, item] of prompts.entries()) {
  const outputDirectory =
    item.output === "source" ? sourceOutputDirectory : publicOutputDirectory;
  const outputPath = new URL(item.filename, outputDirectory);
  try {
    await access(outputPath);
    console.log(`[${index + 1}/${prompts.length}] Keeping existing ${item.filename}`);
    continue;
  } catch {
    // Generate only assets that don't already exist.
  }
  console.log(`[${index + 1}/${prompts.length}] Generating ${item.filename}`);

  let response;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(`${endpoint.replace(/\/$/, "")}/mai/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: deployment,
        prompt: item.prompt,
        width: item.width,
        height: item.height,
      }),
    });

    if (response.ok) {
      break;
    }

    const errorText = await response.text();
    if (response.status !== 429 || attempt === 4) {
      throw new Error(
        `Image generation failed for ${item.filename}: ${response.status} ${errorText}`,
      );
    }

    const retrySeconds = Number(response.headers.get("retry-after") ?? "65");
    console.log(`Rate limited; retrying in ${retrySeconds} seconds.`);
    await delay(retrySeconds * 1000);
  }

  if (!response?.ok) {
    throw new Error(`No successful response for ${item.filename}.`);
  }

  const result = await response.json();
  const base64Image = result.data?.[0]?.b64_json;
  if (!base64Image) {
    throw new Error(`Unexpected response for ${item.filename}.`);
  }

  await writeFile(outputPath, Buffer.from(base64Image, "base64"));
  console.log(`Saved ${fileURLToPath(outputPath)}`);

  if (index < prompts.length - 1) {
    await delay(61_000);
  }
}
