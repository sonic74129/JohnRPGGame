export const BEGIN_MARKER =
  "<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN -->";
export const END_MARKER =
  "<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_END -->";

export const CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1 = `<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN -->
### Canonical context continuity policy

Policy version: 1.

- Emit a compact continuity record only at these events: a phase transition; a heavy, binary, or media
  boundary; before waiting for user input after heavy work; and checkpoint or continuation takeover.
  This is not a per-turn report and must not use token-percentage thresholds as a pre-send guard.
- Record exactly six fields: \`objective\`; \`status\`; \`anchors\` (repository, branch, commit);
  \`decisions\` (each labeled confirmed or hypothesis); \`next_actions\` (at most three, including
  validation); and \`risks_blockers\`.
- The coordinator must never directly receive screenshots, binary files, or base64. Inspect media in a
  bounded child or session and return only durable path, SHA-256, status, and findings.
- Treat token utilization and serialized request payload bytes as independent budgets. After heavy
  work, save a compact decision brief and checkpoint, then use a clean continuation before \`ask_user\`.
- After a request-size failure, do not retry from the poisoned session. Preserve checkpoint and
  continuation metadata, including the six fields, parent/child relationship, completed boundary,
  durable media references, and validation state; resume with a smaller batch in a clean continuation.
- Reuse the existing handoff/checkpoint. This policy does not create a story planning artifact,
  production stage, runtime manifest, readiness flag, or alternate plan schema.
<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_END -->`;

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

function extractMarkedBlock(content, sourceLabel) {
  const normalized = normalizeNewlines(content);
  const start = normalized.indexOf(BEGIN_MARKER);
  if (start === -1) {
    throw new Error(`${sourceLabel} is missing ${BEGIN_MARKER}.`);
  }
  if (normalized.indexOf(BEGIN_MARKER, start + BEGIN_MARKER.length) !== -1) {
    throw new Error(`${sourceLabel} must contain ${BEGIN_MARKER} exactly once.`);
  }
  const end = normalized.indexOf(END_MARKER);
  if (end === -1) {
    throw new Error(`${sourceLabel} is missing ${END_MARKER}.`);
  }
  if (end < start) {
    throw new Error(`${sourceLabel} has invalid continuity marker ordering.`);
  }
  if (normalized.indexOf(END_MARKER, end + END_MARKER.length) !== -1) {
    throw new Error(`${sourceLabel} must contain ${END_MARKER} exactly once.`);
  }
  return normalized.slice(start, end + END_MARKER.length).trim();
}

export function extractCanonicalContextContinuityBlockFromSkill(skillContent) {
  return extractMarkedBlock(
    skillContent,
    ".foundation/skills/bible-story-game-builder/SKILL.md",
  );
}

export function extractContextContinuityBlockFromInstructions(
  instructionsContent,
) {
  return extractMarkedBlock(
    instructionsContent,
    ".github/copilot-instructions.md",
  );
}

export function validateContextContinuityPolicy({
  foundationSkillContent,
  instructionsContent,
}) {
  const foundationBlock =
    extractCanonicalContextContinuityBlockFromSkill(foundationSkillContent);
  if (foundationBlock !== CANONICAL_CONTEXT_CONTINUITY_BLOCK_V1) {
    throw new Error(
      "Local Foundation skill continuity policy is not canonical v1.",
    );
  }
  const instructionsBlock =
    extractContextContinuityBlockFromInstructions(instructionsContent);
  if (instructionsBlock !== foundationBlock) {
    throw new Error(
      "Story instructions continuity policy block does not match local Foundation skill block.",
    );
  }
}
