import type { BombGameConfig } from "./types.ts"

export const DEFAULT_BOMB_CONFIG: BombGameConfig = {
  mapSize: 25,              // 25x25 square
  bombTimer: 30,            // 3 sec at 10 ticks/sec
  explosionDuration: 5,     // 0.5 sec
}

export const TICK_RATE = 100

export const PLAYER_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
] as const

export const ITEM_DROP_CHANCE = 0.4

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? PLAYER_COLORS[0]
}
