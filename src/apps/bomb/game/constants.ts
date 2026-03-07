import type { BombGameConfig } from "./types.ts"

export const DEFAULT_BOMB_CONFIG: BombGameConfig = {
  mapSize: 25,
  bombTimer: 25,
  explosionDuration: 5,
}

export const TICK_RATE = 100

export const PLAYER_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
] as const

export const ITEM_DROP_CHANCE = 0.4

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? PLAYER_COLORS[0]
}
