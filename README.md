# Claude Cat 🐱

A macOS desktop companion that watches Claude Code so you don't have to.

## The Problem

You kick off a task in Claude Code, switch to another window, and come back 30 minutes later — only to find Claude has been sitting there waiting for your click the entire time. Nothing got done. Again.

Claude Cat sits on your desktop and jumps to get your attention the moment Claude Code needs you. No more wasted sessions.

## What It Does

- **Instant alerts** — when Claude Code needs your input, your cat jumps and shows a notification bubble
- **Break reminders** — configurable reminders to step away and drink some water
- **Always on top** — lives on your desktop, visible no matter what app you're in
- **Draggable** — move the cat anywhere on screen
- **Fully customizable** — upload your own cat GIF/video, set names, adjust size, write your own alert messages

## Demo

![Claude Cat demo](assets/placeholder.png)

## Getting Started

### Requirements

- macOS
- [Node.js](https://nodejs.org/) v18+
- [Claude Code](https://claude.ai/code) installed

### Install & Run

```bash
git clone https://github.com/JaimeYeung/Claude-Cat.git
cd Claude-Cat
npm install
npm start
```

### Setup

1. **Right-click the cat** → Settings
2. Upload your main cat animation (GIF, PNG, or MP4) under **Assets → Main animation**
3. Under **Claude Code**, click **Install** to wire up the notification hook
4. That's it — Claude Cat will now jump whenever Claude Code needs your attention

## How It Works

Claude Cat installs a [Claude Code Notification hook](https://docs.anthropic.com/en/docs/claude-code/hooks) that fires a `curl` request to a local HTTP server whenever Claude Code needs user input. The Electron app receives this signal and triggers the cat animation + alert bubble.

The hook added to `~/.claude/settings.json` looks like this:

```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s http://localhost:7777/cat-gatekeeper || true"
          }
        ]
      }
    ]
  }
}
```

The hook is automatically removed when you quit the app.

## Settings

| Setting | Description |
|---|---|
| Cat name | What you call your cat |
| Your name | How the cat addresses you in alerts |
| Alert message | Text shown when Claude needs you |
| Break message | Text shown for break reminders |
| Cat size | 80px – 240px |
| Main animation | Required: GIF, PNG, or MP4 |
| Interaction animations | Optional: play / feed / pet |
| Sound | Optional: MP3 or WAV played on alert |
| Break reminder interval | How often to remind you to take a break |
| Language | English / 中文 |

## Building a DMG

```bash
npm run build
```

Output: `dist/Cat Gatekeeper-1.0.0.dmg`

## Disclaimer

Claude Cat is an independent open-source project and is not affiliated with or endorsed by Anthropic. Claude is a trademark of Anthropic.

## License

MIT
