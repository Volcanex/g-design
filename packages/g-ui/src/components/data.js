/* data behaviours: pagination, right-click menus, sortable and selectable
   tables. Each init stamps the element so a re-init after g.swap is a no-op. */
(() => {
  const g = (window.g = window.g || {});

  const once = (el, flag) => {
    if (el.hasAttribute(flag)) return false;
    el.setAttribute(flag, "");
    return true;
  };

  /* ---- pagination -------------------------------------------------------
     Prev and next step through the buttons that are actually rendered, so a
     set with ellipsis gaps jumps the gap rather than paging into nothing. */

  function initPages(nav) {
    if (!once(nav, "data-pages-init")) return;
    const pages = () => [...nav.querySelectorAll("[data-page]")].filter((b) => /^\d+$/.test(b.dataset.page));
    const prev = nav.querySelector('[data-page="prev"]');
    const next = nav.querySelector('[data-page="next"]');
    const current = () => nav.querySelector('[aria-current="page"]');

    function edges() {
      const i = pages().indexOf(current());
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i < 0 || i === pages().length - 1;
    }
    function go(btn) {
      if (!btn || btn === current()) return edges();
      pages().forEach((b) => b.removeAttribute("aria-current"));
      btn.setAttribute("aria-current", "page");
      edges();
      nav.dispatchEvent(new CustomEvent("page", {
        bubbles: true,
        detail: { page: Number(btn.dataset.page) },
      }));
    }
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      const list = pages();
      const i = list.indexOf(current());
      if (btn === prev) go(list[Math.max(0, i - 1)]);
      else if (btn === next) go(list[Math.min(list.length - 1, i + 1)]);
      else go(btn);
    });
    edges();
  }

  /* ---- context menu -----------------------------------------------------
     Reuses the .menu popover recipe: we place it at the pointer and show it,
     the existing menu behaviour keeps the arrow keys, and popover auto mode
     keeps Escape and outside click.

     The one subtlety: a contextmenu event arrives mid-press, and the browser
     light-dismisses open popovers on the pointerup that ends that press, so a
     menu opened here would be shut a moment later. When a pointer is down we
     hand the open to that pointerup; a keyboard menu key opens immediately. */

  let pointerDown = false, pendingOpen = null;
  addEventListener("pointerdown", () => { pointerDown = true; }, true);
  addEventListener("pointerup", () => {
    pointerDown = false;
    const open = pendingOpen;
    pendingOpen = null;
    open?.();
  }, true);
  addEventListener("pointercancel", () => { pointerDown = false; pendingOpen = null; }, true);

  function showMenuAt(menu, x, y) {
    if (!menu.matches(":popover-open")) menu.showPopover();
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.setProperty("--_origin", "top left");
    menu.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + "px";
    menu.querySelector(".menu-item:not(:disabled)")?.focus({ preventScroll: true });
  }

  function initContextMenu(target) {
    if (!once(target, "data-ctx-init")) return;
    const menu = document.getElementById(target.getAttribute("data-context-menu"));
    if (!menu) return;
    target.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const open = () => showMenuAt(menu, e.clientX, e.clientY);
      if (pointerDown) pendingOpen = open;
      else open();
    });
  }

  /* ---- sortable ---------------------------------------------------------- */

  const cellText = (row, i) => (row.cells[i]?.getAttribute("data-value") ?? row.cells[i]?.textContent ?? "").trim();
  const asNumber = (s) => parseFloat(s.replace(/[^\d.-]/g, "")) || 0;

  function initSortable(table) {
    if (!once(table, "data-sort-init")) return;
    const tbody = table.tBodies[0];
    const heads = [...table.querySelectorAll("th[data-sort]")];
    heads.forEach((th) => {
      if (!th.hasAttribute("aria-sort")) th.setAttribute("aria-sort", "none");
      th.tabIndex = 0;
      const sort = () => {
        const dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
        heads.forEach((o) => o.setAttribute("aria-sort", "none"));
        th.setAttribute("aria-sort", dir);
        const col = [...th.parentNode.children].indexOf(th);
        const numeric = th.dataset.sort === "num";
        const sign = dir === "ascending" ? 1 : -1;
        [...tbody.rows]
          .sort((a, b) => {
            const x = cellText(a, col), y = cellText(b, col);
            return sign * (numeric ? asNumber(x) - asNumber(y) : x.localeCompare(y));
          })
          .forEach((r) => tbody.append(r));
      };
      th.addEventListener("click", sort);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sort(); }
      });
    });
  }

  /* ---- selectable -------------------------------------------------------- */

  function initSelectable(table) {
    if (!once(table, "data-select-init")) return;
    const all = table.querySelector("thead .checkbox");
    const boxes = () => [...table.querySelectorAll("tbody .checkbox")];
    function sync(emit) {
      const list = boxes();
      const n = list.filter((b) => b.checked).length;
      list.forEach((b) => b.closest("tr").toggleAttribute("data-selected", b.checked));
      if (all) {
        all.checked = n > 0 && n === list.length;
        all.indeterminate = n > 0 && n < list.length;
      }
      if (emit) table.dispatchEvent(new CustomEvent("selection", { bubbles: true, detail: { count: n, total: list.length } }));
    }
    all?.addEventListener("change", () => {
      boxes().forEach((b) => { b.checked = all.checked; });
      sync(true);
    });
    table.addEventListener("change", (e) => {
      if (e.target.classList.contains("checkbox") && e.target.closest("tbody")) sync(true);
    });
    sync(false);
  }

  g.use((root) => {
    root.querySelectorAll(".g-pages").forEach(initPages);
    root.querySelectorAll("[data-context-menu]").forEach(initContextMenu);
    root.querySelectorAll(".table.g-sortable").forEach(initSortable);
    root.querySelectorAll(".table.g-selectable").forEach(initSelectable);
  });
})();
