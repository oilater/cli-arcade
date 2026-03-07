import { useKeyboard, useRenderer } from "@opentui/react"
import type { GameConfig, GameState } from "../game/index.ts"
import { getPlayerColor, getWinner } from "../game/index.ts"
import { Grid } from "../components/Grid.tsx"

interface GameOverScreenProps {
  readonly config: GameConfig
  readonly gameState: GameState
  readonly onRestart: () => void
}

export function GameOverScreen({ config, gameState, onRestart }: GameOverScreenProps) {
  const renderer = useRenderer()
  const winner = getWinner(gameState)

  useKeyboard((key) => {
    if (key.name === "r") {
      onRestart()
    } else if (key.name === "escape" || key.name === "q") {
      renderer.destroy()
    }
  })

  const sortedPlayers = [...gameState.players].sort((a, b) => b.cellCount - a.cellCount)
  const totalCells = config.gridSize * config.gridSize

  return (
    <box flexDirection="column" flexGrow={1} alignItems="center">
      <box height={1} />
      <ascii-font text="GAME OVER" font="tiny" color="#EF4444" />
      <box height={1} />

      {winner ? (
        <text>
          <span fg={getPlayerColor(winner.index)}>
            <strong>{winner.name} wins!</strong>
          </span>
          <span fg="#888"> with {winner.cellCount} cells ({Math.round((winner.cellCount / totalCells) * 100)}%)</span>
        </text>
      ) : null}

      <box height={1} />

      <box
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor="#444"
        padding={1}
        paddingX={2}
        width={40}
      >
        <text>
          <span fg="#888"><strong>Scoreboard</strong></span>
        </text>
        <box height={1} />
        {sortedPlayers.map((p, rank) => {
          const color = getPlayerColor(p.index)
          const pct = Math.round((p.cellCount / totalCells) * 100)
          const bar = "█".repeat(Math.max(0, Math.round(pct / 5)))
          return (
            <box key={p.index} flexDirection="row">
              <text>
                <span fg={p.eliminated ? "#444" : color}>
                  {`${rank + 1}. ${p.name.padEnd(12)}`}
                </span>
                <span fg={p.eliminated ? "#444" : "#FFF"}>
                  {String(p.cellCount).padStart(5)} cells ({String(pct).padStart(2)}%)
                </span>
                <span fg={p.eliminated ? "#444" : color}> {bar}</span>
                {p.eliminated ? <span fg="#EF4444"> [OUT]</span> : null}
              </text>
            </box>
          )
        })}
      </box>

      <box height={1} />

      <text>
        <span fg="#888"><strong>Final Map</strong></span>
      </text>
      <Grid gameState={gameState} gridSize={config.gridSize} showAll />

      <text>
        <span fg="#666">[R] restart  [Esc/Q] quit</span>
      </text>
    </box>
  )
}
