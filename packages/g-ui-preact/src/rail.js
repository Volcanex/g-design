// The rail (kit.css .g-shell[data-rail], .g-rail-toggle, .nav-group), plain DOM with no imports,
// so a server-rendered page loads it as a module and the Preact shell uses it too.
//
// From 721px up the rail is collapsed to icons by default; a toggle with data-rail-default="open"
// (Brand's railOpen) starts it pinned open instead. Resting the pointer on it for a
// moment, or moving keyboard focus into it, opens it as an overlay above the content
// (data-rail-peek) and the content moves over to make room, so nothing is hidden under it; it closes a moment after the pointer leaves,
// when focus leaves, or on Escape. The toggle beside the brand pins it open (the content then
// makes room) and, pinned, collapses it again: "Keep open" and "Collapse". Pinned is remembered
// per viewer under the toggle's key in localStorage, which can be missing or throw (private
// windows, blocked storage), so every access is guarded and the rail simply stays collapsed.
// Under 721px the rail is the phone sheet and none of this applies.
//
// Under 721px a shell whose rail has pinned links (data-pin) draws them as a bottom dock, with Go
// opening the places palette; from 721px Go is Cmd+K. The dock is wired with the toggle (wireDock,
// at the end of this file).
//
// Each shell wires its own rail, and every selector here keeps to its own aside, so two shells
// on one page (Studio inside Command) open, close and pin on their own.

export const RAIL_KEY = "g-rail";
const PINNED = "pinned";
const COLLAPSED = "collapsed";
const OPEN_DELAY = 150;   // intent: a pointer passing over the rail on its way elsewhere does nothing
const CLOSE_DELAY = 300;  // a pointer that slips off the edge for a moment keeps it open
const SETTLE = 500;       // the close transition (kit.css, --spring-smooth-dur, perceived 300ms)
const WIDE = "(min-width: 721px)";

/* open: the rail's state before the viewer has chosen one. */
export function railPinned(key = RAIL_KEY, open = false) {
  try {
    const v = localStorage.getItem(key);
    return v === PINNED || (v !== COLLAPSED && open);
  } catch (e) { return open; }
}
/* Kept for callers of the open-by-default rail: collapsed now means "not pinned". */
export function railCollapsed(key = RAIL_KEY) { return !railPinned(key); }

function remember(key, pinned) {
  try {
    localStorage.setItem(key, pinned ? PINNED : COLLAPSED);
  } catch (e) { /* not remembered; the rail still works for this page */ }
}

const TOGGLE_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">'
  + '<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2"/><path d="M6 3v10"/><path d="M10.5 6.5 9 8l1.5 1.5"/></svg>';

const asideOf = (shell) => shell && shell.querySelector(":scope > aside");
const togglesOf = (shell) => shell.querySelectorAll(":scope > aside .g-rail-toggle");

/* Set one shell's rail: pinned open, or collapsed to icons. */
export function applyRail(shell, collapsed) {
  if (!shell) return;
  if (collapsed) shell.setAttribute("data-rail", "collapsed");
  else shell.setAttribute("data-rail", PINNED);
  togglesOf(shell).forEach((b) => {
    const label = collapsed ? "Keep open" : "Collapse";
    b.setAttribute("aria-label", label);
    b.setAttribute("data-tip", label);
    b.setAttribute("aria-pressed", collapsed ? "false" : "true");
  });
}

