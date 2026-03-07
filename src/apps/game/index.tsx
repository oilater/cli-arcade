import { useState, useCallback } from "react"
import type { GameConfig, GameState } from "./game/index.ts"
import { DEFAULT_CONFIG, createInitialState, isGameOver } from "./game/index.ts"
import { useServer } from "../../hooks/use-server.ts"
import { startServer } from "../../server/ws-server.ts"
import { DEFAULT_PORT } from "../../server/protocol.ts"
import { SetupScreen } from "./screens/SetupScreen.tsx"
import { GameScreen } from "./screens/GameScreen.tsx"
import { TurnTransition } from "./screens/TurnTransition.tsx"
import { GameOverScreen } from "./screens/GameOverScreen.tsx"
import { LobbyScreen } from "./screens/LobbyScreen.tsx"
import { OnlineGameScreen } from "./screens/OnlineGameScreen.tsx"

type Mode = "local" | "host" | "join"

interface GameAppProps {
  readonly args: ReadonlyArray<string>
}

function parseGameArgs(args: ReadonlyArray<string>): {
  mode: Mode
  address: string
  config: GameConfig | null
  playerName: string
} {
  let mode: Mode = "local"
  let address = `localhost:${DEFAULT_PORT}`
  let gridSize: number | undefined
  let playerCount: number | undefined
  let playerName = `Player-${Math.random().toString(36).slice(2, 6)}`

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg === "--host") mode = "host"
    else if (arg === "--join" && next) { mode = "join"; address = next; i++ }
    else if ((arg === "-g" || arg === "--grid") && next) { gridSize = parseInt(next, 10); i++ }
    else if ((arg === "-p" || arg === "--players") && next) { playerCount = parseInt(next, 10); i++ }
    else if ((arg === "-n" || arg === "--name") && next) { playerName = next; i++ }
  }

  const config = gridSize || playerCount
    ? { gridSize: gridSize ?? 30, playerCount: playerCount ?? 2 }
    : null

  return { mode, address, config, playerName }
}

export function GameApp({ args }: GameAppProps) {
  const parsed = parseGameArgs(args)

  if (parsed.mode === "local") {
    return <LocalGame initialConfig={parsed.config} />
  }

  return (
    <OnlineGame
      mode={parsed.mode}
      address={parsed.address}
      playerName={parsed.playerName}
      initialConfig={parsed.config}
    />
  )
}

// --- Local Game (original flow) ---

function LocalGame({ initialConfig }: { initialConfig: GameConfig | null }) {
  type Screen = "setup" | "game" | "transition" | "gameover"

  const [screen, setScreen] = useState<Screen>(initialConfig ? "transition" : "setup")
  const [config, setConfig] = useState<GameConfig>(initialConfig ?? DEFAULT_CONFIG)
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(initialConfig ?? DEFAULT_CONFIG)
  )
  const [transitionMessage, setTransitionMessage] = useState<string | undefined>()

  const handleStart = useCallback((newConfig: GameConfig) => {
    setConfig(newConfig)
    setGameState(createInitialState(newConfig))
    setTransitionMessage(undefined)
    setScreen("transition")
  }, [])

  const handleTurnEnd = useCallback(() => {
    setTransitionMessage(undefined)
    setScreen("transition")
  }, [])

  const handleElimination = useCallback((playerIndex: number, collidedWith: number) => {
    const eliminated = gameState.players[playerIndex]!.name
    const owner = gameState.players[collidedWith]!.name
    setTransitionMessage(`${eliminated} stepped on ${owner}'s territory! ${eliminated} is eliminated!`)
  }, [gameState.players])

  const handleGameOver = useCallback(() => setScreen("gameover"), [])

  const handleTransitionContinue = useCallback(() => {
    setScreen(isGameOver(gameState) ? "gameover" : "game")
  }, [gameState])

  const handleRestart = useCallback(() => {
    setGameState(createInitialState(config))
    setTransitionMessage(undefined)
    setScreen("transition")
  }, [config])

  switch (screen) {
    case "setup":
      return <SetupScreen initialConfig={config} onStart={handleStart} />
    case "game":
      return (
        <GameScreen
          config={config}
          gameState={gameState}
          onStateChange={setGameState}
          onTurnEnd={handleTurnEnd}
          onElimination={handleElimination}
          onGameOver={handleGameOver}
        />
      )
    case "transition": {
      const player = gameState.players[gameState.currentPlayer]!
      return (
        <TurnTransition
          playerIndex={player.index}
          playerName={player.name}
          message={transitionMessage}
          onContinue={handleTransitionContinue}
        />
      )
    }
    case "gameover":
      return <GameOverScreen config={config} gameState={gameState} onRestart={handleRestart} />
  }
}

// --- Online Game ---

interface OnlineGameProps {
  mode: Mode
  address: string
  playerName: string
  initialConfig: GameConfig | null
}

function OnlineGame({ mode, address, playerName, initialConfig }: OnlineGameProps) {
  const [serverInfo] = useState(() => {
    if (mode === "host") {
      const port = parseInt(address.split(":")[1] ?? String(DEFAULT_PORT), 10)
      const info = startServer(initialConfig ?? DEFAULT_CONFIG, port)
      return info
    }
    return null
  })

  const actualAddress = serverInfo
    ? `localhost:${serverInfo.port}`
    : address

  const connection = useServer(actualAddress, playerName)

  if (connection.gameOver) {
    const config = connection.config ?? DEFAULT_CONFIG
    return (
      <GameOverScreen
        config={config}
        gameState={connection.gameOver}
        onRestart={() => {
          // In online mode, just show the final state
        }}
      />
    )
  }

  if (connection.gameState && connection.config) {
    return (
      <OnlineGameScreen
        config={connection.config}
        gameState={connection.gameState}
        connection={connection}
      />
    )
  }

  return (
    <LobbyScreen
      connection={connection}
      isHost={mode === "host"}
    />
  )
}
