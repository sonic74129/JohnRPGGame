# JohnRPGGame Copilot Instructions

<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_BEGIN -->
### Canonical context continuity policy

Policy version: 1.

- Emit a compact continuity record only at these events: a phase transition; a heavy, binary, or media
  boundary; before waiting for user input after heavy work; and checkpoint or continuation takeover.
  This is not a per-turn report and must not use token-percentage thresholds as a pre-send guard.
- Record exactly six fields: `objective`; `status`; `anchors` (repository, branch, commit);
  `decisions` (each labeled confirmed or hypothesis); `next_actions` (at most three, including
  validation); and `risks_blockers`.
- The coordinator must never directly receive screenshots, binary files, or base64. Inspect media in a
  bounded child or session and return only durable path, SHA-256, status, and findings.
- Treat token utilization and serialized request payload bytes as independent budgets. After heavy
  work, save a compact decision brief and checkpoint, then use a clean continuation before `ask_user`.
- After a request-size failure, do not retry from the poisoned session. Preserve checkpoint and
  continuation metadata, including the six fields, parent/child relationship, completed boundary,
  durable media references, and validation state; resume with a smaller batch in a clean continuation.
- Reuse the existing handoff/checkpoint. This policy does not create a story planning artifact,
  production stage, runtime manifest, readiness flag, or alternate plan schema.
<!-- FOUNDATION_CONTEXT_CONTINUITY_V1_END -->

## STOP: mandatory phase gate

These rules are mandatory, not recommendations. Before **every** implementation,
MAI generation, asset-processing, audit, screenshot, validation, or commit phase,
stop and complete this checklist:

1. Read this instruction file.
2. Read the active plan from the top through its latest checkpoint.
3. Inspect `git status`.
4. Query the active todo list and select only one ready phase.
5. State the exact phase, accepted decisions, rejected approaches, uncommitted
   work, next small deliverable, and acceptance criteria.

Do not call MAI, modify game code, process assets, or start the next phase until
all five checks are complete.

## STOP: mandatory compaction gate

Compaction is proactive. Do **not** wait for request-too-large, compaction failure,
or visible context loss.

Write a fresh compact checkpoint before continuing whenever any of these occurs:

- every phase boundary, even when context still appears healthy;
- before a new MAI candidate batch;
- after reviewing a large screenshot/image batch;
- after a tool output is truncated once;
- after a meaningful implementation or validation milestone;
- before switching from investigation to implementation;
- whenever the user requests compaction.

If request-too-large or compaction failure occurs, treat it as a process failure:
stop immediately and checkpoint before retrying anything.

Each checkpoint must contain:

- committed baseline;
- current uncommitted files and intent;
- latest user decisions;
- rejected approaches that must not be resumed;
- blockers and verified environment details;
- the single next execution phase and its acceptance criteria.

Resume only after that checkpoint is complete. Never retry a large operation
blindly. Split work into small, independently inspectable batches.

Keep the active plan compact. Remove superseded execution details from the active
plan instead of accumulating an ever-growing history; Git commits and session
checkpoints are the archive.

## Continue autonomously after tool results

Stopping a risky operation does not mean stopping the session. After a tool
result, screenshot review, MAI batch, validation, or checkpoint:

1. Inspect the result immediately.
2. Record the finding and update the checkpoint/todo when required.
3. Continue to the next ready step automatically.

Do not wait for the user merely because a batch ended or a checkpoint was
required. Wait only when the user explicitly requested approval, an irreversible
decision is not covered by the active plan, or every candidate failed and the art
direction must change.

For MAI review, stop further generation, compare and score the candidates, select
the best passing candidate, checkpoint the decision, and continue automatically.

## STOP: MAI generation gate

Before each MAI call, the active checkpoint must contain:

- the asset's runtime purpose;
- exact composition and camera;
- character and object scale contract;
- locked art style, palette, materials, and lighting;
- required content and explicit exclusions;
- output dimensions and candidate filenames;
- visual acceptance criteria.

Generate at most two or three candidates per batch. Capture and inspect every
candidate before another MAI batch. Never integrate the first successful output
without a visual comparison.

## Mandatory phase closeout

At the end of every phase:

1. Save the required screenshots or comparison sheet.
2. Record visual findings and unresolved defects in the plan checkpoint.
3. Update todo status.
4. Run only the validation relevant to that phase.
5. Commit the phase separately when it is complete.
