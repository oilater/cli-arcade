import type { ServerWebSocket } from "bun"
import type { BombGameConfig, BombGameState } from "../game/index.ts"
import { createInitialState, movePlayer, placeBomb, throwDart, useNeedle, tick } from "../game/index.ts"
import { DEFAULT_BOMB_CONFIG, TICK_RATE } from "../game/constants.ts"
import type { BombClientMessage, BombServerMessage } from "./protocol.ts"
import { DEFAULT_BOMB_PORT } from "./protocol.ts"

interface Player {
  name: string
  ws: ServerWebSocket<WsData>
}

interface Room {
  code: string
  players: Player[]
  config: BombGameConfig
  state: BombGameState | null
  started: boolean
  tickTimer: ReturnType<typeof setTimeout> | null
}

interface WsData {
  playerId: number
  roomCode: string | null
}

function send(ws: ServerWebSocket<WsData>, msg: BombServerMessage) {
  ws.send(JSON.stringify(msg))
}

function broadcast(room: Room, msg: BombServerMessage) {
  const raw = JSON.stringify(msg)
  for (const p of room.players) p.ws.send(raw)
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const rooms = new Map<string, Room>()

function getOrCreateRoom(code: string): Room {
  let room = rooms.get(code)
  if (!room) {
    room = {
      code,
      players: [],
      config: DEFAULT_BOMB_CONFIG,
      state: null,
      started: false,
      tickTimer: null,
    }
    rooms.set(code, room)
  }
  return room
}

function cleanupRoom(code: string) {
  const room = rooms.get(code)
  if (!room || room.players.length > 0) return
  if (room.tickTimer) clearTimeout(room.tickTimer)
  rooms.delete(code)
}

export function startBombServer(initialConfig?: BombGameConfig, port: number = DEFAULT_BOMB_PORT) {
  // @ts-expect-error Bun.serve generic arity varies across @types/bun versions
  const server = Bun.serve<WsData>({
    hostname: "0.0.0.0",
    port,
    fetch(req: Request, server: { upgrade: (req: Request, opts: { data: WsData }) => boolean }) {
      const url = new URL(req.url)
      if (url.pathname === "/health") return new Response("ok")

      const upgraded = server.upgrade(req, {
        data: { playerId: -1, roomCode: null },
      })
      if (!upgraded) return new Response("WebSocket upgrade failed", { status: 400 })
    },
    websocket: {
      open() {},
      message(ws: ServerWebSocket<WsData>, raw: string | Buffer) {
        const msg: BombClientMessage = JSON.parse(raw as string)
        handleMessage(ws, msg, initialConfig)
      },
      close(ws: ServerWebSocket<WsData>) {
        const code = ws.data.roomCode
        if (!code) return
        const room = rooms.get(code)
        if (!room) return

        room.players = room.players.filter((p) => p.ws !== ws)
        if (room.players.length === 0) {
          cleanupRoom(code)
        } else {
          broadcast(room, { type: "lobby", players: room.players.map((p) => ({ name: p.name })) })
        }
      },
    },
  })

  console.log(`Bomb server listening on port ${server.port}`)
  return { server, port: server.port }
}

function handleMessage(
  ws: ServerWebSocket<WsData>,
  msg: BombClientMessage,
  initialConfig?: BombGameConfig,
) {
  switch (msg.type) {
    case "create_room": {
      let code: string
      do { code = generateRoomCode() } while (rooms.has(code))

      const room = getOrCreateRoom(code)
      if (initialConfig) room.config = initialConfig
      const playerId = room.players.length
      ws.data.playerId = playerId
      ws.data.roomCode = code
      room.players.push({ name: msg.playerName, ws })
      send(ws, { type: "welcome", playerId, config: room.config, roomCode: code })
      broadcast(room, { type: "lobby", players: room.players.map((p) => ({ name: p.name })) })
      break
    }

    case "matchmake": {
      let room: Room | undefined
      for (const r of rooms.values()) {
        if (!r.started && r.players.length < 4) { room = r; break }
      }
      if (!room) {
        let code: string
        do { code = generateRoomCode() } while (rooms.has(code))
        room = getOrCreateRoom(code)
      }
      const playerId = room.players.length
      ws.data.playerId = playerId
      ws.data.roomCode = room.code
      room.players.push({ name: msg.playerName, ws })
      send(ws, { type: "welcome", playerId, config: room.config, roomCode: room.code })
      broadcast(room, { type: "lobby", players: room.players.map((p) => ({ name: p.name })) })
      if (room.players.length >= 2 && !room.started) {
        startGameLoop(room)
      }
      break
    }

    case "join": {
      const code = msg.roomCode ?? [...rooms.keys()][0]
      if (!code) { send(ws, { type: "error", message: "No rooms available" }); return }
      const room = rooms.get(code)
      if (!room) { send(ws, { type: "error", message: `Room ${code} not found` }); return }
      if (room.started) { send(ws, { type: "error", message: "Game already started" }); return }

      const playerId = room.players.length
      ws.data.playerId = playerId
      ws.data.roomCode = code
      room.players.push({ name: msg.playerName, ws })
      send(ws, { type: "welcome", playerId, config: room.config, roomCode: code })
      broadcast(room, { type: "lobby", players: room.players.map((p) => ({ name: p.name })) })
      break
    }

    case "update_config": {
      const room = getRoomFromWs(ws)
      if (!room || room.started) return
      room.config = msg.config
      for (const p of room.players) {
        send(p.ws, { type: "welcome", playerId: p.ws.data.playerId, config: room.config, roomCode: room.code })
      }
      break
    }

    case "start_game": {
      const room = getRoomFromWs(ws)
      if (!room || room.started || room.players.length < 2) return
      startGameLoop(room)
      break
    }

    case "move": {
      const room = getRoomFromWs(ws)
      if (!room?.state || room.state.gameOver) return
      room.state = movePlayer(room.state, ws.data.playerId, msg.dx, msg.dy)
      broadcast(room, { type: "game_state", state: room.state })
      break
    }

    case "bomb": {
      const room = getRoomFromWs(ws)
      if (!room?.state || room.state.gameOver) return
      room.state = placeBomb(room.state, ws.data.playerId, room.config)
      broadcast(room, { type: "game_state", state: room.state })
      break
    }

    case "dart": {
      const room = getRoomFromWs(ws)
      if (!room?.state || room.state.gameOver) return
      room.state = throwDart(room.state, ws.data.playerId)
      broadcast(room, { type: "game_state", state: room.state })
      break
    }

    case "needle": {
      const room = getRoomFromWs(ws)
      if (!room?.state || room.state.gameOver) return
      room.state = useNeedle(room.state, ws.data.playerId)
      broadcast(room, { type: "game_state", state: room.state })
      break
    }
  }
}

function startGameLoop(room: Room) {
  room.state = createInitialState(room.config, room.players.length)
  room.started = true
  broadcast(room, { type: "game_state", state: room.state })

  function loop() {
    if (!room.state || room.state.gameOver) return
    room.state = tick(room.state, room.config)
    if (room.state.gameOver) {
      broadcast(room, { type: "game_over", state: room.state })
      room.tickTimer = null
      room.started = false
    } else {
      broadcast(room, { type: "game_state", state: room.state })
      room.tickTimer = setTimeout(loop, TICK_RATE)
    }
  }
  room.tickTimer = setTimeout(loop, TICK_RATE)
}

function getRoomFromWs(ws: ServerWebSocket<WsData>): Room | null {
  const code = ws.data.roomCode
  return code ? rooms.get(code) ?? null : null
}
