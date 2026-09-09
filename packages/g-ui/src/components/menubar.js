/* g-menubar behaviour on top of the shipped .menu popovers. Items carry
   popovertarget; this fragment adds what a menubar needs and a lone menu
   does not: hovering a sibling item while a menu is open switches to it,
   ArrowLeft and ArrowRight walk the bar (from the bar or from inside an
   open menu), Escape closes and hands focus back to the item. */
(() => {
  const g = (window.g = window.g || {});

  function initMenubar(bar) {
    const items = [...bar.querySelectorAll(".g-menubar-item[popovertarget]")];
    const menuOf = (item) => document.getElementById(item.getAttribute("popovertarget"));
    const openItem = () => items.find((i) => i.getAttribute("aria-expanded") === "true");

    const open = (item) => {
      const menu = menuOf(item);
      if (!menu) return;
      const cur = openItem();
      if (cur && cur !== item) menuOf(cur)?.hidePopover();
      if (!menu.matches(":popover-open")) menu.showPopover();
    };
    const close = (item, refocus) => {
      menuOf(item)?.hidePopover();
      if (refocus) item.focus();
    };
    const step = (from, dir) => {
      const i = items.indexOf(from);
      const next = items[(i + dir + items.length) % items.length];
      const wasOpen = !!openItem();
      next.focus();
      if (wasOpen) open(next);
    };

    items.forEach((item) => {
      const menu = menuOf(item);
      if (!menu) return;
      menu.classList.add("g-menubar-menu");
      item.setAttribute("aria-haspopup", "menu");
      item.setAttribute("aria-expanded", "false");
      menu.addEventListener("toggle", (e) => {
        item.setAttribute("aria-expanded", e.newState === "open" ? "true" : "false");
        if (e.newState !== "open") return;
        /* flush with the bar: initMenu leaves a 4px gap meant for buttons */
        const r = item.getBoundingClientRect();
        menu.style.top = r.bottom + "px";
        menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + "px";
      });
      item.addEventListener("pointerenter", () => {
        const cur = openItem();
        if (cur && cur !== item) open(item);
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); step(item, 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); step(item, -1); }
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(item);
          menu.querySelector(".menu-item:not(:disabled)")?.focus();
        }
      });
      menu.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); step(item, 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); step(item, -1); }
        if (e.key === "Escape") { e.preventDefault(); close(item, true); }
      });
    });
  }

  g.use((root) => {
    root.querySelectorAll(".g-menubar").forEach((bar) => {
      if (bar.hasAttribute("data-menubar-init")) return;
      bar.setAttribute("data-menubar-init", "");
      initMenubar(bar);
    });
  });
})();
