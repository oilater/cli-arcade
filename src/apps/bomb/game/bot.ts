import type { BombGameConfig, BombGameState, Player } from "./types.ts";
import { movePlayer, placeBomb } from "./actions.ts";

interface BotAction {
  readonly type: "move" | "bomb" | "idle";
  readonly dx?: number;
  readonly dy?: number;
}

const DIRS: ReadonlyArray<[number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
const EXPLOSION_COOLDOWN = 8;

function isDangerous(
  state: BombGameState,
  x: number,
  y: number,
  recentExplosions: ReadonlyMap<string, number>,
): boolean {
  const cooldownEnd = recentExplosions.get(`${x},${y}`);
  if (cooldownEnd !== undefined && state.tickCount < cooldownEnd) return true;

  for (const e of state.explosions) {
    if (e.x === x && e.y === y) return true;
  }

  for (const bomb of state.bombs) {
    if (bomb.x === x && bomb.y === y) return true;
    for (const [dx, dy] of DIRS) {
      for (let dist = 1; dist <= bomb.range; dist++) {
        const bx = bomb.x + dx * dist;
        const by = bomb.y + dy * dist;
        const cell = state.map[by]?.[bx];
        if (cell === undefined || cell === "wall" || cell === "block") break;
        if (bx === x && by === y) return true;
      }
    }
  }

  return false;
}

function canWalk(state: BombGameState, x: number, y: number): boolean {
  const cell = state.map[y]?.[x];
  if (cell === undefined || cell === "wall" || cell === "block") return false;
  if (state.bombs.some((b) => b.x === x && b.y === y)) return false;
  return true;
}

function findEscapeDir(
  state: BombGameState,
  startX: number,
  startY: number,
  recentExplosions: ReadonlyMap<string, number>,
): [number, number] | null {
  const visited = new Set<string>();
  const queue: Array<{
    x: number;
    y: number;
    firstDx: number;
    firstDy: number;
    steps: number;
  }> = [];
  visited.add(`${startX},${startY}`);

  for (const [dx, dy] of DIRS) {
    const nx = startX + dx;
    const ny = startY + dy;
    if (!canWalk(state, nx, ny)) continue;
    const key = `${nx},${ny}`;
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push({ x: nx, y: ny, firstDx: dx, firstDy: dy, steps: 1 });
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.steps > 15) continue;

    if (!isDangerous(state, cur.x, cur.y, recentExplosions)) {
      return [cur.firstDx, cur.firstDy];
    }

    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (!canWalk(state, nx, ny)) continue;
      visited.add(key);
      queue.push({
        x: nx,
        y: ny,
        firstDx: cur.firstDx,
        firstDy: cur.firstDy,
        steps: cur.steps + 1,
      });
    }
  }

  return null;
}

function countEscapeRoutes(
  state: BombGameState,
  player: Player,
  recentExplosions: ReadonlyMap<string, number>,
): number {
  let routes = 0;
  for (const [dx, dy] of DIRS) {
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!canWalk(state, nx, ny)) continue;

    const visited = new Set<string>();
    visited.add(`${player.x},${player.y}`);
    visited.add(`${nx},${ny}`);
    const queue: Array<{ x: number; y: number; steps: number }> = [
      { x: nx, y: ny, steps: 1 },
    ];
    let found = false;

    while (queue.length > 0 && !found) {
      const cur = queue.shift()!;
      if (cur.steps > 10) continue;

      if (!isDangerous(state, cur.x, cur.y, recentExplosions)) {
        found = true;
        break;
      }

      for (const [ddx, ddy] of DIRS) {
        const nnx = cur.x + ddx;
        const nny = cur.y + ddy;
        const key = `${nnx},${nny}`;
        if (visited.has(key)) continue;
        if (!canWalk(state, nnx, nny)) continue;
        visited.add(key);
        queue.push({ x: nnx, y: nny, steps: cur.steps + 1 });
      }
    }

    if (found) routes++;
  }
  return routes;
}

function hasBlockNearby(state: BombGameState, player: Player): boolean {
  for (const [dx, dy] of DIRS) {
    for (let dist = 1; dist <= player.bombRange; dist++) {
      const nx = player.x + dx * dist;
      const ny = player.y + dy * dist;
      const cell = state.map[ny]?.[nx];
      if (cell === undefined || cell === "wall") break;
      if (cell === "block") return true;
    }
  }
  return false;
}

