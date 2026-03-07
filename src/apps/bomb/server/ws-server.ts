import type { ServerWebSocket } from "bun"
import type { BombGameConfig, BombGameState } from "../game/index.ts"
import { createInitialState, movePlayer, placeBomb, throwDart, tick } from "../game/index.ts"
import { TICK_RATE } from "../game/constants.ts"
import type { BombClientMessage, BombServerMessage } from "./protocol.ts"
import { DEFAULT_BOMB_PORT } from "./protocol.ts"

interface Player {
  name: string
  ws: ServerWebSocket<{ playerId: number }>
}

interface Room {
  players: Player[]
  config: BombGameConfig
  state: BombGameState | null
  started: boolean
  tickInterval: ReturnType<typeof setInterval> | null
}

function send(ws: ServerWebSocket<{ playerId: number }>, msg: BombServerMessage) {
  ws.send(JSON.stringify(msg))
}

function broadcast(room: Room, msg: BombServerMessage) {
  const raw = JSON.stringify(msg)
  for (const p of room.players) p.ws.send(raw)
}

export function startBombServer(initialConfig: BombGameConfig, port: number = DEFAULT_BOMB_PORT) {
  const room: Room = {
    players: [],
    config: initialConfig,
    state: null,
    started: false,
    tickInterval: null,
  }

  // @ts-expect-error Bun.serve generic arity varies across @types/bun versions
  const server = Bun.serve<{ playerId: number }>({
    hostname: "0.0.0.0",
    port,
    fetch(req: Request, server: { upgrade: (req: Request, opts: { data: { playerId: number } }) => boolean }) {
      const upgraded = server.upgrade(req, { data: { playerId: room.players.length } })
      if (!upgraded) return new Response("WebSocket upgrade failed", { status: 400 })
    },
    websocket: {
      open() {},
      message(ws: ServerWebSocket<{ playerId: number }>, raw: string | Buffer) {
        const msg: BombClientMessage = JSON.parse(raw as string)
        handleMessage(room, ws, msg)
      },
      close(ws: ServerWebSocket<{ playerId: number }>) {
        room.players = room.players.filter((p) => p.ws !== ws)
        if (room.players.length === 0 && room.tickInterval) {
          clearInterval(room.tickInterval)
          room.tickInterval = null
          room.started = false
          room.state = null
        } else {
          broadcast(room, { type: "lobby", players: room.players.map((p) => ({ name: p.name })) })
        }
      },
    },
  })

  return { server, port: server.port }
}

function handleMessage(
  room: Room,
  ws: ServerWebSocket<{ playerId: number }>,
  msg: BombClientMessage,
) {
  switch (msg.type) {
    case "join": {
      if (room.started) { send(ws, { type: "error", message: "Game already started" }); return }
      room.players.push({ name: msg.playerName, ws })
      send(ws, { type: "welcome", playerId: ws.data.playerId, config: room.config })
      broadcast(room, { type: "lobby", players: room.players.map((p) => ({ name: p.name })) })
      break
    }

    case "update_config": {
      if (room.started) return
      room.config = msg.config
      for (const p of room.players) {
        send(p.ws, { type: "welcome", playerId: p.ws.data.playerId, config: room.config })
      }
      break
    }

    case "start_game": {
      if (room.started || room.players.length < 2) return
      room.state = createInitialState(room.config, room.players.length)
      room.started = true
      broadcast(room, { type: "game_state", state: room.state })

      // Start tick loop
      room.tickInterval = setInterval(() => {
        if (!room.state || room.state.gameOver) {
          if (room.tickInterval) clearInterval(room.tickInterval)
          return
        }
        room.state = tick(room.state, room.config)
        if (room.state.gameOver) {
          broadcast(room, { type: "game_over", state: room.state })
          if (room.tickInterval) clearInterval(room.tickInterval)
          room.tickInterval = null
          room.started = false
        } else {
          broadcast(room, { type: "game_state", state: room.state })
        }
      }, TICK_RATE)
      break
    }

    case "move": {
      if (!room.state || room.state.gameOver) return
      room.state = movePlayer(room.state, ws.data.playerId, msg.dx, msg.dy)
      broadcast(room, { type: "game_state", state: room.state })
      break
    }

    case "bomb": {
      if (!room.state || room.state.gameOver) return
      room.state = placeBomb(room.state, ws.data.playerId, room.config)
      broadcast(room, { type: "game_state", state: room.state })
      break
    }

    case "dart": {
      if (!room.state || room.state.gameOver) return
      room.state = throwDart(room.state, ws.data.playerId)
      broadcast(room, { type: "game_state", state: room.state })
      break
    }
  }
}
