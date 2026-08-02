# JohnRPGGame Copilot Instructions

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
