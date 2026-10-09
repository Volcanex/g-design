# g-admin contract (v1)

The shared contract between the g-admin client (vendored, framework-free)
and any project that hosts it. Briefs `g-admin-client.md` and
`g-admin-server.md` build against this; `gp-poker/agents/g-admin-poker.md`
and `g-command-web/agents/g-admin-tickets-panel.md` consume it. When the
component merges, this file graduates into the component's CLAUDE.md and
the brief set is pruned.

## What g-admin is

An admin-only overlay for any g project: an admin bar at the top, an
annotate mode (pin + pen + note on any element) and an edit mode (hover
outlines, click to select, devtools-like right sidebar that edits
spacing/alignment/typography live, snapped to the g spacing scale).
**Nothing writes to source.** Every saved annotation or edit becomes a
ticket; agents bake tickets into source after the fact, guided by the
verbal context on the ticket. Lineage: extraction of the two existing
systems (opentable's annotate.tsx/bar.tsx/admin.ts, baseline's
annotate.js/annotations.py). Baseline's stays untouched for now.

## Activation (client side)

- A ~1KB stub ships inside `g-ui.js`. It does nothing unless
  `localStorage["g-admin"]` is set; visiting any page with `?gadmin=1`
  sets it, and cmd+shift+K (ctrl+shift+K off-Mac) toggles it from the
  keyboard, arming, probing and injecting in one gesture, or tearing
  the overlay down if it is up. The bar's "off" control clears it too.
  Public visitors never generate probe traffic (the hotkey listener is
  inert until pressed and still ends at the verify gate).
- When armed, the stub fetches `{base}/verify`. On 200 it injects
  `g-admin.js` + `g-admin.css` (separate vendored files, never inside
  the public bundle) from the same static dir as `g-ui.js`.
- `{base}` defaults to `/api/gadmin`, overridable via
  `<meta name="g-admin-base" content="...">`.
- The bar links its ticket count and a "Command centre" link to the
  dashboard in `<meta name="g-command" content="https://...">`. Without
  that tag the count shows unlinked and the link is left out.
- The overlay must not depend on the host page using g.css: g-admin.css
  carries its own tokens scoped under its root element. Token snapping
  reads the host page's `:root` for `--sp-1..--sp-8`; if absent, falls
  back to the g scale (4/8/12/16/24/32/48/64).

## Endpoints (server side)

All under `{base}`, gated by the project's existing admin auth (cookie
session). Machine readers (g-command-web, baking agents) may instead send
`X-Gadmin-Token: $GADMIN_TOKEN` (env var, value in the instance passport).
The token grants GET and PATCH-status only, never create.

- `GET  {base}/verify`: 200 if admin, 401/403 otherwise
- `GET  {base}/tickets?status=open|baked|dismissed`: list, drawings omitted
- `POST {base}/tickets`: create (cookie auth only)
- `GET  {base}/tickets/{id}`: full ticket incl. drawing
- `PATCH {base}/tickets/{id}`: status change, reply append, note edit
- `GET  {base}/tickets/{id}/brief`: agent-ready markdown brief of the note,
  scope, page, elements with HTML snippets, edits table (with token
  names), replies. Modeled on baseline's `/brief` endpoint.
- `GET  {base}/overrides.css`: public, no auth. CSS generated from the
  `edits` of open tickets. Empty unless the project sets
  `GADMIN_REAPPLY=1` and links it after its own styles. This is the
  "unbaked edits survive reload" layer, explicitly ephemeral; baking
  removes the ticket's rules.

## Ticket schema

One type; annotation-only tickets have empty `edits`.

```json
{
  "id": 1,
  "created_at": "", "updated_at": "",
  "status": "open | baked | dismissed",
  "scope": "page | site",
  "kind": "edit | bug | visual | content | idea",
  "severity": "critical | major | minor | polish",
  "page": {"url": "", "path": "", "title": ""},
  "viewport": {"w": 0, "h": 0, "dpr": 1, "theme": "dark"},
  "elements": [{"selector": "", "dom_path": "", "html": "<=10k chars", "rect": {"x":0,"y":0,"w":0,"h":0}}],
  "edits": [{"selector": "", "prop": "", "from": "", "to": "", "token_from": null, "token_to": "--sp-7"}],
  "note": "verbal context from the owner, which becomes the body of the brief",
  "drawing": "PNG data URL or null, <=1.5MB",
  "replies": [{"at": "", "by": "human | agent", "text": ""}],
  "source": "human | agent",
  "baked_by": null
}
```

Selector generation: id short-circuit, else tag.class:nth-of-type chain,
depth <= 6, uniqueness verified with querySelectorAll (union of the two
existing implementations). `dom_path` is the full untruncated path:
selectors may be ugly; the baking agent resolves them against source
using `html` + `dom_path`, which is why they only need to be findable,
not pretty.

## Baking

After the fact, never live. The flow: open g-command-web's tickets panel (or
the project's own list), pull `{base}/tickets/{id}/brief`, hand it to an
agent session, agent applies the change to source (site-wide or
page-scoped per `scope` + note), PATCHes status to `baked` with a reply
describing the commit. A `g-bake` skill wrapping this is a follow-up,
not part of v1.
