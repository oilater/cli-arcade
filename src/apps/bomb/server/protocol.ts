import type { BombGameConfig, BombGameState } from "../game/index.ts"

// Client → Server
export type BombClientMessage =
  | { type: "join"; playerName: string }
  | { type: "move"; dx: number; dy: number }
  | { type: "bomb" }
  | { type: "dart" }
  | { type: "start_game" }
  | { type: "update_config"; config: BombGameConfig }

// Server → Client
export type BombServerMessage =
  | { type: "welcome"; playerId: number; config: BombGameConfig }
  | { type: "lobby"; players: ReadonlyArray<{ name: string }> }
  | { type: "game_state"; state: BombGameState }
  | { type: "game_over"; state: BombGameState }
  | { type: "error"; message: string }

export const DEFAULT_BOMB_PORT = 7778
