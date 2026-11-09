---
name: g-navigation
description: "How a g app is navigated: the left rail as the one place-to-place surface (on a phone, its pinned places as the dock, and Go, the palette of every place), what sits at its top, one level of nesting as open disclosure groups, how the rail collapses, peeks and pins, in-page modes, and what the top bar and page head may say. Use when adding a page, a group, a tab, a mode or a top bar to Command, Studio or any app on the g-ui-preact kit."
---

# g-navigation

The kit pieces are `.nav-list`, `.nav-item`, `.nav-group` (NavGroup), `.g-rail-toggle` (rail.js), the dock and Go
(`wireDock` in rail.js, `.g-dock`, `dialog.g-palette`) and `.topbar-slim` in `packages/g-ui-preact`. These rules decide which one a new place gets. Gabriel's ruling (3 Nov):
"just a nested sidebar makes the most sense", with what he uses most nearest to hand.

The rules keep their numbers, since code and docs cite them (R7, R10); R11 and R12 are
newer and sit beside the rules they belong with.

**R1. One navigation surface.** The left rail is the only place-to-place navigation. No tab
strips in the top bar, no tile pages, no second navigation in the content. A separate URL
with its own data is a rail entry. The dock is not a second surface: it is the rail's
pinned items (`data-pin="1"` to `"4"` on a `.nav-item`, at most four) drawn at the foot of
a phone, plus Go, the palette of every place in the rail (Recent, then All places, the
whole tree with its groups open; typing filters). Pin what the person reaches for most,
from the real pages, and never add a place to the dock that the rail lacks. An app never
draws its own bottom bar or tab bar.

**R1a. The dock (under 721px).** 56px plus the safe area, up to four pins and Go, each
slot at least 44px, the current one lit with a filled pill. The aside stays in the DOM,
hidden, and the menu button goes. Each slot reopens the last page under it, and switching
slots replaces the history entry (an edge-swipe back never jumps between slots) with the
shell's `selection` haptic. The dock steps aside while a field has focus. Go opens a sheet
above the dock, the list over the field, never focusing the field on a touch. From 721px
there is no dock and Go is Cmd+K or Ctrl+K, the same palette as a centred dialog. An app
inside another (Studio inside Command) swaps the dock for its own: its first slot is the
host's G mark, back to the host's last place, and the host's dock and top bar hide, so a
phone shows one bar at the top and one dock at the foot.

**R2. A view** is a place you would go on purpose and bookmark, with its own objects or job.
If two candidates show the same objects, they are one view.

**R3. Nesting, one level, as open groups.** Related views (2 to 7 of them, each still a view)
sit in a group. The group's parent is a disclosure row (`NavGroup`, `.nav-group-toggle`)
with the group's icon, name and a caret: it opens and closes its children in place and is
never a page. Groups are open by default; one closed by hand is remembered per viewer.
Every child carries its own icon from the kit's set (Phosphor), never a repeat of a sibling's.
**No hubs:** a page of tiles, one per child, is a second navigation and is not built. A hub
that existed redirects (301) to Home when it was an overview, or to its first child.

**R12. The top of the rail** holds what the person reaches for most, with no heading over it:
in Command, Home (the full dash, at `/`), Chat, Upload, then the Life and System groups.
Other headed sections follow. Moving an entry to the top never drops it from the apps'
manifest or changes where the apps show it.

**R4. In-page mode** (a segmented control in the page head, `?view=`) only for the same
objects seen from another angle. If switching loses your selection, it is a child view.

**R5. Detail routes** (one note, one ticket) are not in the rail; they light the view they
belong to.

**R6. Rail headings group by intent**, not by repo: 3 to 6 groups of 2 to 8 entries.

**R7. Top bar.** Studio's workspace bar carries the state and verbs of the object (draft
state, undo, publish). Command keeps a slim bar (`.topbar-slim`, `--h-5`, 48px with its
rule) that shows where you are and nothing else: the page title, and a breadcrumb when
the page is nested (`.topbar-crumbs`: Group, caret, Page; a group with no page of its own
is named, not linked). A view's controls (modes, filters, its primary action) stay in its
page head (R9), not in the bar. On a phone with a dock the bar has no menu button (Go is
the way to every place) and clears the status bar (`env(safe-area-inset-top)`); a phone
shell without pins keeps the menu button.

**R11. Never say it twice.** An in-page heading never repeats the top bar's title, and a
description line that only restates what the page is goes too ("System across the top,
Life below: the two hubs at a glance" under a bar that says Home). The page head keeps
what the bar does not say: a count, a badge, the view's controls. A page whose head would
then be empty has none, and its content starts the page.

**R8. The rail collapses, peeks and pins** (`rail.js`, the same in every app, standalone or
embedded). From 721px it rests collapsed to an icon rail. A 150ms rest of the pointer, or
keyboard focus inside it, opens it as an overlay above the content, so nothing reflows; it
closes 300ms after the pointer leaves, when focus leaves, or on Escape. The button beside
the G pins it open ("Keep open", the content then makes room) and, pinned, collapses it
("Collapse"), the Notion and Supabase convention. Pinned is remembered per viewer in
localStorage, every access guarded. Opening only reveals: icons stay where they are and
labels fade in, on the kit's `--spring-smooth` (g-motion). Touch and phones have no hover:
under 721px the rail becomes the dock (R1a), or, with no pins, the menu button opens the
sheet with the whole tree. Two apps on one page (Studio inside Command) show both rails,
each with its own key; hovering one never opens the other, and opening one's sheet never
opens the other's.

**R9. The page head** (title, one line, modes, page actions) is the same component in the
same place on every view, less whatever R11 takes out.

**R10. One product.** Command and Studio wear the same rail, brand row (`Brand`, the
wordmark at 16px), rail behaviour and pin button, top bar height, gutters (`--gutter`),
type and cursor (`cursor.js`, the coworking red by default). A difference between them is
fixed in the kit, never in one app.
