const BEGIN_MARKER = "<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN -->";
const END_MARKER = "<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_END -->";

function extractMarkedBlock(content, sourceLabel) {
  const normalized = content.replace(/\r\n/g, "\n");
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
  if (normalized.indexOf(END_MARKER, end + END_MARKER.length) !== -1) {
    throw new Error(`${sourceLabel} must contain ${END_MARKER} exactly once.`);
  }
  if (end < start) {
    throw new Error(`${sourceLabel} has invalid continuity marker ordering.`);
  }

  return normalized.slice(start, end + END_MARKER.length).trim();
}

export function extractCanonicalContextContinuityBlockFromSkill(skillContent) {
  return extractMarkedBlock(
    skillContent,
    ".foundation/skills/bible-story-game-builder/SKILL.md",
  );
}

export function extractContextContinuityBlockFromInstructions(instructionsContent) {
  return extractMarkedBlock(
    instructionsContent,
    ".github/copilot-instructions.md",
  );
}

export function assertContextContinuityPolicyParity({
  canonicalBlock,
  instructionsContent,
}) {
  const instructionsBlock =
    extractContextContinuityBlockFromInstructions(instructionsContent);
  if (instructionsBlock !== canonicalBlock) {
    throw new Error(
      "Story instructions continuity policy block does not match Foundation canonical block.",
    );
  }
}

export function validateContextContinuityPolicy({
  foundationSkillContent,
  instructionsContent,
}) {
  const canonicalBlock =
    extractCanonicalContextContinuityBlockFromSkill(foundationSkillContent);
  assertContextContinuityPolicyParity({ canonicalBlock, instructionsContent });
  return canonicalBlock;
}

export function validateTrustedContextContinuityPolicy({
  trustedFoundationSkillContent,
  storyFoundationSkillContent,
  instructionsContent,
}) {
  const canonicalBlock = extractCanonicalContextContinuityBlockFromSkill(
    trustedFoundationSkillContent,
  );
  const storyFoundationBlock = extractCanonicalContextContinuityBlockFromSkill(
    storyFoundationSkillContent,
  );
  if (storyFoundationBlock !== canonicalBlock) {
    throw new Error(
      "Story Foundation continuity policy block does not match trusted canonical block.",
    );
  }
  assertContextContinuityPolicyParity({ canonicalBlock, instructionsContent });
  return canonicalBlock;
}