/* Hover and focus open a collapsed rail over the content. One controller per shell. */
function wirePeek(shell) {
  const aside = asideOf(shell);
  if (!aside || aside.dataset.railPeek !== undefined) return;
  aside.dataset.railPeek = "";
  const wide = matchMedia(WIDE);
  let openTimer = 0, closeTimer = 0, settleTimer = 0;
  let pointerIn = false;
  let held = false;  // closed by hand (Escape, unpin): no reopening until the pointer or focus leaves

  const collapsed = () => shell.getAttribute("data-rail") === "collapsed";
  const peeking = () => shell.hasAttribute("data-rail-peek");
  const busy = () => !!aside.querySelector(":popover-open, [aria-haspopup][aria-expanded='true']");
  const clear = () => { clearTimeout(openTimer); clearTimeout(closeTimer); };

  function open() {
    clear();
    if (!collapsed() || !wide.matches || peeking()) return;
    clearTimeout(settleTimer);
    shell.removeAttribute("data-rail-settling");
    shell.setAttribute("data-rail-peek", "");
    aside.setAttribute("aria-expanded", "true");
  }
  function close() {
    clear();
    if (!peeking()) return;
    shell.removeAttribute("data-rail-peek");
    aside.removeAttribute("aria-expanded");
    // Items keep their open width while the rail narrows, so labels fade rather than squeeze.
    shell.setAttribute("data-rail-settling", "");
    settleTimer = setTimeout(() => shell.removeAttribute("data-rail-settling"), SETTLE);
  }
  shell.railClose = (hold = false) => { if (hold) held = true; close(); };

  aside.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "touch") return;
    pointerIn = true;
    clearTimeout(closeTimer);
    if (!held && collapsed() && !peeking()) openTimer = setTimeout(open, OPEN_DELAY);
  });
  aside.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "touch") return;
    pointerIn = false;
    held = false;
    clearTimeout(openTimer);
    // Keyboard focus in the rail keeps it open; a click's focus does not outlast the pointer.
    if (peeking() && !aside.querySelector(":focus-visible")) {
      closeTimer = setTimeout(() => { if (!busy()) close(); }, CLOSE_DELAY);
    }
  });
  aside.addEventListener("focusin", (e) => { if (!held && collapsed() && e.target.matches(":focus-visible")) open(); });
  aside.addEventListener("focusout", (e) => {
    if (aside.contains(e.relatedTarget)) return;
    held = false;
    // a menu opened from the rail takes focus into its popover, which is still inside the aside
    setTimeout(() => { if (!pointerIn && !aside.contains(document.activeElement) && !busy()) close(); }, 0);
  });
  aside.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !peeking() || busy()) return;
    held = true;
    close();
  });
  wide.addEventListener("change", () => { if (!wide.matches) close(); });
}

/* Disclosure groups (kit.css .nav-group): a parent row that opens and closes its children in
   place. Open by default; a group closed by hand is remembered per viewer under the rail's key. */
const groupKey = (key) => `${key}:closed`;
function closedGroups(key) {
  try { return JSON.parse(localStorage.getItem(groupKey(key)) || "[]"); } catch (e) { return []; }
}
export function setGroupOpen(group, open, key) {
  group.toggleAttribute("data-open", open);
  group.querySelectorAll(":scope > .nav-group-row [aria-expanded], :scope > .nav-group-toggle").forEach((b) => b.setAttribute("aria-expanded", open ? "true" : "false"));
  if (!key || !group.dataset.group) return;
  try {
    const shut = new Set(closedGroups(key));
    if (open) shut.delete(group.dataset.group); else shut.add(group.dataset.group);
    if (shut.size) localStorage.setItem(groupKey(key), JSON.stringify([...shut]));
    else localStorage.removeItem(groupKey(key));
  } catch (e) { /* not remembered */ }
}
export function groupOpen(name, key = RAIL_KEY) { return !closedGroups(key).includes(name); }

/* A server-rendered rail's groups: each opens from its remembered state, and its toggle flips it.
   A group holding the current page always opens. */
export function wireGroups(aside, key = RAIL_KEY) {
  if (!aside || aside.dataset.railGroups !== undefined) return;
  aside.dataset.railGroups = "";
  const shut = closedGroups(key);
  aside.querySelectorAll(".nav-group").forEach((group) => {
    const here = group.querySelector('[aria-current="page"]');
    setGroupOpen(group, here || !shut.includes(group.dataset.group));
    const button = group.querySelector(":scope > .nav-group-toggle, :scope > .nav-group-row > .nav-twist");
    button && button.addEventListener("click", () => setGroupOpen(group, !group.hasAttribute("data-open"), key));
  });
}

