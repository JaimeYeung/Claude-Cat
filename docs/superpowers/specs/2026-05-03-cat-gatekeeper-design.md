# Cat Gatekeeper — Design Spec

Date: 2026-05-03

## Overview

A macOS desktop pet app built with Electron. A cat sits on the desktop at all times, plays animations, and — crucially — jumps up and alerts the user when Claude Code is waiting for their input. Supports custom cat assets, personalized names, and timed break reminders.

## Core Problem

When using Claude Code, the user often misses the moment Claude needs approval or input. The session stalls for 30+ minutes unnoticed. This app solves that by putting a persistent, attention-grabbing cat on the desktop that reacts immediately when Claude Code fires a notification hook.

---

## Architecture

**Tech stack:** Electron + HTML/CSS/JS (no frontend framework). macOS first; Windows support is a future iteration.

**Process structure:**

- **Main process (Node.js):** HTTP server (port 7777), Claude Code hook installation/removal, break reminder timer, file system operations (asset storage, config read/write)
- **Renderer process (Chromium):** Cat UI, animations, alert bubble, settings panel

**Window:** Transparent, frameless, always-on-top. Mouse events pass through transparent areas; cat body and menus are clickable. Implemented via Electron's `setIgnoreMouseEvents({ forward: true })` toggled based on whether the cursor is over a clickable element.

**Platform:** macOS only for v1. electron-builder for packaging → `.dmg`.

---

## Claude Code Integration

**Communication chain:**
```
Claude Code needs user action
  → fires Notification hook
  → curl -s http://localhost:7777/notify || true
  → Main process HTTP server receives request
  → IPC message to Renderer
  → Cat jumps + frosted glass bubble appears
```

**Hook auto-setup:**
- On app start: read `~/.claude/settings.json`, merge in the hook entry without overwriting other config, write back
- On app quit: remove only the Cat Gatekeeper hook entry, leave everything else intact
- Settings panel shows current hook status (installed / not installed) with manual install/uninstall buttons
- Hook command uses `|| true` so Claude Code never logs a failure if the app isn't running

**Hook entry written to `~/.claude/settings.json`:**
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s http://localhost:7777/notify || true"
          }
        ]
      }
    ]
  }
}
```

**Port conflict handling:** If 7777 is in use, try 7778, 7779, up to 5 attempts. Write the chosen port to `config.json` so the hook command stays in sync.

---

## Alert Behavior

When the HTTP server receives `/notify`:

1. Cat plays a jump/bounce animation
2. Frosted glass speech bubble appears above the cat with personalized text, e.g. `"主人，Claude 需要你了喵~"`
3. Bubble stays visible until the user hovers over the cat
4. If a sound asset is uploaded, play it once

**Bubble style:** Semi-transparent background (`rgba(255,255,255,0.15)`), `backdrop-filter: blur(12px)`, white border, downward-pointing triangle, white text. Adapts to both dark and light desktop wallpapers.

---

## Animation System

**States and priority (highest to lowest):**

1. **Alert** — Claude Code notification received. Jump animation + bubble. Interrupts everything.
2. **Interaction** — User triggered play/feed/pet. Plays dedicated animation if uploaded, otherwise overlay particle effect. Interrupts random animations.
3. **Random** — Every 5–15 minutes (randomized, not user-configurable in v1), pick one uploaded random animation and play it, then return to main.
4. **Main** — Default. Loops the uploaded main animation continuously.

**Particle effects (fallback for interactions without dedicated animation):**
- Play: sparkle burst (✨) around the cat
- Feed: food emoji (🍣) floats up from cat's mouth and fades out
- Pet: hearts (💕) float up from cat's head and fade out

---

## Asset System

**Storage location:** `~/Library/Application Support/CatGatekeeper/assets/`

**Asset types:**

| Key | Required | Formats | Description |
|-----|----------|---------|-------------|
| `main` | Yes | GIF, MP4, PNG | Main looping animation |
| `random[]` | No | GIF, MP4 | Randomly inserted idle clips |
| `interact.play` | No | GIF, MP4 | Plays when user plays with cat |
| `interact.feed` | No | GIF, MP4 | Plays when user feeds cat |
| `interact.pet` | No | GIF, MP4 | Plays when user pets cat |
| `sound` | No | MP3, WAV | Plays on Claude Code alert |

Without a main asset uploaded, the cat displays a default placeholder emoji (🐱).

---

## Settings Panel

Layout: single-page scroll (no tabs), white background, section dividers.

**Sections:**

### 称呼
- 我该叫猫猫：text input (default: "猫猫")
- 猫猫怎么叫我：text input (default: "主人")

### 素材管理
- **主动画** (required label): upload area. Once uploaded, shows green preview with filename, size, and delete button.
- **其他素材** (optional label):
  - 交互动画: upload slots for play, feed, and pet
  - 随机动画: upload multiple clips
  - 叫声: upload one audio file

### Claude Code
- Status indicator: green "Hook 已安装" or grey "未安装"
- Install / Uninstall button

### 休息提醒
- Toggle on/off
- Interval input: "每 [45] 分钟提醒一次"

---

## Break Reminder

- Timer runs in the main process
- On fire: same alert mechanism as Claude Code notification, bubble text: `"{userName}，休息一下喝点水~"` (uses `userName` from config)
- Timer resets after each alert
- Persists across app restarts (stores last-reminded timestamp in config)

---

## Config File

Stored at `~/Library/Application Support/CatGatekeeper/config.json`:

```json
{
  "catName": "橘子",
  "userName": "主人",
  "breakInterval": 45,
  "breakEnabled": true,
  "hookInstalled": true,
  "hookPort": 7777,
  "lastBreakReminder": 1746000000000
}
```

---

## User Interactions

**Mouse:**
- Drag cat body to reposition
- Hover cat: shows interaction buttons (玩耍, 喂食, 摸头) + dismisses alert bubble
- Left-click interaction button: triggers interaction
- Right-click anywhere on cat: opens settings panel

**Settings panel:**
- Opens as a separate Electron `BrowserWindow` (not transparent, normal window chrome)
- Text inputs save on blur or Enter; toggles and interval inputs save immediately on change

---

## Out of Scope (v1)

- Windows support (future iteration)
- Cloud sync or backup of assets
- Multiple cat profiles
- App Store distribution (no code signing required for v1 — users right-click → Open to bypass Gatekeeper)
