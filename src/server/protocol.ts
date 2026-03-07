import type { GameConfig, GameState } from "../apps/game/game/index.ts"

// Client → Server
export type ClientMessage =
  | { type: "join"; playerName: string }
  | { type: "move"; dx: number; dy: number }
  | { type: "select" }
  | { type: "end_turn" }
  | { type: "start_game" }
  | { type: "update_config"; config: GameConfig }

// Server → Client
export type ServerMessage =
  | { type: "welcome"; playerId: number; config: GameConfig }
  | { type: "lobby"; players: ReadonlyArray<{ name: string; ready: boolean }> }
  | { type: "game_state"; state: GameState; yourPlayer: number }
  | { type: "elimination"; eliminatedName: string; ownerName: string }
  | { type: "game_over"; state: GameState }
  | { type: "error"; message: string }

export const DEFAULT_PORT = 7777
