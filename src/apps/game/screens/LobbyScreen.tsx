import { useKeyboard, useRenderer } from "@opentui/react"
import type { ServerConnection } from "../../../hooks/use-server.ts"
import { getPlayerColor } from "../game/index.ts"

interface LobbyScreenProps {
  readonly connection: ServerConnection
  readonly isHost: boolean
}

export function LobbyScreen({ connection, isHost }: LobbyScreenProps) {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy()
      return
    }
    if ((key.name === "enter" || key.name === "return") && isHost && connection.lobbyPlayers.length >= 2) {
      connection.send({ type: "start_game" })
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <ascii-font text="LOBBY" font="tiny" color="#3B82F6" />
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

        <text>
          <span fg="#888">Players ({connection.lobbyPlayers.length})</span>
        </text>
        {connection.lobbyPlayers.map((p, i) => (
          <text key={i}>
            <span fg={getPlayerColor(i)}>  █ {p.name}</span>
            {i === connection.playerId ? <span fg="#666"> (you)</span> : null}
          </text>
        ))}

        {connection.lobbyPlayers.length < 2 ? (
          <box marginTop={1}>
            <text>
              <span fg="#F59E0B">Waiting for more players...</span>
            </text>
          </box>
        ) : null}
      </box>

      <box height={1} />
      {isHost ? (
        <text>
          <span fg="#666">
            {connection.lobbyPlayers.length >= 2
              ? "[Enter] start game  [Esc] quit"
              : "[Esc] quit"}
          </span>
        </text>
      ) : (
        <text>
          <span fg="#666">Waiting for host to start...  [Esc] quit</span>
        </text>
      )}
    </box>
  )
}
