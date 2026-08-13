# Ninety Command

Create, track, and manage your [Ninety.io](https://www.ninety.io/) Issues, To-Dos, Rocks, Milestones, and Scorecard from inside Obsidian — capture from the command palette, manage from a sidebar panel, or embed live, filterable lists directly in your notes.

## Features

- **Command palette** — create Issues, To-Dos, and Rocks (prefilled from any text you have selected), and add Milestones to a Rock.
- **Sidebar panel** — Issues, To-Dos, Rocks, and Scorecard for your default team, each row with quick complete / edit / delete actions. Filter by assignee live in the panel, or set a default in Settings.
- **Code block embeds** — `ninety-issues`, `ninety-todos`, and `ninety-rocks` blocks render live lists inline in a note, with an extensive set of filters (team, assignee, status, completed/archived, search, sort, and more — see [Code block reference](#code-block-reference) below). Add `interactive: true` to any block to get the same complete/edit/delete actions as the sidebar, right inside your note.
- **Settings** — a full parameter reference for every code block type is also built into Settings → Ninety Command, so you don't have to leave Obsidian to look it up.

Not covered, because the Ninety.io **Public API** doesn't expose it: L10 meetings, the Vision/Traction Organizer, the Accountability Chart, and comments/attachments. This plugin is a strong day-to-day tracking and quick-capture tool, not a full replacement for the Ninety.io web app.

## Installation

This plugin isn't in Obsidian's official Community Plugins directory (yet). Install it via **[BRAT](https://github.com/TfTHacker/obsidian42-brat)** (Beta Reviewers Auto-update Tool), which installs and auto-updates plugins directly from a GitHub repo:

1. Install **BRAT** from Obsidian's Community Plugins browser, if you don't have it already.
2. Open the command palette and run **BRAT: Add a beta plugin for testing**.
3. Paste this repo's URL: `https://github.com/apache-pine/ninety-command`
4. Enable **Ninety Command** in Settings → Community plugins.

BRAT will check this repo for new releases and update the plugin automatically.

## Setup

1. Generate a Personal Access Token at [app.ninety.io/settings/user/developer-settings](https://app.ninety.io/settings/user/developer-settings).
2. In Obsidian, open **Settings → Ninety Command** and paste the token in.
3. Click **Test Connection**, then pick a default team.

> **Note:** the token is stored unencrypted in this plugin's `data.json`, inside your vault's `.obsidian/plugins/ninety-command/` folder — the same way every other Obsidian plugin stores API keys/tokens. Don't sync or share that file if you'd rather keep it private.

## Code block reference

Each line inside a code block is a `key: value` pair. Unrecognized keys are ignored. Every block works with no parameters at all — it just uses your configured default team and item limit.

````markdown
```ninety-issues
team: Engineering
assignee: Jane Doe
completed: false
```
````

### `ninety-issues`

| Parameter | Accepts | Default | Notes |
|---|---|---|---|
| `team` | Team name or id; comma-separated for multiple | Configured default team | Only Issues supports multiple teams in one block |
| `limit` | Positive integer | Settings → Default item limit | |
| `maxheight` | Positive integer (pixels), e.g. `maxheight: 400` | no limit — block grows to fit all rows | Makes the item list scrollable instead of the block growing indefinitely. The header stays fixed. |
| `interactive` | `true` / `false` | `false` | Adds complete/edit/delete buttons to each row. Off by default so existing blocks are never silently made editable. |
| `interval` | `short_term` / `long_term` | both | |
| `completed` | `true` / `false` / `any` | `false` | Client-side filter — no server support |
| `archived` | `true` / `false` / `any` | `false` | Client-side filter — no server support |
| `assignee` / `owner` | Name, email, or id | no filter | Client-side filter — no server support. `owner` is an alias |
| `assignees` / `owners` | Comma-separated names/emails/ids | no filter | Takes precedence over the singular form if both given |
| `priority` | `0`-`5` | no filter | Client-side filter — no server support. Matches the Priority shown when creating/editing an Issue |
| `createdby` | Name, email, or id | no filter | Client-side filter — no server support |
| `search` | Free text | none | Matches title, description, and comments |
| `sort` | Any field name | `createdDate` | Passed through as-is, not validated. `sort: priority` is aliased to the API's actual field name, `rating` |
| `order` | `asc` / `desc` | `desc` | |

### `ninety-todos`

| Parameter | Accepts | Default | Notes |
|---|---|---|---|
| `team` | Team name or id | Configured default team | |
| `personal` | `false` | `false` | `true` always errors — confirmed against the live API, Ninety has no working way to list personal To-Dos. Leave unset. |
| `limit` | Positive integer | Settings → Default item limit | |
| `maxheight` | Positive integer (pixels), e.g. `maxheight: 400` | no limit — block grows to fit all rows | Makes the item list scrollable instead of the block growing indefinitely. The header stays fixed. |
| `interactive` | `true` / `false` | `false` | Adds complete/edit/delete buttons to each row. Off by default so existing blocks are never silently made editable. |
| `completed` | `true` / `false` / `any` | `false` | Server-side filter |
| `archived` | `true` / `false` / `any` | `false` | Server-side filter |
| `assignee` / `owner`, `assignees` / `owners` | Name, email, or id (comma-separated for a list) | no filter | Client-side filter — no server support, unlike completed/archived |
| `createdby` | Name, email, or id | no filter | Client-side filter — no server support |
| `repeat` | `daily` / `weekly` / `monthly` / `quarterly` / `none` | no filter | Client-side filter. `none` (or `off`) is an alias for "Don't repeat" |
| `title` | Free text | none | Exact-match filter, distinct from search |
| `search` | Free text | none | Matches title and description |
| `sort` | Any field name | `dueDate` | |
| `order` | `asc` / `desc` | `asc` | |

### `ninety-rocks`

| Parameter | Accepts | Default | Notes |
|---|---|---|---|
| `team` | Team name or id | Configured default team | Single team only |
| `limit` | Positive integer | Settings → Default item limit | |
| `maxheight` | Positive integer (pixels), e.g. `maxheight: 400` | no limit — block grows to fit all rows | Makes the item list scrollable instead of the block growing indefinitely. The header stays fixed. |
| `interactive` | `true` / `false` | `false` | Adds complete/edit/delete buttons to each row. Off by default so existing blocks are never silently made editable. |
| `status` | `off_track` / `on_track` / `done` / `canceled` / `draft` | active only (excludes done & canceled) | An explicit status skips the default active-only filter |
| `level` | `user` / `company_and_department` / `company` / `department` | all levels | |
| `futurescope` | `current` / `next` / `later` / `future` / `all` | unset | |
| `archived` | `true` / `false` / `any` | `false` | Server-side filter |
| `includegoals` | `true` / `false` | unset | Includes linked goals in the response |
| `owner` / `assignee` | Name, email, or id | no filter | Server-side filter |
| `owners` / `assignees` | Comma-separated names/emails/ids | no filter | Server-side filter; takes precedence over the singular form |
| `createdby` | Name, email, or id | no filter | Client-side filter — no server support |
| `search` | Free text | none | |
| `sort` | `title` / `statuscode` / `duedate` / `completeddate` / `owner` / `team` / `duedatequarter` | `dueDate` | Unrecognized values fall back to the default rather than erroring |
| `order` | `asc` / `desc` | `asc` | |

This same table is also available inside Obsidian, under **Settings → Ninety Command → Code block parameter reference**.

## Settings

- **API token** — your Ninety.io Personal Access Token.
- **Default team** — pre-fills the team when creating Issues/To-Dos/Rocks, and is the fallback team for the sidebar and any code block without its own `team:`.
- **Default assignee** — pre-selects the sidebar's assignee filter when it opens; change it live in the panel any time without touching this setting.
- **Auto-refresh panel** — optionally refresh the sidebar panel on an interval while it's open.
- **Default item limit** — default row count for the sidebar and any code block without its own `limit:`.
- **Show item counts in code blocks** — displays a count of rendered items next to each code block's title.
- **Confirm before completing** — off by default; turn on if you'd rather confirm before the complete/mark-done row action runs, in the sidebar and in interactive code blocks.
- **Confirm before deleting** — on by default; turn off if you're confident you won't hit delete by accident, in the sidebar and in interactive code blocks.
- **Cached data** — teams and users are cached locally; "Refresh now" re-fetches both (needed before the Default assignee dropdown has anything to choose from).
- **Code block parameter reference** — a collapsible, in-app copy of the tables above.

## Development

```bash
npm install
npm run dev
```

This watches `src/` and rebuilds `main.js` on save. Copy (or symlink) `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/ninety-command/` folder, then reload/enable the plugin in Obsidian.

## Status

Feature-complete for day-to-day tracking: capture, complete/edit/delete, the sidebar panel, Scorecard, and richly-parameterized code block embeds are all in place.
