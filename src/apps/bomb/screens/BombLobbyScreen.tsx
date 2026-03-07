import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import type { BombServerConnection } from "../hooks/use-bomb-server.ts"
import { getPlayerColor } from "../game/index.ts"
import { DEFAULT_BOMB_PORT } from "../server/protocol.ts"
import { getLocalIP } from "../../../utils/network.ts"

interface BombLobbyScreenProps {
  readonly connection: BombServerConnection
  readonly isHost: boolean
}

export function BombLobbyScreen({ connection, isHost }: BombLobbyScreenProps) {
  const renderer = useRenderer()
  const [localIP] = useState(() => isHost ? getLocalIP() : "")

  useKeyboard((key) => {
    if (key.name === "escape") { renderer.destroy(); return }
    if ((key.name === "enter" || key.name === "return") && isHost && connection.lobbyPlayers.length >= 2) {
      connection.send({ type: "start_game" })
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <ascii-font text="cli arcade" font="tiny" color="#3B82F6" />
      <box height={1} />

      {isHost ? (
        <box flexDirection="column" alignItems="center">
          <text><span fg="#10B981">서버 실행 중</span></text>
          <box height={1} />
          <box border borderStyle="rounded" borderColor="#10B981" paddingX={2} padding={1}>
            <box flexDirection="column" alignItems="center">
              <text><span fg="#888">친구에게 이 명령어를 공유하세요:</span></text>
              <box height={1} />
              <text><span fg="#FFF"><strong>ca start --join {localIP}:{DEFAULT_BOMB_PORT}</strong></span></text>
            </box>
          </box>
          <box height={1} />
        </box>
      ) : null}

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
