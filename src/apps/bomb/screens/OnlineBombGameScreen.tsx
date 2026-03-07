import { useKeyboard, useRenderer } from "@opentui/react"
import type { BombGameConfig, BombGameState } from "../game/index.ts"
import { getPlayerColor } from "../game/index.ts"
import type { BombServerConnection } from "../hooks/use-bomb-server.ts"
import { BombGrid } from "../components/BombGrid.tsx"

interface OnlineBombGameScreenProps {
  readonly config: BombGameConfig
  readonly state: BombGameState
  readonly connection: BombServerConnection
}

export function OnlineBombGameScreen({ config, state, connection }: OnlineBombGameScreenProps) {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "escape") { renderer.destroy(); return }
    if (state.gameOver) return

    // 1P keybindings: Arrows move, Space bomb, E dart
    switch (key.name) {
      case "up":
        connection.send({ type: "move", dx: 0, dy: -1 }); return
      case "down":
        connection.send({ type: "move", dx: 0, dy: 1 }); return
      case "left":
        connection.send({ type: "move", dx: -1, dy: 0 }); return
      case "right":
        connection.send({ type: "move", dx: 1, dy: 0 }); return
      case "space":
        connection.send({ type: "bomb" }); return
      case "1":
        connection.send({ type: "dart" }); return
    }
  })

  const myPlayer = state.players[connection.playerId ?? 0]

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="row" justifyContent="space-between" paddingX={1}>
        {state.players.map((p) => (
          <text key={p.index} fg={p.alive ? getPlayerColor(p.index) : "#444"}>
            {p.alive ? "█" : "X"} P{p.index + 1}
            {p.index === connection.playerId ? "(you)" : ""}
            {" "}[{p.bombRange}R {p.maxBombs}B{p.darts > 0 ? ` ${p.darts}D` : ""}]
          </text>
        ))}
      </box>

      <BombGrid state={state} />

      <text>
        <span fg="#666">
          Arrows:move  Space:bomb  1:dart  Esc:quit
        </span>
      </text>
    </box>
  )
}
