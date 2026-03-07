import type {
  BombGameConfig,
  BombGameState,
  Bomb,
  Dart,
  Explosion,
  Item,
  ItemType,
  Player,
} from "./types.ts";
import { ITEM_DROP_CHANCE } from "./constants.ts";
import { generateMap } from "./map-gen.ts";

export function createInitialState(
  config: BombGameConfig,
  playerCount: number,
): BombGameState {
  const { map, spawns } = generateMap(config.mapSize, playerCount);

  const players: Player[] = spawns.map((spawn, i) => ({
    index: i,
    x: spawn.x,
    y: spawn.y,
    alive: true,
    bombRange: 2,
    maxBombs: 1,
    activeBombs: 0,
    darts: 0,
    lastDx: 1,
    lastDy: 0,
  }));

  return {
    map,
    players,
    bombs: [],
    explosions: [],
    darts: [],
    items: [],
    tickCount: 0,
    gameOver: false,
    winner: null,
  };
}

export function movePlayer(
  state: BombGameState,
  playerIndex: number,
  dx: number,
  dy: number,
): BombGameState {
  const player = state.players[playerIndex];
  if (!player || !player.alive) return state;

  // Track direction even if move fails
  let updatedPlayer: Player = { ...player, lastDx: dx, lastDy: dy };

  const nx = updatedPlayer.x + dx;
  const ny = updatedPlayer.y + dy;

  const row = state.map[ny];
  if (!row)
    return {
      ...state,
      players: state.players.map((p) =>
        p.index === playerIndex ? updatedPlayer : p,
      ),
    };
  const cell = row[nx];
  if (cell === undefined || cell === "wall" || cell === "block")
    return {
      ...state,
      players: state.players.map((p) =>
        p.index === playerIndex ? updatedPlayer : p,
      ),
    };
  if (state.bombs.some((b) => b.x === nx && b.y === ny))
    return {
      ...state,
      players: state.players.map((p) =>
        p.index === playerIndex ? updatedPlayer : p,
      ),
    };

  updatedPlayer = { ...updatedPlayer, x: nx, y: ny };

  // Pick up item
  const pickedItem = state.items.find((item) => item.x === nx && item.y === ny);
  if (pickedItem) {
    updatedPlayer = applyItem(updatedPlayer, pickedItem.type);
    state = {
      ...state,
      items: state.items.filter((item) => item !== pickedItem),
    };
  }

  const newPlayers = state.players.map((p) =>
    p.index === playerIndex ? updatedPlayer : p,
  );

  return { ...state, players: newPlayers };
}

function applyItem(player: Player, itemType: ItemType): Player {
  switch (itemType) {
    case "range":
      return { ...player, bombRange: Math.min(8, player.bombRange + 1) };
    case "bomb":
      return { ...player, maxBombs: Math.min(5, player.maxBombs + 1) };
    case "dart":
      return { ...player, darts: player.darts + 1 };
  }
}

export function placeBomb(
  state: BombGameState,
  playerIndex: number,
  config: BombGameConfig,
): BombGameState {
  const player = state.players[playerIndex];
  if (!player || !player.alive) return state;
  if (player.activeBombs >= player.maxBombs) return state;
  if (state.bombs.some((b) => b.x === player.x && b.y === player.y))
    return state;

  const bomb: Bomb = {
    x: player.x,
    y: player.y,
    owner: playerIndex,
    timer: config.bombTimer,
    range: player.bombRange,
  };

  const newPlayers = state.players.map((p) =>
    p.index === playerIndex ? { ...p, activeBombs: p.activeBombs + 1 } : p,
  );

  return { ...state, bombs: [...state.bombs, bomb], players: newPlayers };
}

export function throwDart(
  state: BombGameState,
  playerIndex: number,
  dx?: number,
  dy?: number,
): BombGameState {
  const player = state.players[playerIndex];
  if (!player || !player.alive || player.darts <= 0) return state;

  const dart: Dart = {
    x: player.x,
    y: player.y,
    dx: dx ?? player.lastDx,
    dy: dy ?? player.lastDy,
    owner: playerIndex,
  };

  const newPlayers = state.players.map((p) =>
    p.index === playerIndex ? { ...p, darts: p.darts - 1 } : p,
  );

  return { ...state, darts: [...state.darts, dart], players: newPlayers };
}

