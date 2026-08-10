# Ninety.io for Obsidian

Connects Obsidian to the [Ninety.io](https://www.ninety.io/) Public API so you can capture Issues, To-Dos, and Rocks without leaving your vault.

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

Early scaffold — settings and API connectivity only. Capture commands, a sidebar view, and note embeds are planned next.
