import type { BombGameState, Player } from "./types.ts";

/** Update a single player in the players array by index */
export function updatePlayer(
  players: ReadonlyArray<Player>,
  index: number,
  update: Partial<Player>,
): Player[] {
  return players.map((p) => (p.index === index ? { ...p, ...update } : p));
}

/** Check if a cell is blocked (wall, block, or bomb) */
export function isBlocked(state: BombGameState, x: number, y: number): boolean {
  const cell = state.map[y]?.[x];
  if (cell === undefined || cell === "wall" || cell === "block") return true;
  if (state.bombs.some((b) => b.x === x && b.y === y)) return true;
  return false;
}
