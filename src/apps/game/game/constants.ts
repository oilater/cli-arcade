import type { GameConfig } from "./types.ts"

export const PLAYER_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
] as const

export const DEFAULT_CONFIG: GameConfig = {
  gridSize: 30,
  playerCount: 2,
}

export const GRID_SIZE_RANGE = { min: 5, max: 100 } as const
export const PLAYER_COUNT_RANGE = { min: 2, max: 8 } as const

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? PLAYER_COLORS[0]
}
