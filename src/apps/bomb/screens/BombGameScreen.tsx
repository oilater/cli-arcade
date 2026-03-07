import { useEffect, useRef, useCallback } from "react"
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

type InputAction = { kind: "move"; player: number; dx: number; dy: number }
  | { kind: "bomb"; player: number }
  | { kind: "dart"; player: number }

export function BombGameScreen({ config, state, onStateChange, onGameOver, solo }: BombGameScreenProps) {
  const renderer = useRenderer()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const interval = setInterval(() => {
      let next = stateRef.current
      if (next.gameOver) return

      if (solo) next = tickBots(next, config, 0)
      next = tick(next, config, solo ? 0 : undefined)
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

  const enqueue = useCallback((action: InputAction) => {
    const s = stateRef.current
    if (s.gameOver) return
    switch (action.kind) {
      case "move": onStateChange(movePlayer(s, action.player, action.dx, action.dy)); break
      case "bomb": onStateChange(placeBomb(s, action.player, config)); break
      case "dart": onStateChange(throwDart(s, action.player)); break
    }
  }, [config, onStateChange])

  useKeyboard((key) => {
    if (key.name === "escape") { renderer.destroy(); return }
    if (stateRef.current.gameOver) return

    if (solo) {
      switch (key.name) {
        case "up": enqueue({ kind: "move", player: 0, dx: 0, dy: -1 }); return
        case "down": enqueue({ kind: "move", player: 0, dx: 0, dy: 1 }); return
        case "left": enqueue({ kind: "move", player: 0, dx: -1, dy: 0 }); return
        case "right": enqueue({ kind: "move", player: 0, dx: 1, dy: 0 }); return
        case "space": enqueue({ kind: "bomb", player: 0 }); return
        case "1": enqueue({ kind: "dart", player: 0 }); return
      }
    } else {
      switch (key.name) {
        case "w": enqueue({ kind: "move", player: 0, dx: 0, dy: -1 }); return
        case "s": enqueue({ kind: "move", player: 0, dx: 0, dy: 1 }); return
        case "a": enqueue({ kind: "move", player: 0, dx: -1, dy: 0 }); return
        case "d": enqueue({ kind: "move", player: 0, dx: 1, dy: 0 }); return
        case "space": enqueue({ kind: "bomb", player: 0 }); return
        case "1": enqueue({ kind: "dart", player: 0 }); return
      }

      switch (key.name) {
        case "i": enqueue({ kind: "move", player: 1, dx: 0, dy: -1 }); return
        case "k": enqueue({ kind: "move", player: 1, dx: 0, dy: 1 }); return
        case "j": enqueue({ kind: "move", player: 1, dx: -1, dy: 0 }); return
        case "l": enqueue({ kind: "move", player: 1, dx: 1, dy: 0 }); return
        case "/": enqueue({ kind: "bomb", player: 1 }); return
        case ".": enqueue({ kind: "dart", player: 1 }); return
      }
    }
  })

  return (
    <box flexDirection="column" flexGrow={1} alignItems="center" paddingTop={2} backgroundColor="#0D0D1A">
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
