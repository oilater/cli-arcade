import type { CellType, Position } from "./types.ts";

export function generateMap(
  size: number,
  playerCount: number,
): { map: CellType[][]; spawns: Position[] } {
  const map: CellType[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "empty" as CellType),
  );

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
        map[y]![x] = "wall";
        continue;
      }
      if (x % 2 === 0 && y % 2 === 0) {
        map[y]![x] = "wall";
        continue;
      }
    }
  }

  const spawns: Position[] = [
    { x: 1, y: 1 },
    { x: size - 2, y: size - 2 },
    { x: size - 2, y: 1 },
    { x: 1, y: size - 2 },
  ].slice(0, playerCount);

  const safeCells = new Set<string>();
  for (const spawn of spawns) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 4) {
          safeCells.add(`${spawn.x + dx},${spawn.y + dy}`);
        }
      }
    }
  }

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (map[y]![x] !== "empty") continue;
      if (safeCells.has(`${x},${y}`)) continue;
      if (Math.random() < 0.3) {
        map[y]![x] = "block";
      }
    }
  }

  return { map, spawns };
}
