import type { BombGameConfig, BombGameState, Player } from "./types.ts";
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

export function getAlivePlayers(state: BombGameState): ReadonlyArray<Player> {
  return state.players.filter((p) => p.alive);
}
