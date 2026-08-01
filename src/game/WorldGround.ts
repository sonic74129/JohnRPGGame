import type { Point } from "./NavigationGrid";
import {
  WORLD_HEIGHT,
  WORLD_ROUTES,
  WORLD_WIDTH,
} from "./WorldLayout";

export const WORLD_GROUND_ASSET = {
  key: "world-ground-atlas",
  path: "assets/art/environment/environment__world-ground/v2/run-001/environment__world-ground.png",
  width: 1024,
  height: 1024,
  frameWidth: 256,
  frameHeight: 256,
  frameCount: 16,
} as const;

export const WORLD_GROUND_CELL_SIZE = 128;
export const WORLD_GROUND_FRAME_CROP = 10;
export const WORLD_GROUND_BASE_FRAME_CROP = 92;
export const WORLD_GROUND_RENDER_SIZE = 132;
export const WORLD_GROUND_COLUMNS = WORLD_WIDTH / WORLD_GROUND_CELL_SIZE;
export const WORLD_GROUND_ROWS = WORLD_HEIGHT / WORLD_GROUND_CELL_SIZE;

export interface WorldGroundTile {
  readonly column: number;
  readonly row: number;
  readonly frame: number;
  readonly angle: number;
  readonly layer: "base" | "road";
}

export const worldGroundInnerFrame = (frame: number): string =>
  `world-ground-inner-${frame}`;

export const worldGroundBaseFrame = (frame: number): string =>
  `world-ground-base-${frame}`;

interface Cell {
  readonly column: number;
  readonly row: number;
}

const cellKey = ({ column, row }: Cell): string => `${column},${row}`;

const cellPattern = ({ column, row }: Cell, salt = 0): number =>
  (column * 37 + row * 73 + column * row * 17 + salt) >>> 0;

const baseFrame = (cell: Cell): number => {
  const pattern = cellPattern(cell);
  return pattern % 2 === 0 ? 0 : 12;
};

const baseAngle = (cell: Cell): number =>
  (cellPattern(cell, 19) % 4) * 90;

const straightRoadFrame = (cell: Cell): number =>
  [2, 5, 10][cellPattern(cell, 41) % 3] ?? 2;

export const worldPointToGroundCell = ({ x, y }: Point): Cell => ({
  column: Math.min(
    WORLD_GROUND_COLUMNS - 1,
    Math.max(0, Math.floor(x / WORLD_GROUND_CELL_SIZE)),
  ),
  row: Math.min(
    WORLD_GROUND_ROWS - 1,
    Math.max(0, Math.floor(y / WORLD_GROUND_CELL_SIZE)),
  ),
});

const rasterizeLine = (start: Cell, end: Cell): readonly Cell[] => {
  const cells: Cell[] = [];
  let column = start.column;
  let row = start.row;
  const deltaColumn = Math.abs(end.column - start.column);
  const deltaRow = Math.abs(end.row - start.row);
  const stepColumn = start.column < end.column ? 1 : -1;
  const stepRow = start.row < end.row ? 1 : -1;
  let error = deltaColumn - deltaRow;

  while (true) {
    cells.push({ column, row });
    if (column === end.column && row === end.row) {
      return cells;
    }
    const doubledError = error * 2;
    if (doubledError > -deltaRow) {
      error -= deltaRow;
      column += stepColumn;
    }
    if (doubledError < deltaColumn) {
      error += deltaColumn;
      row += stepRow;
    }
  }
};

const routeCells = new Map<string, Cell>();
for (const route of WORLD_ROUTES) {
  const points = route.points.map(worldPointToGroundCell);
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (!start || !end) {
      continue;
    }
    for (const cell of rasterizeLine(start, end)) {
      routeCells.set(cellKey(cell), cell);
    }
  }
}

const roadFrame = (cell: Cell): Pick<WorldGroundTile, "frame" | "angle"> => {
  const has = (column: number, row: number): boolean =>
    routeCells.has(cellKey({ column, row }));
  const north = has(cell.column, cell.row - 1);
  const east = has(cell.column + 1, cell.row);
  const south = has(cell.column, cell.row + 1);
  const west = has(cell.column - 1, cell.row);
  const connectionCount = [north, east, south, west].filter(Boolean).length;

  if (connectionCount >= 3) {
    return { frame: 7, angle: 0 };
  }
  if (north && south) {
    return { frame: straightRoadFrame(cell), angle: 0 };
  }
  if (east && west) {
    return { frame: straightRoadFrame(cell), angle: 90 };
  }
  if (north && east) {
    return { frame: 6, angle: 0 };
  }
  if (east && south) {
    return { frame: 6, angle: 90 };
  }
  if (south && west) {
    return { frame: 6, angle: 180 };
  }
  if (west && north) {
    return { frame: 6, angle: 270 };
  }
  return {
    frame: straightRoadFrame(cell),
    angle: east || west ? 90 : 0,
  };
};

const baseTiles: WorldGroundTile[] = [];
for (let row = 0; row < WORLD_GROUND_ROWS; row += 1) {
  for (let column = 0; column < WORLD_GROUND_COLUMNS; column += 1) {
    baseTiles.push({
      column,
      row,
      frame: baseFrame({ column, row }),
      angle: baseAngle({ column, row }),
      layer: "base",
    });
  }
}

export const WORLD_GROUND_TILES: readonly WorldGroundTile[] = [
  ...baseTiles,
  ...[...routeCells.values()].map((cell) => ({
    ...cell,
    ...roadFrame(cell),
    layer: "road" as const,
  })),
];

export const WORLD_GROUND_ROAD_CELLS: ReadonlySet<string> = new Set(
  routeCells.keys(),
);
