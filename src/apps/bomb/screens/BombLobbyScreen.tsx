import { useKeyboard, useRenderer } from "@opentui/react"
import type { BombServerConnection } from "../hooks/use-bomb-server.ts"
import { getPlayerColor } from "../game/index.ts"

interface BombLobbyScreenProps {
  readonly connection: BombServerConnection
  readonly isHost: boolean
}

export function BombLobbyScreen({ connection, isHost }: BombLobbyScreenProps) {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "escape") { renderer.destroy(); return }
    if ((key.name === "enter" || key.name === "return") && isHost && connection.lobbyPlayers.length >= 2) {
      connection.send({ type: "start_game" })
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <ascii-font text="BOMB" font="tiny" color="#FF6B00" />
      <box height={1} />

      <box
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor="#444"
        padding={1}
        paddingX={3}
        width={44}
      >
        <text>
          <span fg="#888">
            Status: <span fg={connection.status === "connected" ? "#10B981" : "#EF4444"}>
              {connection.status}
            </span>
          </span>
        </text>
        <box height={1} />
        <text><span fg="#888">Players ({connection.lobbyPlayers.length})</span></text>
        {connection.lobbyPlayers.map((p, i) => (
          <text key={i}>
            <span fg={getPlayerColor(i)}>  █ {p.name}</span>
            {i === connection.playerId ? <span fg="#666"> (you)</span> : null}
          </text>
        ))}
        {connection.lobbyPlayers.length < 2 ? (
          <box marginTop={1}>
            <text><span fg="#F59E0B">Waiting for more players...</span></text>
          </box>
        ) : null}
      </box>

      <box height={1} />
      <text>
        <span fg="#666">
          {isHost && connection.lobbyPlayers.length >= 2
            ? "[Enter] start  [Esc] quit"
            : isHost ? "[Esc] quit" : "Waiting for host...  [Esc] quit"}
        </span>
      </text>
    </box>
  )
}
