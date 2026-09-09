/* g-pane behaviour: the title toggles its body, the splitter resizes its
   target. Both report through events so a consumer can persist layout.

   Pane: click or Enter on .g-pane-title flips aria-expanded and the body's
   hidden attribute, then dispatches bubbling "g-pane:toggle" with
   {pane, expanded}. The body is aria-controls' target or the next sibling.

   Splitter: pointer drag on .g-splitter resizes data-target (a selector,
   default the previous sibling; data-side="after" picks the next one),
   clamped to data-min and data-max (px), along data-axis (col, the
   default, or row). The size is written inline and reported as
   "g-splitter:resize" with {target, size}. */
(() => {
  const g = (window.g = window.g || {});

  function bodyOf(title) {
    const id = title.getAttribute("aria-controls");
    return (id && document.getElementById(id)) || title.nextElementSibling;
  }

  function initPane(pane) {
    const title = pane.querySelector(":scope > .g-pane-title");
    if (!title) return;
    const body = bodyOf(title);
    if (!title.hasAttribute("aria-expanded")) title.setAttribute("aria-expanded", body?.hidden ? "false" : "true");
    if (body) body.hidden = title.getAttribute("aria-expanded") !== "true";
    title.addEventListener("click", () => {
      const expanded = title.getAttribute("aria-expanded") !== "true";
      title.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (body) body.hidden = !expanded;
      pane.dispatchEvent(new CustomEvent("g-pane:toggle", { bubbles: true, detail: { pane, expanded } }));
    });
  }

  function initSplitter(el) {
    const axis = el.getAttribute("data-axis") === "row" ? "row" : "col";
    const target = () => {
      const sel = el.getAttribute("data-target");
      if (sel) return document.querySelector(sel);
      return el.getAttribute("data-side") === "after" ? el.nextElementSibling : el.previousElementSibling;
    };
    el.addEventListener("pointerdown", (e) => {
      const t = target();
      if (!t || e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.setAttribute("data-active", "");
      const after = el.getAttribute("data-side") === "after";
      const min = +el.getAttribute("data-min") || 0;
      const max = +el.getAttribute("data-max") || Infinity;
      const start = axis === "col" ? t.getBoundingClientRect().width : t.getBoundingClientRect().height;
      const origin = axis === "col" ? e.clientX : e.clientY;
      const prop = axis === "col" ? "width" : "height";
      let size = start;
      const move = (ev) => {
        const d = (axis === "col" ? ev.clientX : ev.clientY) - origin;
        size = Math.round(Math.min(max, Math.max(min, after ? start - d : start + d)));
        t.style[prop] = size + "px";
        t.style.flexBasis = size + "px";
      };
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        el.removeAttribute("data-active");
        el.dispatchEvent(new CustomEvent("g-splitter:resize", { bubbles: true, detail: { target: t, size } }));
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });
  }

  g.use((root) => {
    root.querySelectorAll(".g-pane").forEach((pane) => {
      if (pane.hasAttribute("data-pane-init")) return;
      pane.setAttribute("data-pane-init", "");
      initPane(pane);
    });
    root.querySelectorAll(".g-splitter").forEach((el) => {
      if (el.hasAttribute("data-splitter-init")) return;
      el.setAttribute("data-splitter-init", "");
      initSplitter(el);
    });
  });
})();
