import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import type { BombGameConfig } from "../game/index.ts"
import { DEFAULT_BOMB_CONFIG, getPlayerColor } from "../game/index.ts"

type GameMode = "solo" | "local2p"

const MODES: ReadonlyArray<{ key: GameMode; label: string; desc: string }> = [
  { key: "solo", label: "Solo", desc: "1P vs Bots" },
  { key: "local2p", label: "2P Local", desc: "2 players, 1 keyboard" },
]

interface BombSetupScreenProps {
  readonly onStart: (config: BombGameConfig, playerCount: number, solo: boolean) => void
}

export function BombSetupScreen({ onStart }: BombSetupScreenProps) {
  const renderer = useRenderer()
  const [modeIndex, setModeIndex] = useState(0)
  const [botCount, setBotCount] = useState(3)

  const mode = MODES[modeIndex]!

  useKeyboard((key) => {
    if (key.name === "escape") { renderer.destroy(); return }
    if (key.name === "enter" || key.name === "return") {
      if (mode.key === "solo") {
        onStart(DEFAULT_BOMB_CONFIG, 1 + botCount, true)
      } else {
        onStart(DEFAULT_BOMB_CONFIG, 2, false)
      }
      return
    }
    switch (key.name) {
      case "up":
        setModeIndex((i) => Math.max(0, i - 1))
        break
      case "down":
        setModeIndex((i) => Math.min(MODES.length - 1, i + 1))
        break
      case "left":
        if (mode.key === "solo") setBotCount((c) => Math.max(1, c - 1))
        break
      case "right":
        if (mode.key === "solo") setBotCount((c) => Math.min(3, c + 1))
        break
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} backgroundColor="#0D0D1A">
      <ascii-font text="cli arcade" font="tiny" color="#3B82F6" />
      <box height={1} />

      <box
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor="#444"
        padding={1}
        paddingX={3}
        width={44}
        backgroundColor="#111128"
      >
        <text><span fg="#888">Map: {DEFAULT_BOMB_CONFIG.mapSize}x{DEFAULT_BOMB_CONFIG.mapSize}</span></text>
        <box height={1} />

        {MODES.map((m, i) => (
          <text key={m.key}>
            <span fg={i === modeIndex ? "#FF6B00" : "#555"}>
              {i === modeIndex ? "> " : "  "}
            </span>
            <span fg={i === modeIndex ? "#FFF" : "#666"}>
              {m.label}
            </span>
            <span fg="#555"> {m.desc}</span>
          </text>
        ))}

        <box height={1} />

        {mode.key === "solo" ? (
          <>
            <box flexDirection="row" gap={1}>
              <text fg="#888">Bots:</text>
              <text>
                <span fg="#666">{botCount > 1 ? "<" : " "}</span>
                <span fg="#FFF">{` ${botCount} `}</span>
                <span fg="#666">{botCount < 3 ? ">" : " "}</span>
              </text>
            </box>
            <box height={1} />
            <box flexDirection="row" gap={2}>
              <text fg={getPlayerColor(0)}><strong>◆ YOU</strong></text>
              {Array.from({ length: botCount }, (_, i) => (
                <text key={i} fg={getPlayerColor(i + 1)}>
                  <strong>◆ BOT</strong>
                </text>
              ))}
            </box>
          </>
        ) : (
          <box flexDirection="row" gap={2}>
            <text fg={getPlayerColor(0)}><strong>◆ P1</strong></text>
            <text fg={getPlayerColor(1)}><strong>◆ P2</strong></text>
          </box>
        )}
      </box>

      <box height={1} />
      <text>
        <span fg="#555">[Up/Down] mode  {mode.key === "solo" ? "[Left/Right] bots  " : ""}[Enter] start  [Esc] quit</span>
      </text>
    </box>
  )
}
