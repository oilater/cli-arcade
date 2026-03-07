export type { GameConfig, GameState, PlayerState, Position, CellState, SelectResult } from "./types.ts"
export { PLAYER_COLORS, DEFAULT_CONFIG, GRID_SIZE_RANGE, PLAYER_COUNT_RANGE, getPlayerColor } from "./constants.ts"
export {
  createInitialState,
  moveCursor,
  selectCell,
  eliminatePlayer,
  endTurn,
  getActivePlayers,
  getWinner,
  isGameOver,
} from "./state.ts"
