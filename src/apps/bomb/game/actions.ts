import type {
  BombGameConfig,
  BombGameState,
  Bomb,
  Dart,
  ItemType,
  Player,
} from "./types.ts";
import { updatePlayer, isBlocked } from "./utils.ts";

export function movePlayer(
  state: BombGameState,
  playerIndex: number,
  dx: number,
  dy: number,
): BombGameState {
  const player = state.players[playerIndex];
  if (!player || !player.alive || player.trappedTimer > 0) return state;

  let updatedPlayer: Player = { ...player, lastDx: dx, lastDy: dy };
  const nx = updatedPlayer.x + dx;
  const ny = updatedPlayer.y + dy;

  if (isBlocked(state, nx, ny)) {
    return {
      ...state,
      players: updatePlayer(state.players, playerIndex, {
        lastDx: dx,
        lastDy: dy,
      }),
    };
  }

  updatedPlayer = { ...updatedPlayer, x: nx, y: ny };

  const pickedItem = state.items.find((item) => item.x === nx && item.y === ny);
  let items = state.items;
  if (pickedItem) {
    updatedPlayer = applyItem(updatedPlayer, pickedItem.type);
    items = state.items.filter((item) => item !== pickedItem);
  }

  let players = state.players.map((p) =>
    p.index === playerIndex ? updatedPlayer : p,
  );

  const trappedVictim = state.players.find(
    (p) => p.index !== playerIndex && p.alive && p.trappedTimer > 0 && p.x === nx && p.y === ny,
  );
  if (trappedVictim) {
    players = updatePlayer(players, trappedVictim.index, { alive: false, trappedTimer: 0 });
  }

  return { ...state, items, players };
}

function applyItem(player: Player, itemType: ItemType): Player {
  switch (itemType) {
    case "range":
      return { ...player, bombRange: Math.min(8, player.bombRange + 1) };
    case "bomb":
      return { ...player, maxBombs: Math.min(5, player.maxBombs + 1) };
    case "dart":
      return { ...player, darts: player.darts + 1 };
    case "needle":
      return { ...player, needles: player.needles + 1 };
  }
}

export function placeBomb(
  state: BombGameState,
  playerIndex: number,
  config: BombGameConfig,
): BombGameState {
  const player = state.players[playerIndex];
  if (!player || !player.alive || player.trappedTimer > 0) return state;
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

  return {
    ...state,
    bombs: [...state.bombs, bomb],
    players: updatePlayer(state.players, playerIndex, {
      activeBombs: player.activeBombs + 1,
    }),
  };
}

export function useNeedle(
  state: BombGameState,
  playerIndex: number,
): BombGameState {
  const player = state.players[playerIndex];
  if (!player || player.needles <= 0) return state;
  if (player.alive && player.trappedTimer <= 0) return state;

  return {
    ...state,
    players: updatePlayer(state.players, playerIndex, {
      alive: true,
      trappedTimer: 0,
      needles: player.needles - 1,
    }),
  };
}

export function throwDart(
  state: BombGameState,
  playerIndex: number,
  dx?: number,
  dy?: number,
): BombGameState {
  const player = state.players[playerIndex];
  if (!player || !player.alive || player.trappedTimer > 0 || player.darts <= 0) return state;

  const dart: Dart = {
    x: player.x,
    y: player.y,
    dx: dx ?? player.lastDx,
    dy: dy ?? player.lastDy,
    owner: playerIndex,
  };

  return {
    ...state,
    darts: [...state.darts, dart],
    players: updatePlayer(state.players, playerIndex, {
      darts: player.darts - 1,
    }),
  };
}
