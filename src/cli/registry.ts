import type { ReactNode } from "react"
import { GameApp } from "../apps/game/index.tsx"
import { BombApp } from "../apps/bomb/index.tsx"

export interface AppEntry {
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly component: (props: { args: ReadonlyArray<string> }) => ReactNode
}

export const APP_REGISTRY: ReadonlyArray<AppEntry> = [
  {
    name: "game",
    description: "Territory claiming game (local & online)",
    icon: "▣",
    component: GameApp,
  },
  {
    name: "bomb",
    description: "Bomberman-style action game (local & online)",
    icon: "●",
    component: BombApp,
  },
]

export function findApp(name: string): AppEntry | undefined {
  return APP_REGISTRY.find((app) => app.name === name)
}