/* Wire one toggle button: its shell takes the remembered state, hover and focus peek, and a
   click pins or unpins. */
export function wireRailToggle(button, key = button.dataset.railKey || RAIL_KEY, open = button.dataset.railDefault === "open") {
  const shell = button.closest(".g-shell");
  if (!shell || button.dataset.railWired !== undefined) return;
  button.dataset.railWired = "";
  if (!button.innerHTML.trim()) button.innerHTML = TOGGLE_ICON;
  applyRail(shell, !railPinned(key, open));
  wirePeek(shell);
  wireDock(shell, key);
  button.addEventListener("click", () => {
    const pin = shell.getAttribute("data-rail") === "collapsed";
    remember(key, pin);
    if (pin) {
      // The peek is already the open rail: it stops floating and the content makes room.
      shell.removeAttribute("data-rail-peek");
      asideOf(shell).removeAttribute("aria-expanded");
      applyRail(shell, false);
    } else {
      applyRail(shell, true);
      // The pointer is still on the rail: hold it closed until it leaves.
      shell.railClose && shell.railClose(true);
    }
  });
  // Transitions start after the first frame, so a remembered state never animates in on load.
  requestAnimationFrame(() => requestAnimationFrame(() => shell.setAttribute("data-rail-ready", "")));
}

/* A server-rendered page: wire every toggle in it, and its groups. */
export function wireRails(root = document) {
  root.querySelectorAll(".g-rail-toggle").forEach((b) => {
    wireRailToggle(b);
    const shell = b.closest(".g-shell");
    wireGroups(asideOf(shell), b.dataset.railKey || RAIL_KEY);
  });
}

/* ------------------------------------------------------------------ the dock and Go */

/* Under 721px a shell whose rail carries pinned links draws a bottom dock (kit.css .g-dock):
   up to four slots, then Go. Apps only add attributes:
     a.nav-item[data-pin="1".."4"]   pinned, in that order; data-pin-label gives a shorter label.
                                     Icon, label and .badge are read from the link.
     [data-dock-action]              the page's primary action, inside the shell's content: it
                                     takes the slot after the pins when there is room (label from
                                     data-dock-label, aria-label or its text; its disabled state
                                     and .badge mirrored). Tapping the slot clicks it; on phones
                                     the element itself is hidden (data-dock-proxied) so it sits
                                     once. With no action marked, the slot is Search.
   Slots remember the last page under them (sessionStorage, under the rail key) and switch with
   history replace, so the edge-swipe back never jumps between tabs. A shell inside another
   docked shell (Studio inside Command) shows the only dock, its first slot the outer brand.
   Go opens the places palette (dialog.cmdk): a bottom sheet on phones, the centred palette
   with Cmd+K (Ctrl+K) from 721px. Slot navigation dispatches a cancelable g:dock-navigate
   ({ url, replace: true }) on the shell, so a client router can take it without a reload;
   unhandled, it is location.replace(url).
   The dock lives in <body>, outside any Preact tree, and is redrawn from the rail whenever the
   shell changes (a MutationObserver), so re-renders never remove or reorder it. */

const PHONE = "(max-width: 720px)";
const docked = new Map();  // shell -> { key, mo }
let dockEl = null, goEl = null, goScrim = null, bodyMo = null;
let state = { active: null, outer: null, slots: [], sig: "" };
let frame = 0, goAll = false;

