#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { parseArgs } from "./cli/parse-args.ts"
import { findApp } from "./cli/registry.ts"
import { App } from "./App.tsx"

const parsed = parseArgs(process.argv)

if (parsed.command === "guide") {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║              CLI Arcade - Game Guide                 ║
  ╚══════════════════════════════════════════════════════╝

  Place bombs, destroy blocks, collect items,
  and be the last one standing.

  Hit by an explosion? You get trapped for 3 seconds.
  Use a needle to escape, or die. Step on a trapped
  player to finish them off.

  ── Items ───────────────────────────────────────────

  💧 Range     Bomb explosion range +1 (max 8)
  💣 Bomb      Max simultaneous bombs +1 (max 5)
  🎯 Dart      Throwable — detonates bombs on hit
  💉 Needle    Escape when trapped (10% drop, rare)

  ── Controls ────────────────────────────────────────

  Solo:
    Arrow Keys    Move
    Space         Place bomb
    1             Throw dart (facing direction)
    2             Use needle (when trapped)
    Esc           Quit

  Local 2P:
    P1            W/A/S/D    Space:bomb  1:dart  2:needle
    P2            Arrows     /:bomb      .:dart  ,:needle

  ── Game Modes ──────────────────────────────────────

  ca                             Mode select
  ca start --solo                Solo (vs bots)
  ca start --online              Online matchmaking
  ca start --join <ROOM_CODE>    Join by room code
  ca start --host                Host on local network
  ca start --join <ip:port>      Join local game

  ── Options ─────────────────────────────────────────

  --name "Alice"                 Set player name
  --server <host>                Custom server address

  ── Tips ────────────────────────────────────────────

  - Bombs chain-react. Set up combos.
  - Darts detonate bombs from a distance.
  - Walk into a trapped player to kill them instantly.
  - Dead players stay on the map as obstacles.
  - Needles only drop 10% of the time.

`)
  process.exit(0)
}

const command = parsed.command
const app = command === "start" || !command
  ? findApp("bomb")!
  : findApp(command) ?? null

if (parsed.command && !app) {
  console.error(`Unknown command: ${parsed.command}`)
  console.error(`Run 'ca guide' for help`)
  process.exit(1)
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App app={app} subArgs={parsed.subArgs} />)
