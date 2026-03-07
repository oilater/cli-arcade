import { useKeyboard } from "@opentui/react"
import { getPlayerColor } from "../game/index.ts"

interface TurnTransitionProps {
  readonly playerIndex: number
  readonly playerName: string
  readonly message?: string
  readonly onContinue: () => void
}

export function TurnTransition({
  playerIndex,
  playerName,
  message,
  onContinue,
}: TurnTransitionProps) {
  const color = getPlayerColor(playerIndex)

  useKeyboard((key) => {
    if (key.name === "space" || key.name === "enter" || key.name === "return") {
      onContinue()
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {message ? (
        <box flexDirection="column" alignItems="center">
          <text>
            <span fg="#EF4444"><strong>{message}</strong></span>
          </text>
          <box height={1} />
        </box>
      ) : null}

      <box border borderStyle="rounded" borderColor={color} padding={2} paddingX={4}>
        <box flexDirection="column" alignItems="center" gap={1}>
          <text>
            <span fg={color}><strong>{playerName}</strong></span>
          </text>
          <text>
            <span fg="#888">Pass the device to this player</span>
          </text>
        </box>
      </box>

      <box height={1} />
      <text>
        <span fg="#666">[Space/Enter] to continue</span>
      </text>
    </box>
  )
}
