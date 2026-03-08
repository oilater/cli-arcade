<img width="598" height="126" alt="스크린샷 2026-03-09 오전 12 41 09" src="https://github.com/user-attachments/assets/af1ac1c0-f7fc-4377-ac82-78061e8d5320" />

> This logo is powered by [pxpx](https://github.com/tolluset/pxpx) 🎨 

Enjoy Crazy Arcade in your terminal!

## Demo Video

https://github.com/user-attachments/assets/b13afc38-b521-4cc9-8215-5a98c6fdb98a

## Installation

Current version only supports Solo play (with maximum 3 Bots) and Local Network hosting.

### Homebrew (macOS Apple Silicon / Linux)

```bash
# Installation
brew tap oilater/tap && brew install cli-arcade

# Run game
ca start

# Guide
ca guide 또는 ca --help
```

### Local Execution

```bash
git clone https://github.com/oilater/cli-arcade.git
cd cli-arcade
bun install
bun link
ca start
```

### Controls

**1P:**
- Arrow Keys: Move
- Space: Plant Bomb
- 1: Use Dart
- 2: Use Needle
- Esc: Quit

**2P:**
- P1: WASD / Space: Bomb / 1: Dart / 2: Needle
- P2: Arrow Keys / /: Bomb / .: Dart / ,: Needle


## Items

- 💧 Range — Explosion range +1 (Max 8)
- 💣 Bomb — Max simultaneous bombs +1 (Max 5)
- 🎯 Dart — Throw to remotely detonate a bomb
- 💉 Needle — Revive when trapped in a bubble (10% drop rate)

## Modes

```bash
ca                          # Select mode
ca start --solo             # Bot match
ca start --online           # Online matchmaking (Just only solo or local network)
ca start --join AB12        # Join via Room Code
ca start --host             # Host on local network
ca start --join 192.168.x:7778  # Join local host
```
