#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { parseArgs } from "./cli/parse-args.ts"
import { findApp } from "./cli/registry.ts"
import { App } from "./App.tsx"

const parsed = parseArgs(process.argv)

if (parsed.help) {
  console.log(`
ca - CLI Arcade

Usage:
  ca start                       Launch game (interactive menu)
  ca start [options]             Launch with options

Options:
  ca start --host                Host online game
  ca start --join <ip:port>      Join online game
  ca start --solo                Solo mode (vs bots)
  --name "Alice"                 Set player name
  -h, --help                     Show this help
`)
  process.exit(0)
}

const command = parsed.command
const app = command === "start" || !command
  ? findApp("bomb")!
  : findApp(command) ?? null

if (parsed.command && !app) {
  console.error(`Unknown command: ${parsed.command}`)
  console.error(`Run 'ca --help' for available commands`)
  process.exit(1)
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App app={app} subArgs={parsed.subArgs} />)
