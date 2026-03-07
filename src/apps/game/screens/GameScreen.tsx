import { useKeyboard, useRenderer } from "@opentui/react"
import type { GameConfig, GameState } from "../game/index.ts"
import { getPlayerColor, moveCursor, selectCell, eliminatePlayer, endTurn, isGameOver } from "../game/index.ts"
import { Grid } from "../components/Grid.tsx"

interface GameScreenProps {
  readonly config: GameConfig
  readonly gameState: GameState
  readonly onStateChange: (state: GameState) => void
  readonly onTurnEnd: () => void
  readonly onElimination: (playerIndex: number, collidedWith: number) => void
  readonly onGameOver: () => void
}

export function GameScreen({
  config,
  gameState,
  onStateChange,
  onTurnEnd,
  onElimination,
  onGameOver,
}: GameScreenProps) {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy()
      return
    }

    switch (key.name) {
      case "up":
      case "w":
        onStateChange(moveCursor(gameState, 0, -1, config.gridSize))
        break
      case "down":
      case "s":
        onStateChange(moveCursor(gameState, 0, 1, config.gridSize))
        break
      case "left":
      case "a":
        onStateChange(moveCursor(gameState, -1, 0, config.gridSize))
        break
      case "right":
      case "d":
        onStateChange(moveCursor(gameState, 1, 0, config.gridSize))
        break
      case "space":
      case "enter":
      case "return": {
        const result = selectCell(gameState)
        if (result.collision && result.collidedWith !== null) {
          const eliminated = eliminatePlayer(result.state, gameState.currentPlayer)
          onStateChange(eliminated)
          onElimination(gameState.currentPlayer, result.collidedWith)
          if (isGameOver(eliminated)) {
            onGameOver()
          }
          return
        }
        onStateChange(result.state)
        break
      }
      case "tab": {
        const nextState = endTurn(gameState)
        onStateChange(nextState)
        onTurnEnd()
        break
      }
    }
  })

  const currentPlayer = gameState.players[gameState.currentPlayer]!

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <text>
          <span fg={getPlayerColor(gameState.currentPlayer)}>
            {">> "}{currentPlayer.name}
          </span>
          <span fg="#666"> | Selected: {gameState.selectedThisTurn.length}</span>
        </text>
        <box flexDirection="row" gap={2}>
          {gameState.players.map((p) => (
            <text key={p.index} fg={p.eliminated ? "#444" : getPlayerColor(p.index)}>
              {p.eliminated ? "X" : "█"} {p.name}: {p.cellCount}
            </text>
          ))}
        </box>
      </box>

      <Grid gameState={gameState} gridSize={config.gridSize} />

      <text>
        <span fg="#666">
          [Arrows/WASD] move  [Space/Enter] claim  [Tab] end turn  [Esc] quit
        </span>
      </text>
    </box>
  )
}
