# Server Switcher Card

A custom Lovelace card that lets you switch between Home Assistant servers from inside the Home Assistant Companion app — without the three-finger swipe gesture.

It renders as a floating circular avatar in the corner of your dashboard. Tap it and a menu drops down listing your other servers as letter avatars. Tap one and the Companion app jumps to that server (and to a specific dashboard, if you want).

> **Why this exists:** the Companion app supports multiple servers natively, but the only built-in way to switch is a three-finger swipe gesture that's easy to miss and frustrating to discover. The app *does* register a `homeassistant://navigate/<path>?server=<name>` deep link, but until now nothing in the Lovelace UI exposed it. This card does.

## Demo

> _Screenshots / GIF coming soon._

## Requirements

- Home Assistant Companion app (Android or iOS) with **two or more servers added** (Settings → Companion app → Servers).
- The `homeassistant://navigate/<path>?server=<name>` URL scheme — built into the official Companion app since 2021. Confirmed working on Android.

> The `homeassistant://` scheme only works inside the Companion app. In a regular browser or PWA, tapping a menu entry will do nothing — that's expected.

## Installation

### Option 1 — HACS (recommended)

Once published to the default HACS repository:

1. HACS → Frontend → search for **Server Switcher Card**.
2. Install.
3. Add the resource (HACS usually does this automatically).

Until then, you can add this repo as a **custom repository** in HACS:

1. HACS → Frontend → ⋮ → Custom repositories.
2. URL: `https://github.com/jeffsturch/server-switcher-card`, category: `Lovelace`.
3. Install.

### Option 2 — Manual

1. Download `server-switcher-card.js` from the latest [release](https://github.com/jeffsturch/server-switcher-card/releases).
2. Copy it to `<config>/www/server-switcher-card/server-switcher-card.js` on your Home Assistant host.
3. Add the resource in **Settings → Dashboards → ⋮ → Resources**:
   - URL: `/local/server-switcher-card/server-switcher-card.js`
   - Type: **JavaScript Module**
4. Hard-refresh the Lovelace UI.

## Usage

Add the card to any dashboard. It doesn't need a grid cell to display — the avatar floats over the page — but it has to be present on the dashboard to mount.

### Visual editor

Since v0.2.0 the card ships with a visual editor. When you add the card via the dashboard editor, you'll get a form with three sections: **Current location**, **Locations to switch to** (with add/remove buttons), and an optional **Layout** group for position/size/header tweaks. You can still drop into "Show code editor" to edit the YAML directly if you prefer.

### Minimal example

```yaml
type: custom:server-switcher-card
current:
  letter: M
  name: Millwood Home
  color: "#4285f4"
servers:
  - letter: K
    name: Kohl Cottage
    color: "#0f9d58"
    server: Cottage              # the Companion-app server name (case-sensitive)
    path: dashboard-mobile        # the dashboard url_path on that server
```

Tap the **M** avatar in the top right → menu drops down with **Millwood Home** (current, with check) and **Kohl Cottage** (tap to switch).

### Full configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `current` | object | required | The server you're on now. Shown as the floating avatar and the top item in the menu. |
| `current.letter` | string | first letter of `name` | Letter shown in the avatar. |
| `current.name` | string | required | Display name in the menu. |
| `current.color` | CSS color | `#4285f4` | Avatar background color. |
| `current.subtitle` | string | — | Optional small text under the name. |
| `servers` | array | required | The other servers you want to switch to. |
| `servers[].letter` | string | first letter of `name` | Letter shown on this server's avatar. |
| `servers[].name` | string | required | Display name. |
| `servers[].color` | CSS color | `#0f9d58` | Avatar background color. |
| `servers[].subtitle` | string | — | Optional small text under the name. |
| `servers[].server` | string | required | The server name as configured in the Companion app (Settings → Companion app → Servers). Case-sensitive. |
| `servers[].path` | string | `lovelace` | The `url_path` of the dashboard to land on. Find it in the URL bar of that dashboard, e.g. `dashboard-mobile`. |
| `position.top` | CSS length | `80px` | Distance from the top of the viewport. |
| `position.right` | CSS length | `16px` | Distance from the right edge of the viewport. |
| `size` | number (px) | `40` | Diameter of the floating avatar. |
| `header` | string | `Switch location` | Label at the top of the dropdown menu. |
| `show_placeholder` | `auto` \| `always` \| `never` | `auto` | When to show the inline placeholder card in the dashboard. `auto` only shows it while the dashboard is in edit mode (so users can see and click the card to configure it). `always` keeps it visible in view mode too. `never` hides it everywhere. |

### Finding the values

**Server name** — open the Companion app → Settings → Companion app → Servers. Use the name you see there.

**Dashboard `url_path`** — open the dashboard you want to land on, look at the browser URL. The path after the slash is what you want. For example:

- `https://yourhome.com/lovelace/0` → `lovelace`
- `https://yourhome.com/dashboard-mobile/home` → `dashboard-mobile`

If you want to land on a specific *view* inside that dashboard, append the view path: `path: dashboard-mobile/home`.

### Mirroring on the other server

Add a card to a dashboard on each server. They're independent installs — each one knows what `current` is for itself.

On Server A:

```yaml
type: custom:server-switcher-card
current: { letter: A, name: Home A, color: "#4285f4" }
servers:
  - { letter: B, name: Home B, color: "#0f9d58", server: HomeB, path: lovelace }
```

On Server B:

```yaml
type: custom:server-switcher-card
current: { letter: B, name: Home B, color: "#0f9d58" }
servers:
  - { letter: A, name: Home A, color: "#4285f4", server: HomeA, path: lovelace }
```

## Troubleshooting

**The avatar doesn't appear.**
Hard-refresh the Lovelace UI (pull-to-refresh in the app). If still missing, open the browser console and look for the `SERVER-SWITCHER-CARD vX.Y.Z` banner — if it isn't there, the resource isn't loading. Re-check the resource URL in Settings → Dashboards → Resources.

**Tapping a menu item does nothing.**
You're probably in a regular browser or PWA, not the Companion app. The `homeassistant://` scheme is only handled by the Companion app. Open the dashboard inside the app and try again.

**The Companion app jumps to the wrong server, or shows "server not found".**
The `server` value in your config has to match exactly what the Companion app shows under Settings → Companion app → Servers. Case-sensitive, spaces matter.

**The card lands on the wrong dashboard after switching.**
Check the `path` value — it should be the `url_path` of a dashboard that exists on the *target* server, not the one you're on now.

## Roadmap

- iOS testing and badge.
- Color-picker swatches in the editor (currently hex string input).
- Optional inline (non-floating) layout.
- Position presets (top-left, bottom-right, etc.) without raw CSS lengths.
- HACS default repository submission.

## Contributing

PRs welcome. Please open an issue first for anything non-trivial.

## License

[MIT](LICENSE) © Jeff Sturch
