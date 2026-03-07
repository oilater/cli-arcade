export interface GameConfig {
  readonly gridSize: number
  readonly playerCount: number
}

export interface Position {
  readonly x: number
  readonly y: number
}

export type CellState = number | null

export interface PlayerState {
  readonly index: number
  readonly name: string
  readonly color: string
  readonly cellCount: number
  readonly eliminated: boolean
}

export interface GameState {
  readonly grid: ReadonlyArray<ReadonlyArray<CellState>>
  readonly players: ReadonlyArray<PlayerState>
  readonly currentPlayer: number
  readonly cursor: Position
  readonly selectedThisTurn: ReadonlyArray<Position>
}

export interface SelectResult {
  readonly state: GameState
  readonly collision: boolean
  readonly collidedWith: number | null
}
