import type { BombGameConfig, BombGameState, Player } from "./types.ts"
import { movePlayer, placeBomb } from "./state.ts"

interface BotAction {
  readonly type: "move" | "bomb" | "idle"
  readonly dx?: number
  readonly dy?: number
}

const DIRS: ReadonlyArray<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]]

/** Check if a position is in the blast path of any bomb */
function isInBlastPath(state: BombGameState, x: number, y: number): boolean {
  for (const e of state.explosions) {
    if (e.x === x && e.y === y) return true
  }

  for (const bomb of state.bombs) {
    if (bomb.x === x && bomb.y === y) return true
    for (const [dx, dy] of DIRS) {
      for (let dist = 1; dist <= bomb.range; dist++) {
        const bx = bomb.x + dx * dist
        const by = bomb.y + dy * dist
        const cell = state.map[by]?.[bx]
        if (cell === undefined || cell === "wall" || cell === "block") break
        if (bx === x && by === y) return true
      }
    }
  }

  return false
}

/** Check if a position is in blast of a hypothetical bomb at (bx, by) */
function wouldBeInBlast(state: BombGameState, bx: number, by: number, range: number, tx: number, ty: number): boolean {
  if (bx === tx && by === ty) return true
  for (const [dx, dy] of DIRS) {
    for (let dist = 1; dist <= range; dist++) {
      const ex = bx + dx * dist
      const ey = by + dy * dist
      const cell = state.map[ey]?.[ex]
      if (cell === undefined || cell === "wall" || cell === "block") break
      if (ex === tx && ey === ty) return true
    }
  }
  return false
}

function canWalk(state: BombGameState, x: number, y: number): boolean {
  const cell = state.map[y]?.[x]
  if (cell === undefined || cell === "wall" || cell === "block") return false
  if (state.bombs.some((b) => b.x === x && b.y === y)) return false
  return true
}

/** BFS to find if there's a safe cell reachable within `maxSteps` */
function canReachSafety(
  state: BombGameState,
  startX: number,
  startY: number,
  bombX: number,
  bombY: number,
  bombRange: number,
  maxSteps: number,
): boolean {
  const visited = new Set<string>()
  const queue: Array<{ x: number; y: number; steps: number }> = [{ x: startX, y: startY, steps: 0 }]
  visited.add(`${startX},${startY}`)

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.steps > maxSteps) continue

    // This cell is safe from the hypothetical bomb AND existing bombs
    if (!wouldBeInBlast(state, bombX, bombY, bombRange, cur.x, cur.y) && !isInBlastPath(state, cur.x, cur.y)) {
      return true
    }

    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      const key = `${nx},${ny}`
      if (visited.has(key)) continue
      if (!canWalk(state, nx, ny)) continue
      // Don't walk through the bomb position
      if (nx === bombX && ny === bombY) continue
      visited.add(key)
      queue.push({ x: nx, y: ny, steps: cur.steps + 1 })
    }
  }

  return false
}

/** BFS to find the best direction to escape to safety */
function findEscapeDir(state: BombGameState, player: Player): [number, number] | null {
  const visited = new Set<string>()
  const queue: Array<{ x: number; y: number; firstDx: number; firstDy: number; steps: number }> = []
  visited.add(`${player.x},${player.y}`)

  for (const [dx, dy] of DIRS) {
    const nx = player.x + dx
    const ny = player.y + dy
    if (!canWalk(state, nx, ny)) continue
    const key = `${nx},${ny}`
    if (visited.has(key)) continue
    visited.add(key)
    queue.push({ x: nx, y: ny, firstDx: dx, firstDy: dy, steps: 1 })
  }

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.steps > 6) continue

    if (!isInBlastPath(state, cur.x, cur.y)) {
      return [cur.firstDx, cur.firstDy]
    }

    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      const key = `${nx},${ny}`
      if (visited.has(key)) continue
      if (!canWalk(state, nx, ny)) continue
      visited.add(key)
      queue.push({ x: nx, y: ny, firstDx: cur.firstDx, firstDy: cur.firstDy, steps: cur.steps + 1 })
    }
  }

  return null
}

