import { useState, useCallback } from "react"
import type { BombGameConfig, BombGameState } from "./game/index.ts"
import { DEFAULT_BOMB_CONFIG, createInitialState } from "./game/index.ts"
import { useBombServer } from "./hooks/use-bomb-server.ts"
import type { JoinMode } from "./hooks/use-bomb-server.ts"
import { startBombServer } from "./server/ws-server.ts"
import { DEFAULT_BOMB_PORT, DEFAULT_REMOTE_HOST } from "./server/protocol.ts"
import { BombSetupScreen } from "./screens/BombSetupScreen.tsx"
import { BombGameScreen } from "./screens/BombGameScreen.tsx"
import { BombGameOverScreen } from "./screens/BombGameOverScreen.tsx"
import { BombLobbyScreen } from "./screens/BombLobbyScreen.tsx"
import { OnlineBombGameScreen } from "./screens/OnlineBombGameScreen.tsx"

type Mode = "local" | "host" | "online" | "join" | "join-local"

interface BombAppProps {
  readonly args: ReadonlyArray<string>
}

function parseBombArgs(args: ReadonlyArray<string>) {
  let mode: Mode = "local"
  let roomCode: string | undefined
  let address = DEFAULT_REMOTE_HOST
  let playerName = `Player-${Math.random().toString(36).slice(2, 6)}`

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg === "--online") mode = "online"
    else if (arg === "--host") mode = "host"
    else if (arg === "--join" && next) {
      if (next.includes(":") || next.includes(".")) {
        mode = "join-local"
        address = next
      } else {
        mode = "join"
        roomCode = next.toUpperCase()
      }
      i++
    }
    else if ((arg === "-n" || arg === "--name") && next) { playerName = next; i++ }
    else if (arg === "--server" && next) { address = next; i++ }
  }

  return { mode, address, roomCode, playerName }
}

export function BombApp({ args }: BombAppProps) {
  const parsed = parseBombArgs(args)

  if (parsed.mode === "local") {
    return <LocalBombGame />
  }

  if (parsed.mode === "host") {
    return <LocalHostGame playerName={parsed.playerName} />
  }

  if (parsed.mode === "join-local") {
    return (
      <RemoteBombGame
        address={parsed.address}
        playerName={parsed.playerName}
        joinMode="join-local"
      />
    )
  }

  return (
    <RemoteBombGame
      address={parsed.address}
      playerName={parsed.playerName}
      joinMode={parsed.mode === "join" ? "join" : "matchmake"}
      roomCode={parsed.roomCode}
    />
  )
}

function LocalBombGame() {
  type Screen = "setup" | "game" | "gameover"

  const [screen, setScreen] = useState<Screen>("setup")
  const [config, setConfig] = useState<BombGameConfig>(DEFAULT_BOMB_CONFIG)
  const [state, setState] = useState<BombGameState | null>(null)
  const [finalState, setFinalState] = useState<BombGameState | null>(null)
  const [solo, setSolo] = useState(false)

  const handleStart = useCallback((newConfig: BombGameConfig, playerCount: number, isSolo: boolean) => {
    setConfig(newConfig)
    setState(createInitialState(newConfig, playerCount))
    setSolo(isSolo)
    setScreen("game")
  }, [])

  const handleGameOver = useCallback((endState: BombGameState) => {
    setFinalState(endState)
    setScreen("gameover")
  }, [])

  const handleRestart = useCallback(() => {
    setState(createInitialState(config, state?.players.length ?? 2))
    setFinalState(null)
    setScreen("setup")
  }, [config, state?.players.length])

  switch (screen) {
    case "setup":
      return <BombSetupScreen onStart={handleStart} />
    case "game":
      return state ? (
        <BombGameScreen
          config={config}
          state={state}
          onStateChange={setState}
          onGameOver={handleGameOver}
          solo={solo}
        />
      ) : null
    case "gameover":
      return finalState ? (
        <BombGameOverScreen state={finalState} onRestart={handleRestart} myIndex={solo ? 0 : undefined} />
      ) : null
  }
}

interface LocalHostGameProps {
  playerName: string
}

function LocalHostGame({ playerName }: LocalHostGameProps) {
  const [serverInfo] = useState(() => startBombServer(DEFAULT_BOMB_CONFIG, DEFAULT_BOMB_PORT))
  const connection = useBombServer(`127.0.0.1:${serverInfo.port}`, playerName, "create")

  if (connection.gameOver) {
    return (
      <BombGameOverScreen
        state={connection.gameOver}
        onRestart={() => connection.send({ type: "start_game" })}
        myIndex={connection.playerId ?? undefined}
      />
    )
  }

  if (connection.gameState && connection.config) {
    return (
      <OnlineBombGameScreen
        config={connection.config}
        state={connection.gameState}
        connection={connection}
      />
    )
  }

  return <BombLobbyScreen connection={connection} isHost={true} />
}

interface RemoteBombGameProps {
  address: string
  playerName: string
  joinMode: JoinMode
  roomCode?: string
}

function RemoteBombGame({ address, playerName, joinMode, roomCode }: RemoteBombGameProps) {
  const connection = useBombServer(address, playerName, joinMode, roomCode)
  const isHost = joinMode === "matchmake" || joinMode === "create"

  if (connection.gameOver) {
    return (
      <BombGameOverScreen
        state={connection.gameOver}
        onRestart={() => connection.send({ type: "start_game" })}
        myIndex={connection.playerId ?? undefined}
      />
    )
  }

  if (connection.gameState && connection.config) {
    return (
      <OnlineBombGameScreen
        config={connection.config}
        state={connection.gameState}
        connection={connection}
      />
    )
  }

  return <BombLobbyScreen connection={connection} isHost={isHost || connection.playerId === 0} />
}
