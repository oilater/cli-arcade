#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { parseArgs } from "./cli/parse-args.ts"
import { findApp, APP_REGISTRY } from "./cli/registry.ts"
import { App } from "./App.tsx"

const parsed = parseArgs(process.argv)

if (parsed.help) {
  console.log(`
ca - Team TUI toolkit

Usage:
  ca                     Interactive launcher
  ca <command> [options]  Run a specific app

Available commands:
${APP_REGISTRY.map((a) => `  ${a.name.padEnd(12)} ${a.description}`).join("\n")}

Territory game:
  ca game                        Local game (setup screen)
  ca game -g 50 -p 3             Local: 50x50 grid, 3 players
  ca game --host                 Host online
  ca game --join localhost:7777  Join online

Bomb game:
  ca bomb                        Local 2P (WASD+Q / Arrows+/)
  ca bomb --host                 Host online
  ca bomb --join localhost:7778  Join online

Common options:
  --name "Alice"                 Set player name
  -h, --help                     Show this help
`)
  process.exit(0)
}

const app = parsed.command ? findApp(parsed.command) ?? null : null

if (parsed.command && !app) {
  console.error(`Unknown command: ${parsed.command}`)
  console.error(`Run 'ca --help' for available commands`)
  process.exit(1)
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App app={app} subArgs={parsed.subArgs} />)
