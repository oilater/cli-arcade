import { useKeyboard, useRenderer } from "@opentui/react"
import type { GameConfig, GameState } from "../game/index.ts"
import { getPlayerColor } from "../game/index.ts"
import type { ServerConnection } from "../../../hooks/use-server.ts"
import { Grid } from "../components/Grid.tsx"

interface OnlineGameScreenProps {
  readonly config: GameConfig
  readonly gameState: GameState
  readonly connection: ServerConnection
}

export function OnlineGameScreen({ config, gameState, connection }: OnlineGameScreenProps) {
  const renderer = useRenderer()
  const isMyTurn = gameState.currentPlayer === connection.playerId

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy()
      return
    }

    if (!isMyTurn) return

    switch (key.name) {
      case "up":
      case "w":
        connection.send({ type: "move", dx: 0, dy: -1 })
        break
      case "down":
      case "s":
        connection.send({ type: "move", dx: 0, dy: 1 })
        break
      case "left":
      case "a":
        connection.send({ type: "move", dx: -1, dy: 0 })
        break
      case "right":
      case "d":
        connection.send({ type: "move", dx: 1, dy: 0 })
        break
      case "space":
      case "enter":
      case "return":
        connection.send({ type: "select" })
        break
      case "tab":
        connection.send({ type: "end_turn" })
        break
    }
  })

  const currentPlayer = gameState.players[gameState.currentPlayer]!

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <text>
          <span fg={getPlayerColor(gameState.currentPlayer)}>
            {isMyTurn ? ">> YOUR TURN" : `>> ${currentPlayer.name}'s turn`}
          </span>
          <span fg="#666"> | Selected: {gameState.selectedThisTurn.length}</span>
        </text>
        <box flexDirection="row" gap={2}>
          {gameState.players.map((p) => (
            <text key={p.index} fg={p.eliminated ? "#444" : getPlayerColor(p.index)}>
              {p.eliminated ? "X" : "█"} {p.name}: {p.cellCount}
              {p.index === connection.playerId ? " (you)" : ""}
            </text>
          ))}
        </box>
      </box>

      <Grid gameState={gameState} gridSize={config.gridSize} />

      <text>
        <span fg="#666">
          {isMyTurn
            ? "[Arrows/WASD] move  [Space/Enter] claim  [Tab] end turn  [Esc] quit"
            : "Waiting for other player...  [Esc] quit"}
        </span>
      </text>
    </box>
  )
}
