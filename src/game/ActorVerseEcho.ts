import {
  JOHN_11_VERSES,
  SCRIPTURE_TRANSLATION,
  type John11VerseKey,
  type StoryActorId,
} from "./ScriptureContent";
import {
  VERSE_BEAT_BY_ID,
  VERSE_BEATS,
  type ActorVerseEchoGrant,
  type VerseBeatId,
} from "./VerseBeats";

export interface ActorVerseEcho {
  readonly kind: "actor-verse-echo";
  readonly actorId: StoryActorId;
  readonly scope: "individual" | "shared-group";
  readonly unlockedByBeatId: VerseBeatId;
  readonly contentKind: ActorVerseEchoGrant["kind"];
  readonly verseKeys: readonly John11VerseKey[];
  readonly references: readonly string[];
  readonly translationId: typeof SCRIPTURE_TRANSLATION.id;
  readonly text: string;
}

const toEcho = (
  actorId: StoryActorId,
  beatId: VerseBeatId,
  grant: ActorVerseEchoGrant,
): ActorVerseEcho => ({
  kind: "actor-verse-echo",
  actorId,
  scope: grant.actorIds.length > 1 ? "shared-group" : "individual",
  unlockedByBeatId: beatId,
  contentKind: grant.kind,
  verseKeys: grant.verseKeys,
  references: grant.verseKeys.map(
    (verseKey) => JOHN_11_VERSES[verseKey].reference,
  ),
  translationId: SCRIPTURE_TRANSLATION.id,
  text:
    grant.exactExcerpt ??
    grant.verseKeys
      .map((verseKey) => JOHN_11_VERSES[verseKey].text)
      .join("\n"),
});

export const getActorVerseEchoHistory = (
  actorId: StoryActorId,
  completedThroughBeatId: VerseBeatId | null,
): readonly ActorVerseEcho[] => {
  if (completedThroughBeatId === null) {
    return [];
  }

  const completedOrder = VERSE_BEAT_BY_ID[completedThroughBeatId].order;
  return VERSE_BEATS.flatMap((beat) =>
    beat.order > completedOrder
      ? []
      : beat.echoGrants
          .filter((grant) => grant.actorIds.includes(actorId))
          .map((grant) => toEcho(actorId, beat.id, grant)),
  );
};

export const getLatestActorVerseEcho = (
  actorId: StoryActorId,
  completedThroughBeatId: VerseBeatId | null,
): ActorVerseEcho | null =>
  getActorVerseEchoHistory(actorId, completedThroughBeatId).at(-1) ?? null;
