export type CellType = "empty" | "wall" | "block"

export interface Position {
  readonly x: number
  readonly y: number
}

export interface Player {
  readonly index: number
  readonly x: number
  readonly y: number
  readonly alive: boolean
  readonly bombRange: number
  readonly maxBombs: number
  readonly activeBombs: number
  readonly darts: number       // dart ammo
  readonly lastDx: number      // last move direction (for dart aim)
  readonly lastDy: number
}

export interface Bomb {
  readonly x: number
  readonly y: number
  readonly owner: number
  readonly timer: number
  readonly range: number
}

export interface Explosion {
  readonly x: number
  readonly y: number
  readonly timer: number
  readonly owner: number
}

export interface Dart {
  readonly x: number
  readonly y: number
  readonly dx: number
  readonly dy: number
  readonly owner: number
}

export type ItemType = "range" | "bomb" | "dart"

export interface Item {
  readonly x: number
  readonly y: number
  readonly type: ItemType
}

export interface BombGameConfig {
  readonly mapSize: number
  readonly bombTimer: number
  readonly explosionDuration: number
}

export interface BombGameState {
  readonly map: ReadonlyArray<ReadonlyArray<CellType>>
  readonly players: ReadonlyArray<Player>
  readonly bombs: ReadonlyArray<Bomb>
  readonly explosions: ReadonlyArray<Explosion>
  readonly darts: ReadonlyArray<Dart>
  readonly items: ReadonlyArray<Item>
  readonly tickCount: number
  readonly gameOver: boolean
  readonly winner: number | null
}
