import type { ServerWebSocket } from "bun"
import type { GameConfig } from "../apps/game/game/index.ts"
import {
  createInitialState,
  moveCursor,
  selectCell,
  eliminatePlayer,
  endTurn,
  isGameOver,
} from "../apps/game/game/index.ts"
import type { GameState } from "../apps/game/game/index.ts"
import type { ClientMessage, ServerMessage } from "./protocol.ts"
import { DEFAULT_PORT } from "./protocol.ts"

interface Player {
  name: string
  ws: ServerWebSocket<{ playerId: number }>
}

interface Room {
  players: Player[]
  config: GameConfig
  state: GameState | null
  started: boolean
}

function send(ws: ServerWebSocket<{ playerId: number }>, msg: ServerMessage) {
  ws.send(JSON.stringify(msg))
}

function broadcast(room: Room, msg: ServerMessage) {
  const raw = JSON.stringify(msg)
  for (const p of room.players) {
    p.ws.send(raw)
  }
}

function broadcastLobby(room: Room) {
  broadcast(room, {
    type: "lobby",
    players: room.players.map((p) => ({ name: p.name, ready: true })),
  })
}

function broadcastGameState(room: Room) {
  if (!room.state) return
  for (const p of room.players) {
    send(p.ws, {
      type: "game_state",
      state: createPlayerView(room.state, p.ws.data.playerId),
      yourPlayer: p.ws.data.playerId,
    })
  }
}

function createPlayerView(state: GameState, playerId: number): GameState {
  // Each player only sees their own cells and the cursor
  const maskedGrid = state.grid.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === playerId) return cell
      return null // hide other players' cells
    })
  )
  return { ...state, grid: maskedGrid }
}

export function startServer(initialConfig: GameConfig, port: number = DEFAULT_PORT) {
  const room: Room = {
    players: [],
    config: initialConfig,
    state: null,
    started: false,
  }

  // @ts-expect-error Bun.serve generic arity varies across @types/bun versions
  const server = Bun.serve<{ playerId: number }>({
    port,
    fetch(req, server) {
      const upgraded = server.upgrade(req, {
        data: { playerId: room.players.length },
      })
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 })
      }
    },
    websocket: {
      open(ws) {
        // Player connects but hasn't joined yet
      },
      message(ws, raw) {
        const msg: ClientMessage = JSON.parse(raw as string)
        handleMessage(room, ws, msg)
      },
      close(ws) {
        room.players = room.players.filter((p) => p.ws !== ws)
        if (room.players.length > 0) {
          broadcastLobby(room)
        }
      },
    },
  })

  return { server, port: server.port }
}

function handleMessage(
  room: Room,
  ws: ServerWebSocket<{ playerId: number }>,
  msg: ClientMessage,
) {
  switch (msg.type) {
    case "join": {
      if (room.started) {
        send(ws, { type: "error", message: "Game already started" })
        return
      }
      const playerId = ws.data.playerId
      room.players.push({ name: msg.playerName, ws })
      send(ws, { type: "welcome", playerId, config: room.config })
      broadcastLobby(room)
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
      if (room.started) return
      const config = { ...room.config, playerCount: room.players.length }
      room.config = config
      room.state = createInitialState(config)
      room.started = true
      broadcastGameState(room)
      break
    }

    case "move": {
      if (!room.state || room.state.currentPlayer !== ws.data.playerId) return
      room.state = moveCursor(room.state, msg.dx, msg.dy, room.config.gridSize)
      broadcastGameState(room)
      break
    }

    case "select": {
      if (!room.state || room.state.currentPlayer !== ws.data.playerId) return
      const result = selectCell(room.state)
      if (result.collision && result.collidedWith !== null) {
        const eliminated = eliminatePlayer(result.state, room.state.currentPlayer)
        room.state = eliminated

        const eliminatedName = room.players[ws.data.playerId]?.name ?? "Unknown"
        const ownerName = room.players[result.collidedWith]?.name ?? "Unknown"
        broadcast(room, { type: "elimination", eliminatedName, ownerName })

        if (isGameOver(eliminated)) {
          broadcast(room, { type: "game_over", state: eliminated })
          room.started = false
          room.state = null
          return
        }

        room.state = endTurn(eliminated)
        broadcastGameState(room)
        return
      }
      room.state = result.state
      broadcastGameState(room)
      break
    }

    case "end_turn": {
      if (!room.state || room.state.currentPlayer !== ws.data.playerId) return
      room.state = endTurn(room.state)
      broadcastGameState(room)
      break
    }
  }
}