function hasBlockNearby(state: BombGameState, player: Player): boolean {
  for (const [dx, dy] of DIRS) {
    for (let dist = 1; dist <= player.bombRange; dist++) {
      const nx = player.x + dx * dist
      const ny = player.y + dy * dist
      const cell = state.map[ny]?.[nx]
      if (cell === undefined || cell === "wall") break
      if (cell === "block") return true
    }
  }
  return false
}

function hasPlayerNearby(state: BombGameState, player: Player): boolean {
  for (const [dx, dy] of DIRS) {
    for (let dist = 1; dist <= player.bombRange; dist++) {
      const nx = player.x + dx * dist
      const ny = player.y + dy * dist
      const cell = state.map[ny]?.[nx]
      if (cell === undefined || cell === "wall" || cell === "block") break
      if (state.players.some((p) => p.alive && p.index !== player.index && p.x === nx && p.y === ny)) return true
    }
  }
  return false
}

function decideBotAction(state: BombGameState, player: Player): BotAction {
  const inDanger = isInBlastPath(state, player.x, player.y)

  // Priority 1: Escape danger
  if (inDanger) {
    const escapeDir = findEscapeDir(state, player)
    if (escapeDir) {
      return { type: "move", dx: escapeDir[0], dy: escapeDir[1] }
    }
    // No safe path found, try any walkable cell
    const walkable = DIRS.filter(([dx, dy]) => canWalk(state, player.x + dx, player.y + dy))
    if (walkable.length > 0) {
      const [dx, dy] = walkable[Math.floor(Math.random() * walkable.length)]!
      return { type: "move", dx, dy }
    }
    return { type: "idle" }
  }

  // Priority 2: Place bomb if near target AND can escape the blast
  if (player.activeBombs < player.maxBombs && !state.bombs.some((b) => b.x === player.x && b.y === player.y)) {
    if (hasPlayerNearby(state, player) || hasBlockNearby(state, player)) {
      if (canReachSafety(state, player.x, player.y, player.x, player.y, player.bombRange, 4)) {
        return { type: "bomb" }
      }
    }
  }

  // Priority 3: Pick up nearby items
  const itemDir = DIRS.find(([dx, dy]) => {
    const nx = player.x + dx
    const ny = player.y + dy
    return canWalk(state, nx, ny) && !isInBlastPath(state, nx, ny) && state.items.some((item) => item.x === nx && item.y === ny)
  })
  if (itemDir) {
    return { type: "move", dx: itemDir[0], dy: itemDir[1] }
  }

  // Priority 4: Walk toward blocks (to destroy them)
  const blockDirs = DIRS.filter(([dx, dy]) => {
    const nx = player.x + dx
    const ny = player.y + dy
    if (!canWalk(state, nx, ny)) return false
    if (isInBlastPath(state, nx, ny)) return false
    for (let dist = 2; dist <= 4; dist++) {
      const cell = state.map[player.y + dy * dist]?.[player.x + dx * dist]
      if (cell === "block") return true
    }
    return false
  })
  if (blockDirs.length > 0) {
    const [dx, dy] = blockDirs[Math.floor(Math.random() * blockDirs.length)]!
    return { type: "move", dx, dy }
  }

  // Priority 5: Random safe walk
  const safeDirs = DIRS.filter(([dx, dy]) => {
    const nx = player.x + dx
    const ny = player.y + dy
    return canWalk(state, nx, ny) && !isInBlastPath(state, nx, ny)
  })
  if (safeDirs.length > 0 && Math.random() < 0.4) {
    const [dx, dy] = safeDirs[Math.floor(Math.random() * safeDirs.length)]!
    return { type: "move", dx, dy }
  }

  return { type: "idle" }
}

export function tickBots(
  state: BombGameState,
  config: BombGameConfig,
  humanPlayerIndex: number,
): BombGameState {
  let current = state

  for (const player of current.players) {
    if (player.index === humanPlayerIndex) continue
    if (!player.alive) continue

    // Bots act every 3 ticks, but react to danger every tick
    const inDanger = isInBlastPath(current, player.x, player.y)
    if (!inDanger && current.tickCount % 3 !== player.index % 3) continue

    const action = decideBotAction(current, player)

    switch (action.type) {
      case "move":
        if (action.dx !== undefined && action.dy !== undefined) {
          current = movePlayer(current, player.index, action.dx, action.dy)
        }
        break
      case "bomb":
        current = placeBomb(current, player.index, config)
        break
    }
  }

  return current
}
