# Ninety.io for Obsidian

Connects Obsidian to the [Ninety.io](https://www.ninety.io/) Public API — create, complete, edit, and delete Issues, To-Dos, and Rocks; track Scorecard Measurables; and embed live views of any of them in your notes, without leaving your vault.

## Features

- **Command palette**: create Issues, To-Dos, and Rocks (with selection prefill), and add Milestones to a Rock.
- **Sidebar panel**: Issues, To-Dos, Rocks, and Scorecard for your default team, with quick complete/edit/delete actions on each row.
- **Code block embeds**: ` ```ninety-issues ` / ` ```ninety-todos ` / ` ```ninety-rocks ` blocks render live lists inline in a note, with an extensive set of filter/sort parameters (team, assignee, status, completed/archived, search, and more). See **Settings → Ninety.io → Code block parameter reference** for the full list of parameters each block type accepts.

## Setup

1. Generate a Personal Access Token at [app.ninety.io/settings/user/developer-settings](https://app.ninety.io/settings/user/developer-settings).
2. In Obsidian, open **Settings → Ninety.io** and paste the token in.
3. Click **Test Connection**, then pick a default team.

> **Note:** the token is stored unencrypted in this plugin's `data.json`, inside your vault's `.obsidian/plugins/ninety-io/` folder — the same way every other Obsidian plugin stores API keys/tokens. Don't sync or share that file if you'd rather keep the token private, and never commit a real `data.json` to this repo (it's git-ignored).

## Development

```bash
npm install
npm run dev
```

This watches `src/` and rebuilds `main.js` on save. Copy (or symlink) `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/ninety-io/` folder, then reload/enable the plugin in Obsidian.

## Status

Feature-complete for day-to-day tracking: capture, complete/edit/delete, the sidebar panel, Scorecard, and richly-parameterized code block embeds are all in place. Not covered by the Ninety.io Public API (and so out of scope here): L10 meetings, the Vision/Traction Organizer, the Accountability Chart, and comments/attachments.
