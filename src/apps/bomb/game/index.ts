export type {
  BombGameConfig,
  BombGameState,
  Bomb,
  CellType,
  Dart,
  Explosion,
  Item,
  ItemType,
  Player,
  Position,
} from "./types.ts"
export { DEFAULT_BOMB_CONFIG, TICK_RATE, PLAYER_COLORS, getPlayerColor } from "./constants.ts"
export { generateMap } from "./map-gen.ts"
export { createInitialState, movePlayer, placeBomb, throwDart, tick, getAlivePlayers } from "./state.ts"
export { tickBots } from "./bot.ts"
