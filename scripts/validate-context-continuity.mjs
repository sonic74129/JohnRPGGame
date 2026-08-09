import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateStoryStructure } from "../.github/scripts/validate-story-structure.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await validateStoryStructure(root);
console.log("Context continuity policy matches local Foundation canonical v1.");
