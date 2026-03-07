import type { CellState, GameConfig, GameState, PlayerState, SelectResult } from "./types.ts"
import { getPlayerColor } from "./constants.ts"

export function createInitialState(config: GameConfig): GameState {
  const grid: CellState[][] = Array.from({ length: config.gridSize }, () =>
    Array.from({ length: config.gridSize }, () => null)
  )

  const players: PlayerState[] = Array.from({ length: config.playerCount }, (_, i) => ({
    index: i,
    name: `Player ${i + 1}`,
    color: getPlayerColor(i),
    cellCount: 0,
    eliminated: false,
  }))

  return {
    grid,
    players,
    currentPlayer: 0,
    cursor: { x: 0, y: 0 },
    selectedThisTurn: [],
  }
}

export function moveCursor(state: GameState, dx: number, dy: number, gridSize: number): GameState {
  const x = Math.max(0, Math.min(gridSize - 1, state.cursor.x + dx))
  const y = Math.max(0, Math.min(gridSize - 1, state.cursor.y + dy))
  return { ...state, cursor: { x, y } }
}

export function selectCell(state: GameState): SelectResult {
  const { x, y } = state.cursor
  const currentCell = state.grid[y]?.[x] ?? null

  if (currentCell === state.currentPlayer) {
    return { state, collision: false, collidedWith: null }
  }

  if (currentCell !== null) {
    return { state, collision: true, collidedWith: currentCell }
  }

  const newGrid = state.grid.map((row, ry) =>
    ry === y
      ? row.map((cell, rx) => (rx === x ? state.currentPlayer : cell))
      : row
  )

  const newPlayers = state.players.map((p) =>
    p.index === state.currentPlayer
      ? { ...p, cellCount: p.cellCount + 1 }
      : p
  )

  return {
    state: {
      ...state,
      grid: newGrid,
      players: newPlayers,
      selectedThisTurn: [...state.selectedThisTurn, { x, y }],
    },
    collision: false,
    collidedWith: null,
  }
}

export function eliminatePlayer(state: GameState, playerIndex: number): GameState {
  const newGrid = state.grid.map((row) =>
    row.map((cell) => (cell === playerIndex ? null : cell))
  )

  const newPlayers = state.players.map((p) =>
    p.index === playerIndex
      ? { ...p, eliminated: true, cellCount: 0 }
      : p
  )

  return { ...state, grid: newGrid, players: newPlayers }
}

export function endTurn(state: GameState): GameState {
  const activePlayers = getActivePlayers(state)
  if (activePlayers.length <= 1) {
    return { ...state, selectedThisTurn: [] }
  }

  let next = (state.currentPlayer + 1) % state.players.length
  while (state.players[next]!.eliminated) {
    next = (next + 1) % state.players.length
  }

  return {
    ...state,
    currentPlayer: next,
    cursor: { x: 0, y: 0 },
    selectedThisTurn: [],
  }
}

export function getActivePlayers(state: GameState): ReadonlyArray<PlayerState> {
  return state.players.filter((p) => !p.eliminated)
}

export function getWinner(state: GameState): PlayerState | null {
  const active = getActivePlayers(state)
  if (active.length === 1) return active[0]!
  return [...state.players].sort((a, b) => b.cellCount - a.cellCount)[0] ?? null
}

export function isGameOver(state: GameState): boolean {
  return getActivePlayers(state).length <= 1
}
