/* g-admin activation stub: the only part of the admin overlay that ships in
   the public bundle, and the only one a visitor ever downloads.

   It does nothing until somebody arms it: ?gadmin=1 writes
   localStorage["g-admin"], cmd+shift+K (ctrl+shift+K off a Mac) toggles it,
   the bar's "off" clears it. Public visitors generate no probe traffic, and
   an armed browser still gets nothing unless the server says this session is
   an admin. Only the script is injected: g-admin.js links its own stylesheet
   inside its shadow root, where one in document head would not reach it. */
(() => {
  const KEY = "g-admin";
  const self = document.currentScript;

  function inject() {
    const base = (document.querySelector('meta[name="g-admin-base"]')?.content || "/api/gadmin").replace(/\/+$/, "");
    fetch(base + "/verify", { credentials: "same-origin" }).then((r) => {
      if (!r.ok) return;
      const s = document.createElement("script");
      s.src = new URL("g-admin.js", self?.src || location.href).href;
      s.defer = true;
      document.head.append(s);
    }).catch(() => { /* no admin api on this project: stay invisible */ });
  }

  /* Arm, probe and inject in one gesture, or tear down if it is already up.
     Down goes through the overlay's own way out, never by dropping its
     element: pending edits live in inline styles and in a stylesheet in the
     head, and both would be left applied. Focus is read through one shadow
     root, because a document whose overlay has focus reports only the host. */
  addEventListener("keydown", (e) => {
    if (!(e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K"))) return;
    const on = document.activeElement, focused = on?.shadowRoot?.activeElement || on;
    if (focused?.matches?.("input,textarea,select,[contenteditable]")) return;
    e.preventDefault();
    if (window.__gAdmin) return window.__gAdminOff?.();
    try { localStorage.setItem(KEY, "1"); } catch { /* storage refused */ }
    inject();
  });

  let armed = false;
  try {
    if (new URLSearchParams(location.search).get("gadmin") === "1") localStorage.setItem(KEY, "1");
    armed = localStorage.getItem(KEY) === "1";
  } catch { /* storage refused: never armed, which is the safe direction */ }
  if (armed) inject();
})();
