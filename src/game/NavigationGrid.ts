export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Cell {
  readonly column: number;
  readonly row: number;
}

interface OpenCell extends Cell {
  readonly g: number;
  readonly f: number;
}

export class NavigationGrid {
  private readonly columns: number;
  private readonly rows: number;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly cellSize: number,
    private readonly obstacles: readonly Rectangle[],
  ) {
    this.columns = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
  }

  findPath(start: Point, target: Point): Point[] {
    const startCell = this.nearestWalkable(this.toCell(start));
    const targetCell = this.nearestWalkable(this.toCell(target));

    if (!startCell || !targetCell) {
      return [];
    }

    const startKey = this.key(startCell);
    const targetKey = this.key(targetCell);
    if (startKey === targetKey) {
      return [this.toWorld(targetCell)];
    }

    const open: OpenCell[] = [
      {
        ...startCell,
        g: 0,
        f: this.heuristic(startCell, targetCell),
      },
    ];
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startKey, 0]]);
    const cells = new Map<string, Cell>([[startKey, startCell]]);
    const closed = new Set<string>();

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();
      if (!current) {
        break;
      }

      const currentKey = this.key(current);
      if (currentKey === targetKey) {
        return this.reconstructPath(cameFrom, cells, currentKey);
      }

      if (closed.has(currentKey)) {
        continue;
      }
      closed.add(currentKey);

      for (const neighbor of this.neighbors(current)) {
        const neighborKey = this.key(neighbor);
        if (closed.has(neighborKey) || !this.isWalkable(neighbor)) {
          continue;
        }

        const tentativeG = current.g + 1;
        if (tentativeG >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
          continue;
        }

        cameFrom.set(neighborKey, currentKey);
        cells.set(neighborKey, neighbor);
        gScore.set(neighborKey, tentativeG);
        open.push({
          ...neighbor,
          g: tentativeG,
          f: tentativeG + this.heuristic(neighbor, targetCell),
        });
      }
    }

    return [];
  }

  private reconstructPath(
    cameFrom: ReadonlyMap<string, string>,
    cells: ReadonlyMap<string, Cell>,
    endKey: string,
  ): Point[] {
    const path: Point[] = [];
    let currentKey: string | undefined = endKey;

    while (currentKey) {
      const cell = cells.get(currentKey);
      if (!cell) {
        break;
      }
      path.push(this.toWorld(cell));
      currentKey = cameFrom.get(currentKey);
    }

    return path.reverse().slice(1);
  }

  private nearestWalkable(origin: Cell): Cell | undefined {
    if (this.isWalkable(origin)) {
      return origin;
    }

    const maxRadius = Math.max(this.columns, this.rows);
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
        for (
          let column = origin.column - radius;
          column <= origin.column + radius;
          column += 1
        ) {
          const candidate = { column, row };
          if (this.isWalkable(candidate)) {
            return candidate;
          }
        }
      }
    }

    return undefined;
  }

  private neighbors(cell: Cell): Cell[] {
    return [
      { column: cell.column + 1, row: cell.row },
      { column: cell.column - 1, row: cell.row },
      { column: cell.column, row: cell.row + 1 },
      { column: cell.column, row: cell.row - 1 },
    ];
  }

  private isWalkable(cell: Cell): boolean {
    if (
      cell.column < 0 ||
      cell.row < 0 ||
      cell.column >= this.columns ||
      cell.row >= this.rows
    ) {
      return false;
    }

    const point = this.toWorld(cell);
    return !this.obstacles.some(
      (obstacle) =>
        point.x >= obstacle.x &&
        point.x <= obstacle.x + obstacle.width &&
        point.y >= obstacle.y &&
        point.y <= obstacle.y + obstacle.height,
    );
  }

  private toCell(point: Point): Cell {
    return {
      column: Math.max(
        0,
        Math.min(this.columns - 1, Math.floor(point.x / this.cellSize)),
      ),
      row: Math.max(
        0,
        Math.min(this.rows - 1, Math.floor(point.y / this.cellSize)),
      ),
    };
  }

  private toWorld(cell: Cell): Point {
    return {
      x: Math.min(this.width - 1, (cell.column + 0.5) * this.cellSize),
      y: Math.min(this.height - 1, (cell.row + 0.5) * this.cellSize),
    };
  }

  private key(cell: Cell): string {
    return `${cell.column},${cell.row}`;
  }

  private heuristic(a: Cell, b: Cell): number {
    return Math.abs(a.column - b.column) + Math.abs(a.row - b.row);
  }
}
