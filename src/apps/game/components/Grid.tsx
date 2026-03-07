import { useMemo } from "react"
import { useTerminalDimensions } from "@opentui/react"
import type { GameState } from "../game/index.ts"
import { getPlayerColor } from "../game/index.ts"

interface GridProps {
  readonly gameState: GameState
  readonly gridSize: number
  readonly showAll?: boolean
}

const CELL_WIDTH = 2
const CELL_EMPTY = "  "
const CELL_CLAIMED = "██"
const CELL_CURSOR = "▓▓"
const CELL_SELECTED = "░░"
const HEADER_HEIGHT = 6
const FOOTER_HEIGHT = 3

interface CellView {
  readonly char: string
  readonly fg: string
}

export function Grid({ gameState, gridSize, showAll = false }: GridProps) {
  const { width: termWidth, height: termHeight } = useTerminalDimensions()

  const viewportCols = Math.min(gridSize, Math.floor((termWidth - 6) / CELL_WIDTH))
  const viewportRows = Math.min(gridSize, termHeight - HEADER_HEIGHT - FOOTER_HEIGHT)

  const viewport = useMemo(() => {
    const halfCols = Math.floor(viewportCols / 2)
    const halfRows = Math.floor(viewportRows / 2)

    const startX = Math.max(0, Math.min(gridSize - viewportCols, gameState.cursor.x - halfCols))
    const startY = Math.max(0, Math.min(gridSize - viewportRows, gameState.cursor.y - halfRows))

    return { startX, startY }
  }, [gameState.cursor.x, gameState.cursor.y, viewportCols, viewportRows, gridSize])

  const selectedSet = useMemo(() => {
    const set = new Set<string>()
    for (const pos of gameState.selectedThisTurn) {
      set.add(`${pos.x},${pos.y}`)
    }
    return set
  }, [gameState.selectedThisTurn])

  const rows = useMemo(() => {
    const result: CellView[][] = []

    for (let ry = 0; ry < viewportRows; ry++) {
      const gridY = viewport.startY + ry
      if (gridY >= gridSize) break

      const cells: CellView[] = []

      for (let rx = 0; rx < viewportCols; rx++) {
        const gridX = viewport.startX + rx
        if (gridX >= gridSize) break

        const cellOwner = gameState.grid[gridY]?.[gridX] ?? null
        const isCursor = gridX === gameState.cursor.x && gridY === gameState.cursor.y

        if (isCursor) {
          cells.push({ char: CELL_CURSOR, fg: getPlayerColor(gameState.currentPlayer) })
        } else if (cellOwner !== null) {
          const visible = showAll || cellOwner === gameState.currentPlayer
          if (visible) {
            const isNew = selectedSet.has(`${gridX},${gridY}`)
            cells.push({ char: isNew ? CELL_SELECTED : CELL_CLAIMED, fg: getPlayerColor(cellOwner) })
          } else {
            cells.push({ char: CELL_EMPTY, fg: "#222" })
          }
        } else {
          cells.push({ char: CELL_EMPTY, fg: "#222" })
        }
      }

      result.push(cells)
    }

    return result
  }, [gameState, viewport, viewportCols, viewportRows, gridSize, selectedSet, showAll])

  const endX = Math.min(viewport.startX + viewportCols - 1, gridSize - 1)
  const endY = Math.min(viewport.startY + viewportRows - 1, gridSize - 1)

  return (
    <box flexDirection="column" border borderStyle="rounded" borderColor="#444">
      <box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <text>
          <span fg="#666">({gameState.cursor.x},{gameState.cursor.y})</span>
        </text>
        <text>
          <span fg="#666">[{viewport.startX}-{endX}, {viewport.startY}-{endY}]</span>
        </text>
      </box>
      {rows.map((row, ry) => (
        <text key={ry}>
          {row.map((cell, rx) => (
            <span key={rx} fg={cell.fg}>{cell.char}</span>
          ))}
        </text>
      ))}
    </box>
  )
}
