import { useState, useCallback } from "react"
import type { BombGameConfig, BombGameState } from "./game/index.ts"
import { DEFAULT_BOMB_CONFIG, createInitialState } from "./game/index.ts"
import { useBombServer } from "./hooks/use-bomb-server.ts"
import { startBombServer } from "./server/ws-server.ts"
import { DEFAULT_BOMB_PORT } from "./server/protocol.ts"
import { BombSetupScreen } from "./screens/BombSetupScreen.tsx"
import { BombGameScreen } from "./screens/BombGameScreen.tsx"
import { BombGameOverScreen } from "./screens/BombGameOverScreen.tsx"
import { BombLobbyScreen } from "./screens/BombLobbyScreen.tsx"
import { OnlineBombGameScreen } from "./screens/OnlineBombGameScreen.tsx"

type Mode = "local" | "host" | "join"

interface BombAppProps {
  readonly args: ReadonlyArray<string>
}

function parseBombArgs(args: ReadonlyArray<string>) {
  let mode: Mode = "local"
  let address = `localhost:${DEFAULT_BOMB_PORT}`
  let playerName = `Player-${Math.random().toString(36).slice(2, 6)}`

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg === "--host") mode = "host"
    else if (arg === "--join" && next) { mode = "join"; address = next; i++ }
    else if ((arg === "-n" || arg === "--name") && next) { playerName = next; i++ }
  }

  return { mode, address, playerName }
}

export function BombApp({ args }: BombAppProps) {
  const parsed = parseBombArgs(args)

  if (parsed.mode === "local") {
    return <LocalBombGame />
  }

  return (
    <OnlineBombGame
      mode={parsed.mode}
      address={parsed.address}
      playerName={parsed.playerName}
    />
  )
}

// --- Local Game ---

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

// --- Online Game ---

interface OnlineBombGameProps {
  mode: Mode
  address: string
  playerName: string
}

function OnlineBombGame({ mode, address, playerName }: OnlineBombGameProps) {
  const [serverInfo] = useState(() => {
    if (mode === "host") {
      const port = parseInt(address.split(":")[1] ?? String(DEFAULT_BOMB_PORT), 10)
      return startBombServer(DEFAULT_BOMB_CONFIG, port)
    }
    return null
  })

  const actualAddress = serverInfo ? `localhost:${serverInfo.port}` : address
  const connection = useBombServer(actualAddress, playerName)

  if (connection.gameOver) {
    return (
      <BombGameOverScreen
        state={connection.gameOver}
        onRestart={() => {}}
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

  return <BombLobbyScreen connection={connection} isHost={mode === "host"} />
}