const SVG = (d) => `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
// Phosphor Regular (MIT), as everywhere in the kit
const ICON_GO = SVG("M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM172.42,72.84l-64,32a8.05,8.05,0,0,0-3.58,3.58l-32,64A8,8,0,0,0,80,184a8.1,8.1,0,0,0,3.58-.84l64-32a8.05,8.05,0,0,0,3.58-3.58l32-64a8,8,0,0,0-10.74-10.74ZM138,138,97.89,158.11,118,118l40.15-20.07Z");
const ICON_SEARCH = SVG("M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z");

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const here = () => location.pathname + location.search + location.hash;
const pathOf = (url) => { try { return new URL(url, location.href).pathname; } catch (e) { return url; } };

function memory(key) {
  try { return JSON.parse(sessionStorage.getItem(`${key}:dock`) || "{}") || {}; } catch (e) { return {}; }
}
function saveMemory(key, m) {
  try { sessionStorage.setItem(`${key}:dock`, JSON.stringify(m)); } catch (e) { /* not remembered */ }
}

/* What a rail link or action element shows: its icon (cloned), label and badge. */
function iconOf(el) {
  const i = el && el.querySelector("svg, .ph, .gi");
  return i ? i.outerHTML : "";
}
function textOf(el) {
  const span = el.querySelector(".ellipsis, .label");
  if (span) return span.textContent.trim();
  const c = el.cloneNode(true);
  c.querySelectorAll(".badge, svg, .sr-only").forEach((x) => x.remove());
  return c.textContent.replace(/\s+/g, " ").trim();
}
function badgeOf(el) {
  const b = el.querySelector(".badge");
  return b ? b.textContent.replace(/\s+/g, " ").trim() : "";
}

const pinsOf = (shell) => {
  const aside = asideOf(shell);
  if (!aside) return [];
  return [...aside.querySelectorAll("a.nav-item[data-pin]")]
    .filter((a) => !a.closest(".side-foot"))
    .sort((a, b) => (+a.dataset.pin || 9) - (+b.dataset.pin || 9));
};
const brandOf = (shell) => {
  const a = asideOf(shell) && asideOf(shell).querySelector(".brand");
  return { href: a ? a.getAttribute("href") || "/" : "/", name: a ? (a.querySelector("b") || a).textContent.trim() : "" };
};
const ownShell = (el) => el.parentElement && el.parentElement.closest(".g-shell");
const actionOf = (shell) => [...shell.querySelectorAll(":scope > main [data-dock-action]")]
  .find((el) => el.closest(".g-shell") === shell) || null;

/* Record the current page under the current slot, and under the shell's own last places. */
function rememberPlace(shell) {
  const s = docked.get(shell);
  if (!s) return;
  const m = memory(s.key);
  m.slots = m.slots || {};
  const cur = pinsOf(shell).find((a) => a.getAttribute("aria-current") === "page");
  if (cur) m.slots[cur.getAttribute("href")] = here();
  // the outer app's places, newest first, for a nested shell's first slot
  m.last = [here(), ...(m.last || []).filter((u) => u !== here())].slice(0, 6);
  saveMemory(s.key, m);
}
function outerLast(shell) {
  const s = docked.get(shell);
  const cur = location.pathname;
  const hit = s && (memory(s.key).last || []).find((u) => {
    const p = pathOf(u);
    return p !== cur && !(p !== "/" && cur.startsWith(p + "/"));
  });
  return hit || brandOf(shell).href;
}

function haptic() {
  try {
    const p = window.gshell && window.gshell.haptic && window.gshell.haptic("selection");
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* no shell */ }
}

function navigate(url) {
  const shell = state.active;
  const ask = new CustomEvent("g:dock-navigate", { cancelable: true, bubbles: true, detail: { url, replace: true } });
  if (shell && !shell.dispatchEvent(ask)) return;
  location.replace(url);
}

/* ---------------------------------------------------------------- which shell, which slots */

function pickShells() {
  for (const [shell, s] of docked) if (!shell.isConnected) unwire(shell, s);
  const withPins = [...docked.keys()].filter((sh) => pinsOf(sh).length);
  const inner = withPins.filter((sh) => !withPins.some((o) => o !== sh && sh.contains(o)));
  const active = inner[inner.length - 1] || null;
  let outer = null;
  for (let p = active && ownShell(active); p; p = ownShell(p)) if (withPins.includes(p)) { outer = p; break; }
  return { active, outer };
}

function slotsFor(active, outer) {
  const slots = [];
  if (outer) {
    const b = brandOf(outer);
    slots.push({ kind: "outer", label: b.name, icon: '<span class="g-mark" aria-hidden="true"></span>', href: outerLast(outer) });
  }
  for (const a of pinsOf(active)) {
    if (slots.length >= 4) break;
    slots.push({ kind: "pin", el: a, href: a.getAttribute("href"), label: a.dataset.pinLabel || textOf(a),
      icon: iconOf(a), badge: badgeOf(a), current: a.getAttribute("aria-current") === "page" });
  }
  if (slots.length < 4) {
    const act = actionOf(active);
    if (act) slots.push({ kind: "action", el: act, label: act.dataset.dockLabel || act.getAttribute("aria-label") || textOf(act),
      icon: iconOf(act), badge: badgeOf(act), disabled: act.disabled || act.getAttribute("aria-disabled") === "true" });
    else slots.push({ kind: "search", label: "Search", icon: ICON_SEARCH });
  }
  slots.push({ kind: "go", label: "Go", icon: ICON_GO, current: !!(goEl && goEl.open) });
  if (goEl && goEl.open) slots.forEach((x) => { if (x.kind !== "go") x.current = false; });
  return slots;
}

/* ---------------------------------------------------------------- drawing */

function ensureDock() {
  if (dockEl) return;
  dockEl = document.createElement("nav");
  dockEl.className = "g-dock";
  dockEl.setAttribute("aria-label", "Dock");
  dockEl.innerHTML = '<div class="g-dock-row"></div>';
  dockEl.addEventListener("click", (e) => {
    const b = e.target.closest(".g-dock-slot");
    if (b) tap(+b.dataset.slot);
  });
  document.body.append(dockEl);
}

function render() {
  frame = 0;
  const { active, outer } = pickShells();
  const root = document.documentElement;
  docked.forEach((s, sh) => {
    sh.toggleAttribute("data-dock", sh === active);
    sh.toggleAttribute("data-dock-outer", sh === outer);
  });
  document.querySelectorAll("[data-dock-proxied]").forEach((el) => el.removeAttribute("data-dock-proxied"));
  if (!active) {
    root.removeAttribute("data-g-dock");
    if (dockEl) dockEl.hidden = true;
    state = { active: null, outer: null, slots: [], sig: "" };
    if (goEl && goEl.open) goEl.close();
    return;
  }
  if (active !== state.active) rememberPlace(active);
  const slots = slotsFor(active, outer);
  slots.forEach((x) => { if (x.kind === "action") x.el.setAttribute("data-dock-proxied", ""); });
  root.setAttribute("data-g-dock", "");
  ensureDock();
  dockEl.hidden = false;
  const sig = JSON.stringify(slots.map(({ el, ...x }) => x));
  const moved = state.active !== active;
  state = { active, outer, slots, sig: state.sig };
  if (sig === state.sig) return;
  state.sig = sig;
  const row = dockEl.firstElementChild;
  row.innerHTML = slots.map((x, i) => `<button class="g-dock-slot" type="button" data-slot="${i}" data-kind="${x.kind}"
      ${x.current ? 'aria-current="page"' : ""} ${x.disabled ? "disabled" : ""}
      ${x.kind === "go" ? `aria-haspopup="dialog" aria-expanded="${x.current ? "true" : "false"}"` : ""}>
    <span class="g-dock-ico">${x.icon}${x.badge ? `<span class="g-dock-count">${esc(x.badge)}</span>` : ""}</span>
    <span class="g-dock-label">${esc(x.label)}</span></button>`).join("");
  if (moved) {
    row.removeAttribute("data-in");
    void row.offsetWidth;
    row.setAttribute("data-in", "");
  }
}
const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };

function tap(i) {
  const x = state.slots[i], shell = state.active;
  if (!x || !shell) return;
  if (x.kind === "go") return goEl && goEl.open ? goEl.close() : openGo(false);
  if (x.kind === "search") return openGo(true);
  if (x.kind === "action") { if (!x.el.disabled) x.el.click(); return; }
  if (goEl && goEl.open) goEl.close();
  if (x.kind === "outer") { rememberPlace(shell); haptic(); return navigate(x.href); }
  if (x.current) {
    if (pathOf(x.href) === location.pathname) {
      const c = shell.querySelector(":scope > main .content") || shell.querySelector(":scope > main");
      c && c.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } else navigate(x.href);
    return;
  }
  rememberPlace(shell);
  haptic();
  const m = memory(docked.get(shell).key);
  navigate((m.slots && m.slots[x.href]) || x.href);
}

/* ---------------------------------------------------------------- Go: the places palette */

/* Every place in one shell's rail, in rail order: headings, groups and their children. */
function placesOf(shell) {
  const aside = asideOf(shell), out = [];
  if (!aside) return out;
  let group = "", head = "";
  aside.querySelectorAll(".nav-head, .nav-group-toggle, .nav-group-row > a.nav-item, a.nav-item").forEach((el) => {
    if (el.closest(".side-foot") || el.closest(".brand-row")) return;
    if (el.classList.contains("nav-head")) { head = el.textContent.trim(); group = ""; out.push({ kind: "head", label: head }); return; }
    if (el.classList.contains("nav-group-toggle")) { group = textOf(el); out.push({ kind: "group", label: group, icon: iconOf(el) }); return; }
    if (out.some((p) => p.el === el)) return;
    const child = el.classList.contains("nav-child");
    if (!child) group = "";
    out.push({ kind: "place", el, label: textOf(el), icon: iconOf(el), badge: badgeOf(el), child, where: child ? group : head,
      current: el.getAttribute("aria-current") === "page" });
  });
  return out;
}
/* The rail foot's controls (theme, density, sign out, account menu items), so nothing on the
   rail is a dead end on a phone. A menu's trigger is left out; its items are listed. */
function controlsOf(shell) {
  const aside = asideOf(shell);
  if (!aside) return [];
  return [...aside.querySelectorAll(".side-foot a[href], .side-foot button, .side-foot .menu-item")]
    .filter((el) => !el.matches("[popovertarget], .g-rail-toggle") && !(el.matches("button") && el.closest(".menu") && !el.matches(".menu-item")))
    .filter((el, i, all) => all.indexOf(el) === i)
    .map((el) => ({ kind: "control", el, label: el.getAttribute("aria-label") || textOf(el), icon: iconOf(el) }))
    .filter((c) => c.label);
}

function fuzzy(q, s) {
  q = q.toLowerCase(); s = s.toLowerCase();
  let i = 0;
  for (const c of s) if (c === q[i]) i++;
  return i === q.length;
}

let goItems = [];
function item(x, where) {
  goItems.push(x);
  const n = goItems.length - 1;
  return `<button class="menu-item g-go-item${x.child ? " g-go-child" : ""}" type="button" data-go-item="${n}" tabindex="-1"
      ${x.current ? 'aria-current="page"' : ""}>${x.icon || ""}<span class="g-go-label">${esc(x.label)}</span>
    ${where ? `<span class="g-go-where">${esc(where)}</span>` : ""}${x.badge ? `<span class="badge">${esc(x.badge)}</span>` : ""}</button>`;
}
function tree(name, places, controls) {
  let h = `<div class="cmdk-group g-go-brand">${esc(name)}</div>`;
  for (const p of places) {
    if (p.kind === "head") h += `<div class="cmdk-group">${esc(p.label)}</div>`;
    else if (p.kind === "group") h += `<div class="g-go-group">${p.icon}<span>${esc(p.label)}</span></div>`;
    else h += item(p);
  }
  if (controls.length) {
    h += `<div class="cmdk-group">Account and settings</div>`;
    controls.forEach((c) => { h += item(c); });
  }
  return h;
}

function fillGo() {
  const { active, outer } = state;
  if (!goEl || !active) return;
  const list = goEl.querySelector(".cmdk-list");
  const q = goEl.querySelector(".cmdk-input").value.trim();
  const mine = placesOf(active), theirs = outer ? placesOf(outer) : [];
  const myName = brandOf(active).name, outerName = outer ? brandOf(outer).name : "";
  goItems = [];
  let h = "";
  if (q) {
    const all = [
      ...mine.filter((p) => p.kind === "place").map((p) => [p, p.where || myName]),
      ...theirs.filter((p) => p.kind === "place").map((p) => [p, outerName]),
      ...controlsOf(active).map((c) => [c, "Settings"]),
      ...(outer ? controlsOf(outer).map((c) => [c, outerName]) : []),
    ].filter(([p]) => fuzzy(q, p.label));
    h = all.length ? all.map(([p, w]) => item(p, w)).join("")
      : `<p class="cmdk-empty">No place is called that.</p>`;
  } else if (goAll) {
    h = tree(myName, mine, controlsOf(active));
    if (outer) h += tree(outerName, theirs, controlsOf(outer));
  } else {
    h = `<div class="cmdk-group">${esc(myName)}</div>` + mine.filter((p) => p.kind === "place").map((p) => item(p, p.child ? p.where : "")).join("");
  }
  h += `<button class="menu-item g-go-all" type="button" tabindex="-1" aria-expanded="${goAll && !q ? "true" : "false"}">
    <span class="g-go-label">All places</span><span class="nav-caret" aria-hidden="true"></span></button>`;
  list.innerHTML = h;
  const first = list.querySelector('.g-go-item[aria-current="page"]') || list.querySelector(".menu-item");
  mark(q ? list.querySelector(".menu-item") : first, false);
}

function mark(el, focus) {
  goEl.querySelectorAll("[data-highlighted]").forEach((i) => i.removeAttribute("data-highlighted"));
  if (!el) return;
  el.setAttribute("data-highlighted", "");
  if (focus) el.scrollIntoView({ block: "nearest" });
}

function pick(btn) {
  if (btn.classList.contains("g-go-all")) {
    const input = goEl.querySelector(".cmdk-input");
    goAll = input.value.trim() ? true : !goAll;
    input.value = "";
    fillGo();
    return;
  }
  const x = goItems[+btn.dataset.goItem];
  if (!x) return;
  const shell = state.active;
  goEl.close();
  if (x.kind === "place" && shell) rememberPlace(shell);
  // the real rail element does the work, so a client router or a menu's handler runs as usual
  x.el.click();
}

function ensureGo() {
  if (goEl) return;
  goEl = document.createElement("dialog");
  goEl.className = "dlg cmdk g-go";
  goEl.setAttribute("data-go", "");
  goEl.setAttribute("aria-label", "Go to a place");
  goEl.innerHTML = `<input class="cmdk-input" type="search" placeholder="Go to a place" aria-label="Go to a place"
      enterkeyhint="go" autocomplete="off" spellcheck="false"><div class="cmdk-list" role="listbox"></div>`;
  goScrim = document.createElement("div");
  goScrim.className = "g-go-scrim";
  goScrim.addEventListener("click", () => goEl.close());
  document.body.append(goScrim, goEl);
  const input = goEl.querySelector(".cmdk-input");
  input.addEventListener("input", fillGo);
  goEl.addEventListener("click", (e) => { const b = e.target.closest(".menu-item"); if (b) pick(b); });
  goEl.addEventListener("keydown", (e) => {
    const it = [...goEl.querySelectorAll(".cmdk-list .menu-item")];
    const cur = it.findIndex((i) => i.hasAttribute("data-highlighted"));
    if (e.key === "ArrowDown") { e.preventDefault(); mark(it[(cur + 1) % it.length], true); }
    if (e.key === "ArrowUp") { e.preventDefault(); mark(it[(cur - 1 + it.length) % it.length], true); }
    if (e.key === "Enter" && cur >= 0) { e.preventDefault(); pick(it[cur]); }
    if (e.key === "Escape" && !goEl.matches(":modal")) { e.preventDefault(); goEl.close(); }
  });
  goEl.addEventListener("close", () => {
    document.documentElement.removeAttribute("data-g-go");
    state.sig = "";
    schedule();
  });
}

/* Open Go for the innermost docked shell. On a phone it is a sheet above the dock (non-modal,
   so the dock stays in reach, with its own scrim); from 721px the centred modal palette. */
export function openGo(focus = true) {
  const { active } = pickShells();
  if (!active) return false;
  if (!state.active) render();
  ensureGo();
  if (goEl.open) return true;
  goAll = false;
  goEl.querySelector(".cmdk-input").value = "";
  fillGo();
  const phone = matchMedia(PHONE).matches;
  if (phone) { goEl.show(); document.documentElement.setAttribute("data-g-go", ""); }
  else goEl.showModal();
  if (focus || !phone) goEl.querySelector(".cmdk-input").focus();
  else goEl.querySelector(".cmdk-list").focus({ preventScroll: true });
  state.sig = "";
  render();
  return true;
}
export function closeGo() { if (goEl && goEl.open) goEl.close(); }

/* ---------------------------------------------------------------- wiring */

const TEXT = 'input:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="button"], [type="submit"], [type="reset"], [type="image"]), textarea, select';
const typing = (el) => !!el && el.nodeType === 1 && (el.matches(TEXT) || el.isContentEditable);

let globalWired = false;
function wireGlobal() {
  if (globalWired) return;
  globalWired = true;
  const root = document.documentElement;
  // The dock steps aside while the keyboard is up, and gives its space back.
  document.addEventListener("focusin", (e) => root.toggleAttribute("data-g-dock-hidden", typing(e.target)));
  document.addEventListener("focusout", () => setTimeout(() => root.toggleAttribute("data-g-dock-hidden", typing(document.activeElement)), 0));
  // Cmd+K: g-ui.js holds the page's one listener and asks first (g:cmdk); without it, this does.
  const key = (e) => {
    if (!pickShells().active) return;
    e.preventDefault();
    if (goEl && goEl.open) goEl.close(); else openGo(true);
  };
  document.addEventListener("g:cmdk", key);
  document.addEventListener("keydown", (e) => {
    if (window.g && window.g.cmdkKey) return;
    if ((e.metaKey || e.ctrlKey) && e.key === "k") key(e);
  });
  addEventListener("pagehide", () => { if (state.active) rememberPlace(state.active); });
  addEventListener("popstate", schedule);
  // A shell taken out of the page (a new one mounted in its place) lets go of its dock.
  bodyMo = new MutationObserver(() => { for (const sh of docked.keys()) if (!sh.isConnected) { schedule(); break; } });
  bodyMo.observe(document.body, { childList: true, subtree: true });
}

const WATCH = ["aria-current", "data-pin", "data-pin-label", "href", "disabled", "aria-disabled", "data-dock-action", "data-dock-label", "aria-label"];

/* Wire one shell's dock. wireRailToggle calls it, so a shell with a rail toggle needs nothing
   more; key is its rail key (recorded as data-rail-key), under which the dock's memory lives. */
export function wireDock(shell, key = RAIL_KEY) {
  if (!shell || !document.body) return;
  shell.setAttribute("data-rail-key", key);
  wireGlobal();
  let s = docked.get(shell);
  if (!s) {
    const mo = new MutationObserver((recs) => {
      // our own marks on the shell are not changes to the rail
      if (recs.every((r) => r.type === "attributes" && r.target === shell)) return;
      const cur = pinsOf(shell).find((a) => a.getAttribute("aria-current") === "page");
      if (cur && shell === state.active) rememberPlace(shell);
      schedule();
    });
    mo.observe(shell, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: WATCH });
    s = { key, mo };
    docked.set(shell, s);
  }
  s.key = key;
  schedule();
}

function unwire(shell, s) {
  s.mo.disconnect();
  docked.delete(shell);
  shell.removeAttribute("data-dock");
  shell.removeAttribute("data-dock-outer");
}

/* The dock's current state, for tests and apps: the slots as drawn. */
export function dockSlots() {
  render();
  return state.slots.map(({ el, ...x }) => x);
}
