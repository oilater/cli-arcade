import { useEffect, useRef } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import type { BombGameConfig, BombGameState } from "../game/index.ts"
import { getPlayerColor, movePlayer, placeBomb, throwDart, tick, tickBots } from "../game/index.ts"
import { TICK_RATE } from "../game/constants.ts"
import { BombGrid } from "../components/BombGrid.tsx"

interface BombGameScreenProps {
  readonly config: BombGameConfig
  readonly state: BombGameState
  readonly onStateChange: (state: BombGameState) => void
  readonly onGameOver: (state: BombGameState) => void
  readonly solo: boolean
}

export function BombGameScreen({ config, state, onStateChange, onGameOver, solo }: BombGameScreenProps) {
  const renderer = useRenderer()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const interval = setInterval(() => {
      let next = stateRef.current
      if (next.gameOver) return
      if (solo) next = tickBots(next, config, 0)
      next = tick(next, config)
      // Solo: end immediately when human dies
      if (solo) {
        const me = next.players[0]
        if (me && !me.alive) {
          next = { ...next, gameOver: true, winner: null }
        }
      }
      onStateChange(next)
      if (next.gameOver) onGameOver(next)
    }, TICK_RATE)
    return () => clearInterval(interval)
  }, [config, solo, onStateChange, onGameOver])

  useKeyboard((key) => {
    if (key.name === "escape") { renderer.destroy(); return }

    const s = stateRef.current
    if (s.gameOver) return

    if (solo) {
      // 1P: Arrows move, Space bomb, 1 dart
      switch (key.name) {
        case "up": onStateChange(movePlayer(s, 0, 0, -1)); return
        case "down": onStateChange(movePlayer(s, 0, 0, 1)); return
        case "left": onStateChange(movePlayer(s, 0, -1, 0)); return
        case "right": onStateChange(movePlayer(s, 0, 1, 0)); return
        case "space": onStateChange(placeBomb(s, 0, config)); return
        case "1": onStateChange(throwDart(s, 0)); return
      }
    } else {
      // P1: WASD move, Space bomb, 1 dart
      switch (key.name) {
        case "w": onStateChange(movePlayer(s, 0, 0, -1)); return
        case "s": onStateChange(movePlayer(s, 0, 0, 1)); return
        case "a": onStateChange(movePlayer(s, 0, -1, 0)); return
        case "d": onStateChange(movePlayer(s, 0, 1, 0)); return
        case "space": onStateChange(placeBomb(s, 0, config)); return
        case "1": onStateChange(throwDart(s, 0)); return
      }

      // P2: IJKL move, / bomb, . dart
      switch (key.name) {
        case "i": onStateChange(movePlayer(s, 1, 0, -1)); return
        case "k": onStateChange(movePlayer(s, 1, 0, 1)); return
        case "j": onStateChange(movePlayer(s, 1, -1, 0)); return
        case "l": onStateChange(movePlayer(s, 1, 1, 0)); return
        case "/": onStateChange(placeBomb(s, 1, config)); return
        case ".": onStateChange(throwDart(s, 1)); return
      }
    }
  })

  const humanPlayer = state.players[0]

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor="#0D0D1A">
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between" paddingX={1} backgroundColor="#111128">
        {state.players.map((p) => (
          <box key={p.index} flexDirection="row" gap={1}>
            <text fg={p.alive ? getPlayerColor(p.index) : "#444"}>
              <strong>{p.alive ? "◆" : "✗"} {solo && p.index > 0 ? "BOT" : `P${p.index + 1}`}</strong>
            </text>
            <text>
              <span fg="#FF6B6B">R{p.bombRange}</span>
              <span fg="#555"> </span>
              <span fg="#4ECDC4">B{p.maxBombs}</span>
              {p.darts > 0 ? <><span fg="#555"> </span><span fg="#E879F9">D{p.darts}</span></> : null}
            </text>
          </box>
        ))}
        <text fg="#555">
          {Math.floor(state.tickCount / 10)}s
        </text>
      </box>

      <BombGrid state={state} myIndex={solo ? 0 : undefined} />

      {/* Footer */}
      <box flexDirection="row" justifyContent="center" gap={3} paddingX={1} backgroundColor="#111128">
        {solo ? (
          <text>
            <span fg="#555">Arrows:move  Space:bomb  1:dart  Esc:quit</span>
          </text>
        ) : (
          <>
            <text>
              <span fg="#3B82F6"><strong>P1</strong></span>
              <span fg="#555"> WASD Space:bomb 1:dart</span>
            </text>
            <text>
              <span fg="#EF4444"><strong>P2</strong></span>
              <span fg="#555"> IJKL /:bomb .:dart</span>
            </text>
            <text>
              <span fg="#333">Esc quit</span>
            </text>
          </>
        )}
      </box>
    </box>
  )
}
