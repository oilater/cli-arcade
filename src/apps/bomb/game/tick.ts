import type {
  BombGameConfig,
  BombGameState,
  Bomb,
  CellType,
  Dart,
  Explosion,
  Item,
  ItemType,
  Player,
} from "./types.ts";
import { ITEM_DROP_CHANCE, TRAPPED_DURATION } from "./constants.ts";
import { updatePlayer } from "./utils.ts";

interface DartResult {
  readonly darts: Dart[];
  readonly forcedDetonations: Bomb[];
  readonly remainingBombs: ReadonlyArray<Bomb>;
}

function moveDarts(state: BombGameState): DartResult {
  const forcedDetonations: Bomb[] = [];
  let bombs = [...state.bombs];
  const survivingDarts: Dart[] = [];

  for (const dart of state.darts) {
    let cx = dart.x;
    let cy = dart.y;
    let consumed = false;
    let blocked = false;

    for (let step = 0; step < 2; step++) {
      const nx = cx + dart.dx;
      const ny = cy + dart.dy;

      const cell = state.map[ny]?.[nx];
      if (cell === undefined || cell === "wall" || cell === "block") {
        blocked = true;
        break;
      }

      const hitBomb = bombs.find((b) => b.x === nx && b.y === ny);
      if (hitBomb) {
        forcedDetonations.push(hitBomb);
        bombs = bombs.filter((b) => b !== hitBomb);
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

  return { darts: survivingDarts, forcedDetonations, remainingBombs: bombs };
}

interface BombTickResult {
  readonly exploding: Bomb[];
  readonly remaining: Bomb[];
}

function tickBombs(
  bombs: ReadonlyArray<Bomb>,
  forcedDetonations: Bomb[],
): BombTickResult {
  const exploding: Bomb[] = [...forcedDetonations];
  const remaining: Bomb[] = [];

  for (const bomb of bombs) {
    const updated = { ...bomb, timer: bomb.timer - 1 };
    if (updated.timer <= 0) {
      exploding.push(updated);
    } else {
      remaining.push(updated);
    }
  }

  return { exploding, remaining };
}

interface ExplosionResult {
  readonly explosions: Explosion[];
  readonly map: CellType[][];
  readonly items: ReadonlyArray<Item>;
  readonly bombs: Bomb[];
  readonly players: ReadonlyArray<Player>;
}

function processExplosions(
  state: BombGameState,
  config: BombGameConfig,
  explodingBombs: Bomb[],
  remainingBombs: Bomb[],
): ExplosionResult {
  const newExplosions: Explosion[] = [...state.explosions];
  const newMap = state.map.map((row) => [...row]);
  const newItems = [...state.items];
  let bombs = [...remainingBombs];
  let players = state.players;
  const processedPositions = new Set<string>();

  const queue = [...explodingBombs];
  while (queue.length > 0) {
    const bomb = queue.shift()!;
    const key = `${bomb.x},${bomb.y}`;
    if (processedPositions.has(key)) continue;
    processedPositions.add(key);

    players = updatePlayer(players, bomb.owner, {
      activeBombs: Math.max(0, (players[bomb.owner]?.activeBombs ?? 1) - 1),
    });

    newExplosions.push({
      x: bomb.x,
      y: bomb.y,
      timer: config.explosionDuration,
      owner: bomb.owner,
    });

    const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [ddx, ddy] of dirs) {
      for (let dist = 1; dist <= bomb.range; dist++) {
        const ex = bomb.x + ddx * dist;
        const ey = bomb.y + ddy * dist;

        const cell = newMap[ey]?.[ex];
        if (cell === undefined || cell === "wall") break;

        newExplosions.push({
          x: ex,
          y: ey,
          timer: config.explosionDuration,
          owner: bomb.owner,
        });

        if (cell === "block") {
          newMap[ey]![ex] = "empty";
          if (Math.random() < ITEM_DROP_CHANCE) {
            const roll = Math.random();
            const type: ItemType = roll < 0.1 ? "needle" : roll < 0.4 ? "range" : roll < 0.7 ? "bomb" : "dart";
            newItems.push({ x: ex, y: ey, type });
          }
          break;
        }

        const chainBomb = bombs.find((b) => b.x === ex && b.y === ey);
        if (chainBomb) {
          queue.push({ ...chainBomb, timer: 0 });
          bombs = bombs.filter((b) => b !== chainBomb);
        }
      }
    }
  }

  return { explosions: newExplosions, map: newMap, items: newItems, bombs, players };
}

function trapPlayers(
  players: ReadonlyArray<Player>,
  explosions: Explosion[],
  soloHumanIndex?: number,
): Player[] {
  const explosionOwners = new Map<string, Set<number>>();
  for (const e of explosions) {
    const key = `${e.x},${e.y}`;
    if (!explosionOwners.has(key)) explosionOwners.set(key, new Set());
    explosionOwners.get(key)!.add(e.owner);
  }

  return players.map((p) => {
    if (!p.alive || p.trappedTimer > 0) return p;
    const key = `${p.x},${p.y}`;
    const owners = explosionOwners.get(key);
    if (!owners) return p;
    if (soloHumanIndex !== undefined && p.index !== soloHumanIndex) {
      if (!owners.has(soloHumanIndex)) return p;
    }
    return { ...p, trappedTimer: TRAPPED_DURATION };
  });
}

function tickTrapped(
  players: ReadonlyArray<Player>,
): { players: Player[]; gameOver: boolean; winner: number | null } {
  const newPlayers = players.map((p) => {
    if (!p.alive || p.trappedTimer <= 0) return p;
    const next = p.trappedTimer - 1;
    if (next <= 0) return { ...p, alive: false, trappedTimer: 0 };
    return { ...p, trappedTimer: next };
  });

  const alivePlayers = newPlayers.filter((p) => p.alive);
  const canRevive = newPlayers.some((p) => !p.alive && p.needles > 0);
  const trapped = newPlayers.some((p) => p.alive && p.trappedTimer > 0);
  const gameOver = !canRevive && !trapped && alivePlayers.length <= 1;
  const winner = gameOver && alivePlayers.length === 1 ? alivePlayers[0]!.index : null;

  return { players: newPlayers, gameOver, winner };
}

function fadeExplosions(explosions: Explosion[]): Explosion[] {
  return explosions
    .map((e) => ({ ...e, timer: e.timer - 1 }))
    .filter((e) => e.timer > 0);
}

export function tick(
  state: BombGameState,
  config: BombGameConfig,
  soloHumanIndex?: number,
): BombGameState {
  if (state.gameOver) return state;

  const current = { ...state, tickCount: state.tickCount + 1 };

  const dartResult = moveDarts(current);
  const bombResult = tickBombs(dartResult.remainingBombs, dartResult.forcedDetonations);
  const explosionResult = processExplosions(
    { ...current, explosions: current.explosions, items: current.items },
    config,
    bombResult.exploding,
    bombResult.remaining,
  );
  const trappedPlayers = trapPlayers(explosionResult.players, explosionResult.explosions, soloHumanIndex);
  const deathResult = tickTrapped(trappedPlayers);
  const finalExplosions = fadeExplosions(explosionResult.explosions);

  return {
    ...current,
    map: explosionResult.map,
    players: deathResult.players,
    bombs: explosionResult.bombs,
    explosions: finalExplosions,
    darts: dartResult.darts,
    items: explosionResult.items,
    gameOver: deathResult.gameOver,
    winner: deathResult.winner,
  };
}
