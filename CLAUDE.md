# Ninety Command

An Obsidian plugin that creates, tracks, and manages Ninety.io Issues, To-Dos, Rocks, Milestones, and Scorecard from within Obsidian.

## Deployment & testing — read before touching the live vault

**Production releases ship through GitHub + BRAT. Never treat the live vault as a deployment target.**

This plugin is developed against a real, personally-used vault: `The Wayfinder's Atlas`
(`.obsidian/plugins/ninety-command/`), installed there via the BRAT plugin. That vault is
normally open live in a running Obsidian instance while this repo is being worked on.

### How releases actually work here

- `main.js` is gitignored and **never committed**. BRAT does not read the repo tree directly.
- BRAT tracks **GitHub Releases**. Each release attaches `main.js`, `manifest.json`, and
  `styles.css` as binary release assets (confirm with `gh release view <version>`) — those
  assets are the actual thing BRAT installs, not anything in the git tree or the vault.
- The version bump (`package.json`, `manifest.json`, `versions.json`) is bundled into the same
  commit as the feature/fix it ships with — see e.g. commit `1a821fb` for the pattern.

### Shipping a real release

1. Land the feature/fix commit(s) normally.
2. Bump the version in `package.json`, then run `npm run version` — this runs
   `version-bump.mjs`, which syncs `manifest.json` and `versions.json` to match and stages
   both. Fold this into the same commit as the change.
3. `npm run build` to produce `main.js` (tsc typecheck + esbuild production bundle).
4. Push the commit; tag it with the bare version number (e.g. `1.4.0` — no `v` prefix, matches
   existing tags).
5. `gh release create <version> main.js manifest.json styles.css` — attach the three built
   files as binary assets. This is what BRAT actually reads.
6. BRAT picks up the new release on the vault's next update check.

### Local testing in the live vault (temporary only — never a substitute for a release)

It's fine to build and copy `main.js`/`manifest.json`/`styles.css` straight into
`.obsidian/plugins/ninety-command/` in the live vault to test a change before it ships. But:

- **Say so explicitly, every time.** Never deploy to the vault silently or describe it as
  "done" without calling out that it's an unreleased test build.
- **Do not bump the version in `manifest.json` for a test deploy.** If the version matches the
  last real release, BRAT will consider the vault already up to date and won't overwrite the
  test build with the real one later — it can silently masquerade as an official release
  indefinitely. Keep the version unchanged for test copies.
- **Don't drive or control the running Obsidian instance.** It's normally the user's live,
  already-open vault. Deploy the files, then ask the user to reload the plugin themselves
  (Ctrl/Cmd+P → "Reload app without saving", or toggle the plugin off/on in Settings →
  Community plugins) rather than automating clicks/window moves against their live session.
- **Close the loop.** Before considering the work finished, either revert the vault's plugin
  folder back to the last real release's assets, or make sure a real release actually ships —
  don't leave an unreleased test build sitting in the vault indefinitely.
