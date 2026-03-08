import type { BombGameConfig, BombGameState } from "../game/index.ts"

export type BombClientMessage =
  | { type: "join"; playerName: string; roomCode?: string }
  | { type: "create_room"; playerName: string }
  | { type: "matchmake"; playerName: string }
  | { type: "move"; dx: number; dy: number }
  | { type: "bomb" }
  | { type: "dart" }
  | { type: "needle" }
  | { type: "start_game" }
  | { type: "update_config"; config: BombGameConfig }

export type BombServerMessage =
  | { type: "welcome"; playerId: number; config: BombGameConfig; roomCode: string }
  | { type: "lobby"; players: ReadonlyArray<{ name: string }> }
  | { type: "game_state"; state: BombGameState }
  | { type: "game_over"; state: BombGameState }
  | { type: "error"; message: string }

export const DEFAULT_BOMB_PORT = 7778
export const DEFAULT_REMOTE_HOST = "cli-arcade.fly.dev"
