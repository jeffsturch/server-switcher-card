# Server Switcher Card

A floating avatar that opens a menu of your other Home Assistant servers and switches the Companion app to one of them via deep link.

## What it solves

The Home Assistant Companion app supports multiple servers, but the only built-in way to switch between them is a three-finger swipe gesture. This card surfaces the switch as a tappable avatar in the corner of any dashboard.

## Usage

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
    server: Cottage
    path: dashboard-mobile
```

A visual editor is included — add the card via the dashboard editor to get a form with sections for the current location, the list of locations to switch to (with add/remove buttons), and an optional layout group.

See the README for the full configuration reference.

## Requirements

- Home Assistant Companion app with two or more servers configured.
- The card only switches servers when opened *inside* the Companion app — the `homeassistant://` URL scheme isn't handled in regular browsers or PWAs.
