import { useKeyboard, useRenderer } from "@opentui/react"
import type { BombGameState } from "../game/index.ts"
import { getPlayerColor } from "../game/index.ts"
import { BombGrid } from "../components/BombGrid.tsx"

interface BombGameOverScreenProps {
  readonly state: BombGameState
  readonly onRestart: () => void
  readonly myIndex?: number
}

export function BombGameOverScreen({ state, onRestart, myIndex }: BombGameOverScreenProps) {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "r") onRestart()
    else if (key.name === "escape" || key.name === "q") renderer.destroy()
  })

  const iWon = myIndex !== undefined && state.winner === myIndex
  const iLost = myIndex !== undefined && state.winner !== myIndex

  let titleText: string
  let titleColor: string
  let subtitleText: string

  if (myIndex !== undefined) {
    // Solo or online — show from my perspective
    if (iWon) {
      titleText = "WIN"
      titleColor = "#FFD700"
      subtitleText = "You survived!"
    } else if (state.winner !== null) {
      titleText = "LOSE"
      titleColor = "#FF4444"
      subtitleText = `P${state.winner + 1} wins`
    } else {
      titleText = "DRAW"
      titleColor = "#888"
      subtitleText = "Nobody survived"
    }
  } else {
    // 2P local — neutral view
    if (state.winner !== null) {
      titleText = `P${state.winner + 1}`
      titleColor = getPlayerColor(state.winner)
      subtitleText = "wins!"
    } else {
      titleText = "DRAW"
      titleColor = "#888"
      subtitleText = "Nobody survived"
    }
  }

  return (
    <box flexDirection="column" flexGrow={1} alignItems="center" backgroundColor="#0D0D1A">
      <box height={1} />
      <ascii-font text={titleText} font="tiny" color={titleColor} />
      <text>
        <span fg="#AAA"><strong>{subtitleText}</strong></span>
      </text>
      <box height={1} />

      <BombGrid state={state} />

      <box height={1} />
      <text><span fg="#666">[R] restart  [Esc/Q] quit</span></text>
    </box>
  )
}