function hasPlayerNearby(state: BombGameState, player: Player): boolean {
  for (const [dx, dy] of DIRS) {
    for (let dist = 1; dist <= player.bombRange; dist++) {
      const nx = player.x + dx * dist;
      const ny = player.y + dy * dist;
      const cell = state.map[ny]?.[nx];
      if (cell === undefined || cell === "wall" || cell === "block") break;
      if (
        state.players.some(
          (p) =>
            p.alive && p.index !== player.index && p.x === nx && p.y === ny,
        )
      )
        return true;
    }
  }
  return false;
}

function decideBotAction(
  state: BombGameState,
  player: Player,
  recentExplosions: ReadonlyMap<string, number>,
): BotAction {
  const inDanger = isDangerous(state, player.x, player.y, recentExplosions);

  if (inDanger) {
    const escapeDir = findEscapeDir(
      state,
      player.x,
      player.y,
      recentExplosions,
    );
    if (escapeDir) {
      return { type: "move", dx: escapeDir[0], dy: escapeDir[1] };
    }
    return { type: "idle" };
  }

  if (
    player.activeBombs < player.maxBombs &&
    !state.bombs.some((b) => b.x === player.x && b.y === player.y)
  ) {
    if (hasPlayerNearby(state, player) || hasBlockNearby(state, player)) {
      if (countEscapeRoutes(state, player, recentExplosions) >= 2) {
        return { type: "bomb" };
      }
    }
  }

  const itemDir = DIRS.find(([dx, dy]) => {
    const nx = player.x + dx;
    const ny = player.y + dy;
    return (
      canWalk(state, nx, ny) &&
      !isDangerous(state, nx, ny, recentExplosions) &&
      state.items.some((item) => item.x === nx && item.y === ny)
    );
  });
  if (itemDir) {
    return { type: "move", dx: itemDir[0], dy: itemDir[1] };
  }

  const blockDirs = DIRS.filter(([dx, dy]) => {
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!canWalk(state, nx, ny)) return false;
    if (isDangerous(state, nx, ny, recentExplosions)) return false;
    for (let dist = 2; dist <= 4; dist++) {
      const cell = state.map[player.y + dy * dist]?.[player.x + dx * dist];
      if (cell === "block") return true;
    }
    return false;
  });
  if (blockDirs.length > 0) {
    const [dx, dy] = blockDirs[Math.floor(Math.random() * blockDirs.length)]!;
    return { type: "move", dx, dy };
  }

  const safeDirs = DIRS.filter(([dx, dy]) => {
    const nx = player.x + dx;
    const ny = player.y + dy;
    return (
      canWalk(state, nx, ny) && !isDangerous(state, nx, ny, recentExplosions)
    );
  });
  if (safeDirs.length > 0 && Math.random() < 0.4) {
    const [dx, dy] = safeDirs[Math.floor(Math.random() * safeDirs.length)]!;
    return { type: "move", dx, dy };
  }

  return { type: "idle" };
}

/** Create a bot brain instance with its own explosion memory */
export function createBotBrain() {
  const recentExplosions = new Map<string, number>();

  return function tickBots(
    state: BombGameState,
    config: BombGameConfig,
    humanPlayerIndex: number,
  ): BombGameState {
    for (const e of state.explosions) {
      recentExplosions.set(
        `${e.x},${e.y}`,
        state.tickCount + EXPLOSION_COOLDOWN,
      );
    }
    for (const [key, tick] of recentExplosions) {
      if (state.tickCount >= tick) recentExplosions.delete(key);
    }

    let current = state;

    for (const player of current.players) {
      if (player.index === humanPlayerIndex) continue;
      if (!player.alive) continue;

      const action = decideBotAction(current, player, recentExplosions);

      switch (action.type) {
        case "move":
          if (action.dx !== undefined && action.dy !== undefined) {
            current = movePlayer(current, player.index, action.dx, action.dy);
          }
          break;
        case "bomb": {
          current = placeBomb(current, player.index, config);
          const updatedPlayer = current.players[player.index]!;
          const escapeDir = findEscapeDir(
            current,
            updatedPlayer.x,
            updatedPlayer.y,
            recentExplosions,
          );
          if (escapeDir) {
            current = movePlayer(
              current,
              player.index,
              escapeDir[0],
              escapeDir[1],
            );
          }
          break;
        }
      }
    }

    return current;
  };
}
