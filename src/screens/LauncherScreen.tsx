import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { APP_REGISTRY, type AppEntry } from "../cli/registry.ts"

interface LauncherScreenProps {
  readonly onSelect: (app: AppEntry) => void
}

export function LauncherScreen({ onSelect }: LauncherScreenProps) {
  const renderer = useRenderer()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    switch (key.name) {
      case "escape":
      case "q":
        renderer.destroy()
        break
      case "up":
      case "k":
        setSelectedIndex((i) => Math.max(0, i - 1))
        break
      case "down":
      case "j":
        setSelectedIndex((i) => Math.min(APP_REGISTRY.length - 1, i + 1))
        break
      case "enter":
      case "return":
        if (APP_REGISTRY[selectedIndex]) {
          onSelect(APP_REGISTRY[selectedIndex])
        }
        break
    }
  })

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <ascii-font text="cli arcade" font="tiny" color="#3B82F6" />
      <box height={1} />

      <box
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor="#444"
        padding={1}
        paddingX={2}
        width={50}
      >
        {APP_REGISTRY.map((app, i) => {
          const selected = i === selectedIndex
          return (
            <box key={app.name} flexDirection="row" gap={1}>
              <text fg={selected ? "#3B82F6" : "#666"}>
                {selected ? ">" : " "}
              </text>
              <text fg={selected ? "#FFF" : "#888"}>
                {app.icon} {app.name}
              </text>
              <text fg="#555">
                - {app.description}
              </text>
            </box>
          )
        })}
      </box>

      <box height={1} />
      <text>
        <span fg="#666">[Up/Down] select  [Enter] launch  [Esc] quit</span>
      </text>
    </box>
  )
}
