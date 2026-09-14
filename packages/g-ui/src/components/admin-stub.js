/* g-admin activation stub: the only part of the admin overlay that ships in
   the public bundle, and the only one a visitor ever downloads.

   It does nothing until somebody arms it, which is a deliberate act: loading
   any page with ?gadmin=1 writes localStorage["g-admin"], and the bar's "off"
   control clears it again. Public visitors therefore generate no probe
   traffic at all, and an armed browser still gets nothing unless the server
   says this session is an admin.

   The rest of the overlay is g-admin.js and g-admin.css, built as separate
   dist files and vendored beside g-ui.js. Only the script is injected here:
   g-admin.js links its own stylesheet inside its shadow root, because a
   stylesheet in document head would not reach it. */
(() => {
  const KEY = "g-admin";
  const self = document.currentScript;
  let armed = false;
  try {
    if (new URLSearchParams(location.search).get("gadmin") === "1") localStorage.setItem(KEY, "1");
    armed = localStorage.getItem(KEY) === "1";
  } catch { /* storage refused: never armed, which is the safe direction */ }
  if (!armed) return;
  const meta = document.querySelector('meta[name="g-admin-base"]');
  const base = (meta?.content || "/api/gadmin").replace(/\/+$/, "");
  fetch(base + "/verify", { credentials: "same-origin" }).then((r) => {
    if (!r.ok) return;
    const s = document.createElement("script");
    s.src = new URL("g-admin.js", self?.src || location.href).href;
    s.defer = true;
    document.head.append(s);
  }).catch(() => { /* no admin api on this project: stay invisible */ });
})();
