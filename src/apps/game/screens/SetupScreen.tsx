import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import type { GameConfig } from "../game/index.ts"
import { GRID_SIZE_RANGE, PLAYER_COUNT_RANGE, getPlayerColor } from "../game/index.ts"

interface SetupScreenProps {
  readonly initialConfig: GameConfig
  readonly onStart: (config: GameConfig) => void
}

type Field = "gridSize" | "playerCount"

const FIELDS: readonly Field[] = ["gridSize", "playerCount"]

const FIELD_LABELS: Record<Field, string> = {
  gridSize: "Grid Size",
  playerCount: "Players",
}

const FIELD_RANGES: Record<Field, { min: number; max: number }> = {
  gridSize: GRID_SIZE_RANGE,
  playerCount: PLAYER_COUNT_RANGE,
}

const FIELD_STEP: Record<Field, number> = {
  gridSize: 5,
  playerCount: 1,
}

export function SetupScreen({ initialConfig, onStart }: SetupScreenProps) {
  const renderer = useRenderer()
  const [config, setConfig] = useState<GameConfig>(initialConfig)
  const [focusedField, setFocusedField] = useState(0)

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy()
      return
    }

    if (key.name === "enter" || key.name === "return") {
      onStart(config)
      return
    }

    const field = FIELDS[focusedField]!
    const range = FIELD_RANGES[field]
    const step = FIELD_STEP[field]

    switch (key.name) {
      case "up":
        setFocusedField((i) => Math.max(0, i - 1))
        break
      case "down":
        setFocusedField((i) => Math.min(FIELDS.length - 1, i + 1))
        break
      case "left":
        setConfig((c) => ({ ...c, [field]: Math.max(range.min, c[field] - step) }))
        break
      case "right":
        setConfig((c) => ({ ...c, [field]: Math.min(range.max, c[field] + step) }))
        break
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <ascii-font text="TERRITORY" font="tiny" color="#3B82F6" />
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
          <span fg="#888">Configure your game</span>
        </text>
        <box height={1} />

        {FIELDS.map((field, i) => {
          const focused = focusedField === i
          const value = config[field]
          const range = FIELD_RANGES[field]
          return (
            <box key={field} flexDirection="row" gap={1}>
              <text fg={focused ? "#3B82F6" : "#888"}>
                {focused ? "> " : "  "}{FIELD_LABELS[field]}:
              </text>
              <text fg={focused ? "#FFF" : "#AAA"}>
                <span fg="#666">{value > range.min ? "<" : " "}</span>
                {` ${String(value).padStart(3)} `}
                <span fg="#666">{value < range.max ? ">" : " "}</span>
              </text>
            </box>
          )
        })}

        <box height={1} />
        <text>
          <span fg="#888">Preview: </span>
          <span fg="#FFF">{config.gridSize}x{config.gridSize}</span>
          <span fg="#888"> grid, </span>
          <span fg="#FFF">{config.playerCount}</span>
          <span fg="#888"> players</span>
        </text>
        <box flexDirection="row" gap={1} marginTop={1}>
          {Array.from({ length: config.playerCount }, (_, i) => (
            <text key={i} fg={getPlayerColor(i)}>{"██"}</text>
          ))}
        </box>
      </box>

      <box height={1} />
      <text>
        <span fg="#666">
          [Up/Down] select  [Left/Right] adjust  [Enter] start  [Esc] quit
        </span>
      </text>
    </box>
  )
}
