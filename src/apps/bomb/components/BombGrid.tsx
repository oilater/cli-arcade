import { useMemo } from "react"
import type { BombGameState } from "../game/index.ts"
import { getPlayerColor } from "../game/index.ts"

interface BombGridProps {
  readonly state: BombGameState
}

interface CellView {
  readonly char: string
  readonly fg: string
  readonly bg: string
}

// ── Theme ──────────────────────────────────────
const WALL = { char: "██", fg: "#374151", bg: "#1F2937" }
const BLOCK = { char: "▒▒", fg: "#92702A", bg: "#5C4516" }
const FLOOR = { char: "··", fg: "#252540", bg: "#16162A" }

// Player: solid bright block
const PLAYER_BG = "#16162A"

// Bomb: ticking with urgency
const BOMB_FG_SAFE = "#AAA"
const BOMB_FG_WARN = "#FF8C00"
const BOMB_FG_CRIT = "#FF2020"
const BOMB_BG = "#16162A"

// Explosion: 3-phase fire animation
const FIRE: CellView[] = [
  { char: "██", fg: "#FFDD33", bg: "#FF4500" },   // bright flash
  { char: "▓▓", fg: "#FF6600", bg: "#CC3300" },   // hot core
  { char: "░░", fg: "#CC3300", bg: "#661A00" },   // fading ember
]

// Dart projectile in flight
const DART: CellView = { char: ">>", fg: "#E879F9", bg: "#16162A" }

// Item pickups (clear labels)
const ITEMS: Record<string, CellView> = {
  range: { char: "R↑", fg: "#FF6B6B", bg: "#331111" },
  bomb:  { char: "B+", fg: "#4ECDC4", bg: "#113333" },
  dart:  { char: "D!", fg: "#E879F9", bg: "#2A1133" },
}

export function BombGrid({ state }: BombGridProps) {
  const explosionSet = useMemo(() => {
    const set = new Map<string, number>()
    for (const e of state.explosions) set.set(`${e.x},${e.y}`, e.timer)
    return set
  }, [state.explosions])

  const bombMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of state.bombs) map.set(`${b.x},${b.y}`, b.timer)
    return map
  }, [state.bombs])

  const playerMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of state.players) {
      if (p.alive) map.set(`${p.x},${p.y}`, p.index)
    }
    return map
  }, [state.players])

  const itemMap = useMemo(() => {
    const map = new Map<string, CellView>()
    for (const item of state.items) {
      const view = ITEMS[item.type]
      if (view) map.set(`${item.x},${item.y}`, view)
    }
    return map
  }, [state.items])

  const dartSet = useMemo(() => {
    const set = new Set<string>()
    for (const d of state.darts) set.add(`${d.x},${d.y}`)
    return set
  }, [state.darts])

  const rows = useMemo(() => {
    const result: CellView[][] = []

    for (let y = 0; y < state.map.length; y++) {
      const row = state.map[y]
      if (!row) continue
      const cells: CellView[] = []

      for (let x = 0; x < row.length; x++) {
        const key = `${x},${y}`
        const cell = row[x]

        // Priority: explosion > dart > player > bomb > item > terrain
        if (explosionSet.has(key)) {
          const timer = explosionSet.get(key)!
          const phase = Math.min(2, Math.floor((5 - timer) / 2))
          cells.push(FIRE[phase] ?? FIRE[0]!)
        } else if (dartSet.has(key)) {
          cells.push(DART)
        } else if (playerMap.has(key)) {
          const pIdx = playerMap.get(key)!
          cells.push({ char: "██", fg: getPlayerColor(pIdx), bg: PLAYER_BG })
        } else if (bombMap.has(key)) {
          const timer = bombMap.get(key)!
          const sec = Math.ceil(timer / 10)
          const blink = state.tickCount % 4 < 2
          const fg = timer <= 10
            ? (blink ? BOMB_FG_CRIT : "#880000")
            : timer <= 20
              ? BOMB_FG_WARN
              : BOMB_FG_SAFE
          cells.push({ char: "●●", fg, bg: BOMB_BG })
        } else if (itemMap.has(key)) {
          cells.push(itemMap.get(key)!)
        } else {
          switch (cell) {
            case "wall":  cells.push(WALL); break
            case "block": cells.push(BLOCK); break
            default:      cells.push(FLOOR); break
          }
        }
      }

      result.push(cells)
    }

    return result
  }, [state.map, state.tickCount, explosionSet, dartSet, playerMap, bombMap, itemMap])

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor="#0E0E1A">
      {rows.map((row, ry) => (
        <text key={ry}>
          {row.map((cell, rx) => (
            <span key={rx} fg={cell.fg} bg={cell.bg}>{cell.char}</span>
          ))}
        </text>
      ))}
    </box>
  )
}
