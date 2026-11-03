---
name: g-navigation
description: "How a g app is navigated: the left rail as the one place-to-place surface, one level of nesting, hubs, in-page modes and when a top bar exists. Use when adding a page, a tab, a mode or a top bar to Command, Studio or any app on the g-ui-preact kit."
---

# g-navigation

The kit pieces are `.nav-list`, `.nav-item`, `.nav-group` (NavGroup), `.g-rail-toggle` (rail.js) and `.topbar-slim` in
`packages/g-ui-preact`. These rules decide which one a new place gets.

1. **One navigation surface.** The left rail is the only place-to-place navigation. No tab
   strips in the top bar. A separate URL with its own data is a rail entry.
2. **A view** is a place you would go on purpose and bookmark, with its own objects or job.
   If two candidates show the same objects, they are one view.
3. **Nesting, one level.** A view gets children when it has 2 to 7 sub-places in its domain
   that are each still views. The parent is itself a page, a hub: it shows a tile per child
   with a live line, generated from the same tree as the rail so the two cannot drift.
   Children show while the parent or a child is current; the current child is highlighted.
4. **In-page mode** (a segmented control in the page head, `?view=`) only for the same
   objects seen from another angle. If switching loses your selection, it is a child view.
5. **Detail routes** (one note, one ticket) are not in the rail; they light the view they
   belong to.
6. **Rail headings group by intent**, not by repo: 3 to 6 groups of 2 to 8 entries.
7. **Top bar.** Studio's workspace bar carries the state and verbs of the object (draft
   state, undo, publish). Command keeps a slim bar (`.topbar-slim`, `--h-5`, 48px with its
   rule) with the page title, a breadcrumb when the page is nested (`.topbar-crumbs`:
   Parent, caret, Page) and page-level actions. What else belongs in it is still open.
   On a phone the bar also carries the menu button.
8. **Collapsible rail.** A toggle beside the brand (`Brand`, or `.g-rail-toggle` with
   `rail.js`). Open by default; collapsed is icon-only with tooltips, remembered per viewer.
9. **The page head** (title, one line, modes, page actions) is the same component in the
   same place on every view.
