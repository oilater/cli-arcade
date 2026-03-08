import { useMemo } from "react"
import type { BombGameState } from "../game/index.ts"
import { getPlayerColor } from "../game/index.ts"

interface BombGridProps {
  readonly state: BombGameState
  readonly myIndex?: number
  readonly solo?: boolean
}

interface CellView {
  readonly char: string
  readonly fg: string
  readonly bg: string
}

const WALL = { char: "██", fg: "#374151", bg: "#1F2937" }
const BLOCK = { char: "▒▒", fg: "#92702A", bg: "#5C4516" }
const FLOOR = { char: "··", fg: "#1A1A30", bg: "#16162A" }

const PLAYER_BG = "#16162A"

const BOMB_FG_WARN = "#FF8C00"
const BOMB_FG_CRIT = "#FF2020"
const BOMB_BG = "#16162A"

const FIRE: CellView[] = [
  { char: "██", fg: "#FFDD33", bg: "#FF4500" },
  { char: "▓▓", fg: "#FF6600", bg: "#CC3300" },
  { char: "░░", fg: "#CC3300", bg: "#661A00" },
]

const DART_CHARS: Record<string, string> = {
  "1,0": "→ ",
  "-1,0": "← ",
  "0,-1": "↑ ",
  "0,1": "↓ ",
}
const DART_FG = "#E879F9"
const DART_BG = "#16162A"

const ITEMS: Record<string, CellView> = {
  range: { char: "💧", fg: "#FF6B6B", bg: "#331111" },
  bomb:  { char: "💣", fg: "#4ECDC4", bg: "#113333" },
  dart:   { char: "🎯", fg: "#E879F9", bg: "#2A1133" },
  needle: { char: "💉", fg: "#FF69B4", bg: "#331122" },
}

function getColor(pIdx: number, myIndex?: number): string {
  if (myIndex === undefined) return getPlayerColor(pIdx)
  return pIdx === myIndex ? "#3B82F6" : "#EF4444"
}

export function BombGrid({ state, myIndex, solo }: BombGridProps) {
  const explosionSet = useMemo(() => {
    const set = new Map<string, number>()
    for (const e of state.explosions) set.set(`${e.x},${e.y}`, e.timer)
    return set
  }, [state.explosions])

  const bombMap = useMemo(() => {
    const map = new Map<string, { timer: number; owner: number }>()
    for (const b of state.bombs) map.set(`${b.x},${b.y}`, { timer: b.timer, owner: b.owner })
    return map
  }, [state.bombs])

  const playerMap = useMemo(() => {
    const map = new Map<string, { index: number; alive: boolean; trapped: boolean }>()
    const sorted = [...state.players].sort((a, b) => Number(a.alive) - Number(b.alive))
    for (const p of sorted) {
      map.set(`${p.x},${p.y}`, { index: p.index, alive: p.alive, trapped: p.trappedTimer > 0 })
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

  const dartMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of state.darts) {
      map.set(`${d.x},${d.y}`, `${d.dx},${d.dy}`)
    }
    return map
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

        if (explosionSet.has(key)) {
          const timer = explosionSet.get(key)!
          const phase = Math.min(2, Math.floor((5 - timer) / 2))
          cells.push(FIRE[phase] ?? FIRE[0]!)
        } else if (dartMap.has(key)) {
          const dir = dartMap.get(key)!
          cells.push({ char: DART_CHARS[dir] ?? ">>", fg: DART_FG, bg: DART_BG })
        } else if (playerMap.has(key)) {
          const { index: pIdx, alive, trapped } = playerMap.get(key)!
          if (!alive) {
            cells.push({ char: "✗✗", fg: "#555", bg: PLAYER_BG })
          } else if (trapped) {
            const blink = state.tickCount % 6 < 3
            cells.push({ char: blink ? "💀" : "██", fg: blink ? "#FF4444" : getColor(pIdx, myIndex), bg: PLAYER_BG })
          } else {
            const isMe = pIdx === myIndex
            const isBot = solo && pIdx !== myIndex
            cells.push({ char: isMe ? "🟦" : isBot ? "🤖" : "██", fg: getColor(pIdx, myIndex), bg: PLAYER_BG })
          }
        } else if (bombMap.has(key)) {
          const { timer, owner } = bombMap.get(key)!
          const blink = state.tickCount % 4 < 2
          const isMyBomb = owner === myIndex
          const fg = timer <= 10
            ? (blink ? BOMB_FG_CRIT : "#880000")
            : timer <= 20
              ? BOMB_FG_WARN
              : getColor(owner, myIndex)
          cells.push({ char: isMyBomb ? "🔵" : "🔴", fg, bg: BOMB_BG })
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
  }, [state.map, state.tickCount, explosionSet, dartMap, playerMap, bombMap, itemMap])

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
