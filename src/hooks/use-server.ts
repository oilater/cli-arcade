import { useState, useEffect, useCallback, useRef } from "react"
import type { ClientMessage, ServerMessage } from "../server/protocol.ts"
import type { GameConfig, GameState } from "../apps/game/game/index.ts"

export interface LobbyPlayer {
  readonly name: string
  readonly ready: boolean
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

export interface ServerConnection {
  readonly status: ConnectionStatus
  readonly playerId: number | null
  readonly config: GameConfig | null
  readonly lobbyPlayers: ReadonlyArray<LobbyPlayer>
  readonly gameState: GameState | null
  readonly elimination: { eliminatedName: string; ownerName: string } | null
  readonly gameOver: GameState | null
  readonly error: string | null
  readonly send: (msg: ClientMessage) => void
  readonly clearElimination: () => void
}

export function useServer(address: string, playerName: string): ServerConnection {
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [lobbyPlayers, setLobbyPlayers] = useState<ReadonlyArray<LobbyPlayer>>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [elimination, setElimination] = useState<{ eliminatedName: string; ownerName: string } | null>(null)
  const [gameOver, setGameOver] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(`ws://${address}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus("connected")
      ws.send(JSON.stringify({ type: "join", playerName }))
    }

    ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data as string)
      switch (msg.type) {
        case "welcome":
          setPlayerId(msg.playerId)
          setConfig(msg.config)
          break
        case "lobby":
          setLobbyPlayers(msg.players)
          break
        case "game_state":
          setGameState(msg.state)
          setGameOver(null)
          break
        case "elimination":
          setElimination({ eliminatedName: msg.eliminatedName, ownerName: msg.ownerName })
          break
        case "game_over":
          setGameOver(msg.state)
          setGameState(null)
          break
        case "error":
          setError(msg.message)
          break
      }
    }

    ws.onclose = () => setStatus("disconnected")
    ws.onerror = () => setStatus("error")

    return () => {
      ws.close()
    }
  }, [address, playerName])

  const send = useCallback((msg: ClientMessage) => {
    wsRef.current?.send(JSON.stringify(msg))
  }, [])

  const clearElimination = useCallback(() => setElimination(null), [])

  return {
    status,
    playerId,
    config,
    lobbyPlayers,
    gameState,
    elimination,
    gameOver,
    error,
    send,
    clearElimination,
  }
}
