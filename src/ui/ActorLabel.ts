import type Phaser from "phaser";

export interface ActorVisibleBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ActorLabelOptions {
  readonly text: string;
  readonly gap?: number;
  readonly resolution?: number;
  readonly resolveVisibleBounds?: () => ActorVisibleBounds;
  readonly resolveVisibility?: () => boolean;
}

export interface ActorLabelController {
  readonly textObject: Phaser.GameObjects.Text;
  updateText(text: string): void;
  sync(): void;
  destroy(): void;
}

export const ACTOR_LABEL_STYLE = {
  fontFamily:
    '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", system-ui, sans-serif',
  fontSize: "16px",
  fontStyle: "bold",
  color: "#fffaf0",
  backgroundColor: "rgba(20, 18, 14, 0.82)",
  stroke: "#17130d",
  strokeThickness: 4,
  padding: { x: 7, y: 4 },
} as const;

export const ACTOR_LABEL_LIFECYCLE = {
  syncOn: "postupdate",
  destroyOn: "destroy",
  sceneShutdown: "shutdown",
} as const;

export const ACTOR_LABEL_DEFAULT_RESOLUTION = 1;

export const resolveActorLabelPosition = (
  bounds: ActorVisibleBounds,
  gap = 8,
): { readonly x: number; readonly y: number } => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y - gap,
});

export const resolveActorLabelVisibility = (actor: {
  readonly active: boolean;
  readonly visible: boolean;
}): boolean => actor.active && actor.visible;

export const createActorLabel = (
  scene: Phaser.Scene,
  actor: Phaser.GameObjects.GameObject & {
    readonly active: boolean;
    readonly visible: boolean;
    readonly depth: number;
    getBounds(): Phaser.Geom.Rectangle;
  },
  options: ActorLabelOptions,
): ActorLabelController => {
  const resolution = options.resolution ?? ACTOR_LABEL_DEFAULT_RESOLUTION;
  const label = scene.add
    .text(0, 0, options.text, ACTOR_LABEL_STYLE)
    .setOrigin(0.5, 1)
    .setResolution(resolution);
  let destroyed = false;

  const sync = (): void => {
    if (destroyed || !label.active) {
      return;
    }
    const bounds = options.resolveVisibleBounds?.() ?? actor.getBounds();
    const position = resolveActorLabelPosition(bounds, options.gap);
    label
      .setPosition(position.x, position.y)
      .setDepth(actor.depth + 1)
      .setVisible(
        options.resolveVisibility?.() ?? resolveActorLabelVisibility(actor),
      );
  };

  const destroy = (): void => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    scene.events.off(ACTOR_LABEL_LIFECYCLE.syncOn, sync);
    scene.events.off(ACTOR_LABEL_LIFECYCLE.sceneShutdown, destroy);
    actor.off(ACTOR_LABEL_LIFECYCLE.destroyOn, destroy);
    if (label.active) {
      label.destroy();
    }
  };

  scene.events.on(ACTOR_LABEL_LIFECYCLE.syncOn, sync);
  scene.events.once(ACTOR_LABEL_LIFECYCLE.sceneShutdown, destroy);
  actor.once(ACTOR_LABEL_LIFECYCLE.destroyOn, destroy);
  sync();

  return {
    textObject: label,
    updateText: (text: string): void => {
      label.setText(text);
      sync();
    },
    sync,
    destroy,
  };
};