export function tick(
  state: BombGameState,
  config: BombGameConfig,
): BombGameState {
  if (state.gameOver) return state;

  let current = { ...state, tickCount: state.tickCount + 1 };

  // ── 1. Move darts & check hits (2 steps per tick, checking each cell) ──
  let forcedDetonations: Bomb[] = [];
  let activeDarts = [...current.darts];
  const survivingDarts: Dart[] = [];

  for (const dart of activeDarts) {
    let cx = dart.x;
    let cy = dart.y;
    let consumed = false;
    let blocked = false;

    for (let step = 0; step < 2; step++) {
      const nx = cx + dart.dx;
      const ny = cy + dart.dy;

      const cell = current.map[ny]?.[nx];
      if (cell === undefined || cell === "wall" || cell === "block") {
        blocked = true;
        break;
      }

      // Hit a bomb? → force detonate
      const hitBomb = current.bombs.find((b) => b.x === nx && b.y === ny);
      if (hitBomb) {
        forcedDetonations.push(hitBomb);
        current = {
          ...current,
          bombs: current.bombs.filter((b) => b !== hitBomb),
        };
        consumed = true;
        break;
      }

      cx = nx;
      cy = ny;
    }

    if (!consumed && !blocked) {
      survivingDarts.push({ ...dart, x: cx, y: cy });
    }
  }

  current = { ...current, darts: survivingDarts };

  // ── 2. Decrement bomb timers ──
  const explodingBombs: Bomb[] = [...forcedDetonations];
  const remainingBombs: Bomb[] = [];

  for (const bomb of current.bombs) {
    const updated = { ...bomb, timer: bomb.timer - 1 };
    if (updated.timer <= 0) {
      explodingBombs.push(updated);
    } else {
      remainingBombs.push(updated);
    }
  }

  current = { ...current, bombs: remainingBombs };

  // ── 3. Process explosions (chain reaction) ──
  let newExplosions: Explosion[] = [...current.explosions];
  const newMap = current.map.map((row) => [...row]);
  let newItems = [...current.items];
  const processedPositions = new Set<string>();

  const queue = [...explodingBombs];
  while (queue.length > 0) {
    const bomb = queue.shift()!;
    const key = `${bomb.x},${bomb.y}`;
    if (processedPositions.has(key)) continue;
    processedPositions.add(key);

    current = {
      ...current,
      players: current.players.map((p) =>
        p.index === bomb.owner
          ? { ...p, activeBombs: Math.max(0, p.activeBombs - 1) }
          : p,
      ),
    };

    newExplosions.push({
      x: bomb.x,
      y: bomb.y,
      timer: config.explosionDuration,
      owner: bomb.owner,
    });

    const dirs: [number, number][] = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [ddx, ddy] of dirs) {
      for (let dist = 1; dist <= bomb.range; dist++) {
        const ex = bomb.x + ddx * dist;
        const ey = bomb.y + ddy * dist;

        const cell = newMap[ey]?.[ex];
        if (cell === undefined || cell === "wall") break;

        newExplosions.push({ x: ex, y: ey, timer: config.explosionDuration, owner: bomb.owner });

        if (cell === "block") {
          newMap[ey]![ex] = "empty";
          if (Math.random() < ITEM_DROP_CHANCE) {
            const types: ItemType[] = ["range", "bomb", "dart"];
            const type = types[Math.floor(Math.random() * types.length)]!;
            newItems.push({ x: ex, y: ey, type });
          }
          break;
        }

        const chainBomb = current.bombs.find((b) => b.x === ex && b.y === ey);
        if (chainBomb) {
          queue.push({ ...chainBomb, timer: 0 });
          current = {
            ...current,
            bombs: current.bombs.filter((b) => b !== chainBomb),
          };
        }
      }
    }
  }

  // ── 4. Clean up ──
  // Track which positions have explosions and from which owners
  const explosionOwners = new Map<string, Set<number>>();
  for (const e of newExplosions) {
    const key = `${e.x},${e.y}`;
    if (!explosionOwners.has(key)) explosionOwners.set(key, new Set());
    explosionOwners.get(key)!.add(e.owner);
  }

  newExplosions = newExplosions
    .map((e) => ({ ...e, timer: e.timer - 1 }))
    .filter((e) => e.timer > 0);

  const newPlayers = current.players.map((p) => {
    if (!p.alive) return p;
    const key = `${p.x},${p.y}`;
    const owners = explosionOwners.get(key);
    if (!owners) return p;
    // Player 0 (human) dies from any explosion
    // Bots only die from human (player 0) explosions
    if (p.index === 0 || owners.has(0)) {
      return { ...p, alive: false };
    }
    return p;
  });

  const alivePlayers = newPlayers.filter((p) => p.alive);
  const gameOver = alivePlayers.length <= 1;
  const winner =
    gameOver && alivePlayers.length === 1 ? alivePlayers[0]!.index : null;

  return {
    ...current,
    map: newMap,
    players: newPlayers,
    bombs: current.bombs,
    explosions: newExplosions,
    items: newItems,
    gameOver,
    winner,
  };
}

export function getAlivePlayers(state: BombGameState): ReadonlyArray<Player> {
  return state.players.filter((p) => p.alive);
}
