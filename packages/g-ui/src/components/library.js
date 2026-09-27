/* g-library: a searchable, paged grid of things to pick, beside a category
   tree with recent and favourites. Data in, events out; the consumer never
   touches the markup.

     const lib = g.library(el, {
       items: [{ id, label, meta, metaMono, category: "Newcastle/Props", keywords, disabled }],
       noun: ["prop", "props"],          count and empty-state wording
       pageSize: 120,                     paged past this many, never virtualised
       storageKey: "forge-props",         keeps favourites and recent (optional)
       empty: { title, desc },            when there are no items at all
     });
     el.addEventListener("g-library:pick", (e) => e.detail.item);
     el.addEventListener("g-library:favourite", (e) => e.detail);  {id, on, favourites}
     lib.set(items); lib.current(id); lib.search(q); lib.focus(); lib.category(id);

   `category` is a slash path, so the tree nests; items without one sit
   under All only. Keyboard: the grid is one tab stop with arrow keys,
   Home, End, Page Up and Page Down; Enter picks; F stars the focused tile;
   / jumps to search, where Enter picks the first result and Arrow Down
   drops into the grid. Recent and favourites are in-memory unless
   storageKey is given (then localStorage, failing quietly). */
(() => {
  const g = (window.g = window.g || {});

  const svg = (cls, d) => `<svg class="${cls}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  const STAR = svg("g-star", "M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z");

  const plain = (s) => (g.plain ? g.plain(s) : String(s ?? ""));
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };

  g.library = (el, opts = {}) => {
    if (el._gLibrary) { if (opts.items) el._gLibrary.set(opts.items); return el._gLibrary; }
    const o = { pageSize: 120, recentMax: 12, noun: ["item", "items"], ...opts };
    const saved = o.storageKey ? read(o.storageKey) : null;
    const st = {
      items: [], byId: new Map(), cat: "all", q: "", page: 0, focus: 0, collapsed: new Set(),
      favs: [...(saved?.favourites ?? o.favourites ?? [])],
      recent: [...(saved?.recent ?? o.recent ?? [])],
      current: o.current ?? null,
    };
    const [one, many] = o.noun;
    const count = (n, what = many) => `${n} ${n === 1 ? one : what}`;

    el.classList.add("g-library");
    el.replaceChildren();
    const side = make("div", "g-library-side");
    const tree = make("div", "g-tree");
    tree.setAttribute("aria-label", o.treeLabel || "Categories");
    side.append(tree);
    const main = make("div", "g-library-main");
    const bar = make("div", "g-library-bar");
    const search = make("label", "g-library-search");
    const input = make("input", "input");
    Object.assign(input, { type: "search", placeholder: o.placeholder || `Search ${many}`, autocomplete: "off", spellcheck: false });
    input.setAttribute("aria-label", o.placeholder || `Search ${many}`);
    search.append(input);
    const tally = make("span", "g-library-count");
    tally.setAttribute("aria-live", "polite");
    bar.append(search, tally);
    const scroll = make("div", "g-library-scroll");
    const grid = make("div", "g-library-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", o.label || many);
    const empty = make("div", "empty");
    empty.hidden = true;
    scroll.append(grid, empty);
    /* .g-pages markup and styles; the stamp keeps data.js off it, because
       the page set here is re-rendered as the window moves */
    const foot = make("nav", "g-pages g-library-foot");
    foot.setAttribute("aria-label", "Pages");
    foot.setAttribute("data-pages-init", "");
    foot.hidden = true;
    main.append(bar, scroll, foot);
    el.append(side, main);

    const persist = () => { if (o.storageKey) write(o.storageKey, { favourites: st.favs, recent: st.recent }); };
    const emit = (name, detail) => el.dispatchEvent(new CustomEvent(`g-library:${name}`, { bubbles: true, detail }));
    const pathOf = (it) => (it.category ? String(it.category).split("/").map((s) => s.trim()).filter(Boolean).join("/") : "");

    /* ---- the view: category, then search terms, then the page ---------- */

    function inView() {
      let list;
      if (st.cat === "recent") list = st.recent.map((id) => st.byId.get(id)).filter(Boolean);
      else if (st.cat === "favourites") list = st.favs.map((id) => st.byId.get(id)).filter(Boolean);
      else if (st.cat === "all") list = st.items;
      else list = st.items.filter((it) => { const p = pathOf(it); return p === st.cat || p.startsWith(st.cat + "/"); });
      const terms = st.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return list;
      const hits = list.filter((it) => terms.every((t) => it._hay.includes(t)));
      /* a label that starts with the first word ranks first; otherwise order is kept */
      const lead = hits.filter((it) => it._label.startsWith(terms[0]));
      return lead.concat(hits.filter((it) => !it._label.startsWith(terms[0])));
    }

    /* ---- tree ------------------------------------------------------------ */

    function row(id, label, n, depth, { caret } = {}) {
      const r = make("div", "g-tree-row");
      r.dataset.cat = id;
      r.style.setProperty("--depth", depth);
      r.setAttribute("aria-selected", String(st.cat === id));
      if (caret) r.setAttribute("aria-expanded", String(!st.collapsed.has(id)));
      const c = make("button", "g-tree-caret");
      c.type = "button"; c.tabIndex = -1;
      c.setAttribute("aria-label", `Show or hide ${label}`);
      r.append(c);
      r.append(make("span", "g-tree-label", label), make("span", "g-library-n", String(n)));
      return r;
    }
    function drawTree() {
      const focused = tree.contains(document.activeElement) ? document.activeElement.dataset.cat : null;
      const rows = [
        row("all", "All", st.items.length, 0),
        row("recent", "Recent", st.recent.filter((id) => st.byId.has(id)).length, 0),
        row("favourites", "Favourites", st.favs.filter((id) => st.byId.has(id)).length, 0),
      ];
      const counts = new Map();
      for (const it of st.items) {
        const parts = pathOf(it).split("/").filter(Boolean);
        parts.forEach((_, i) => { const p = parts.slice(0, i + 1).join("/"); counts.set(p, (counts.get(p) || 0) + 1); });
      }
      const paths = [...counts.keys()];
      if (paths.length) rows.push(make("div", "g-library-rule"));
      for (const p of paths) {
        const depth = p.split("/").length - 1;
        const hasKids = paths.some((q) => q.startsWith(p + "/"));
        const r = row(p, p.split("/").pop(), counts.get(p), depth, { caret: hasKids });
        r.hidden = paths.some((q) => p.startsWith(q + "/") && st.collapsed.has(q));
        rows.push(r);
      }
      tree.replaceChildren(...rows);
      if (focused) tree.querySelector(`[data-cat="${CSS.escape(focused)}"]`)?.focus();
    }
    tree.addEventListener("click", (e) => {
      const r = e.target.closest(".g-tree-row");
      if (r && !e.target.closest(".g-tree-caret")) api.category(r.dataset.cat);
    });
    tree.addEventListener("g-tree:toggle", (e) => {
      e.preventDefault();
      const id = e.detail.row.dataset.cat;
      if (e.detail.expanded) st.collapsed.delete(id); else st.collapsed.add(id);
      drawTree();
    });

    /* ---- grid ------------------------------------------------------------ */

    function tile(it) {
      const t = make("div", "g-tile");
      const b = make("button", "g-tile-main");
      b.type = "button";
      b.dataset.id = it.id;
      b.disabled = !!it.disabled;
      if (it.id === st.current) b.setAttribute("aria-current", "true");
      const text = make("span", "g-tile-text");
      text.append(make("span", "g-tile-label", it._plainLabel));
      if (it.meta) text.append(make("span", `g-tile-meta${it.metaMono ? " mono" : ""}`, plain(it.meta)));
      b.append(text);
      const f = make("button", "g-tile-fav");
      f.type = "button"; f.tabIndex = -1;
      f.setAttribute("aria-pressed", String(st.favs.includes(it.id)));
      f.setAttribute("aria-label", `Favourite ${it._plainLabel}`);
      f.setAttribute("aria-keyshortcuts", "F");
      f.innerHTML = STAR;
      t.append(b, f);
      return t;
    }
    const tiles = () => [...grid.querySelectorAll(".g-tile-main")];
    function rove(i, focus) {
      const list = tiles();
      if (!list.length) return;
      st.focus = Math.max(0, Math.min(i, list.length - 1));
      list.forEach((b, k) => { b.tabIndex = k === st.focus ? 0 : -1; });
      if (focus) { list[st.focus].focus(); list[st.focus].scrollIntoView({ block: "nearest" }); }
    }
    function cols() {
      const list = tiles();
      if (list.length < 2) return 1;
      const top = list[0].offsetTop;
      const n = list.findIndex((b) => b.offsetTop !== top);
      return n < 0 ? list.length : n;
    }

    function pagesFor(n, cur) {
      if (n <= 7) return [...Array(n).keys()];
      const set = new Set([0, n - 1, cur - 1, cur, cur + 1].filter((p) => p >= 0 && p < n));
      return [...set].sort((a, b) => a - b);
    }
    function drawFoot(pages) {
      const hadFocus = foot.contains(document.activeElement) ? document.activeElement.dataset.page : null;
      foot.hidden = pages < 2;
      if (pages < 2) { foot.replaceChildren(); return; }
      const btn = (page, label, aria) => {
        const b = make("button", "btn btn-tertiary btn-sm btn-icon");
        b.type = "button"; b.dataset.page = page;
        if (aria) b.setAttribute("aria-label", aria);
        b.textContent = label;
        return b;
      };
      const prev = btn("prev", "", "Previous page");
      prev.innerHTML = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/></svg>';
      prev.disabled = st.page === 0;
      const next = btn("next", "", "Next page");
      next.innerHTML = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg>';
      next.disabled = st.page === pages - 1;
      const kids = [prev];
      let last = -1;
      for (const p of pagesFor(pages, st.page)) {
        if (p > last + 1) { const gap = make("span", "g-gap", "..."); gap.setAttribute("aria-hidden", "true"); kids.push(gap); }
        const b = btn(String(p + 1), String(p + 1), `Page ${p + 1}`);
        if (p === st.page) b.setAttribute("aria-current", "page");
        kids.push(b);
        last = p;
      }
      kids.push(next);
      foot.replaceChildren(...kids);
      if (hadFocus) (foot.querySelector(`[data-page="${hadFocus}"]:not(:disabled)`) || foot.querySelector('[aria-current="page"]'))?.focus();
    }
    foot.addEventListener("click", (e) => {
      const b = e.target.closest("[data-page]");
      if (!b || b.disabled) return;
      const p = b.dataset.page;
      api.page(p === "prev" ? st.page - 1 : p === "next" ? st.page + 1 : Number(p) - 1);
    });

    function showEmpty(title, desc, action) {
      empty.replaceChildren(make("span", "e-title", title));
      if (desc) empty.append(make("span", "e-desc", desc));
      if (action) {
        const b = make("button", "btn btn-secondary btn-sm", action.label);
        b.type = "button";
        b.addEventListener("click", action.run);
        empty.append(b);
      }
      empty.hidden = false;
    }

    function draw({ keepFocus = false } = {}) {
      const hadFocus = keepFocus && grid.contains(document.activeElement);
      const list = inView();
      const pages = Math.max(1, Math.ceil(list.length / o.pageSize));
      st.page = Math.min(st.page, pages - 1);
      const slice = list.slice(st.page * o.pageSize, (st.page + 1) * o.pageSize);
      grid.replaceChildren(...slice.map(tile));
      empty.hidden = true;
      const catLabel = st.cat === "all" ? null : st.cat === "recent" ? "Recent" : st.cat === "favourites" ? "Favourites" : st.cat.split("/").pop();
      if (!st.items.length) showEmpty(o.empty?.title || `No ${many} yet`, o.empty?.desc);
      else if (!list.length && st.q) {
        showEmpty(`No ${many} match "${st.q}"`, catLabel ? `Nothing in ${catLabel} matches. Everything else might.` : "Try a shorter word, or part of the name.",
          catLabel ? { label: "Search everything", run: () => api.category("all") } : { label: "Clear search", run: () => { api.search(""); input.focus(); } });
      } else if (!list.length && st.cat === "recent") showEmpty("Nothing picked yet", `The last ${o.recentMax} ${many} you pick show up here.`);
      else if (!list.length && st.cat === "favourites") showEmpty("No favourites yet", "Star a tile, or press F on it, to keep it here.");
      else if (!list.length) showEmpty(`No ${many} here`);
      tally.textContent = st.q ? `${count(list.length, many)} found` : count(list.length);
      drawFoot(pages);
      rove(Math.min(st.focus, slice.length - 1), hadFocus);
    }

    /* ---- input ----------------------------------------------------------- */

    function pick(id) {
      const it = st.byId.get(id);
      if (!it || it.disabled) return;
      st.recent = [id, ...st.recent.filter((r) => r !== id)].slice(0, o.recentMax);
      persist();
      drawTree();
      if (st.cat === "recent") draw({ keepFocus: true });
      emit("pick", { item: it.source });
    }
    function favourite(id) {
      const on = !st.favs.includes(id);
      st.favs = on ? [...st.favs, id] : st.favs.filter((f) => f !== id);
      persist();
      drawTree();
      if (st.cat === "favourites") draw({ keepFocus: true });
      else grid.querySelector(`.g-tile-main[data-id="${CSS.escape(id)}"]`)?.nextElementSibling?.setAttribute("aria-pressed", String(on));
      emit("favourite", { id, on, favourites: [...st.favs] });
    }

    grid.addEventListener("click", (e) => {
      const fav = e.target.closest(".g-tile-fav");
      if (fav) { favourite(fav.previousElementSibling.dataset.id); return; }
      const b = e.target.closest(".g-tile-main");
      if (b) { rove(tiles().indexOf(b)); pick(b.dataset.id); }
    });
    grid.addEventListener("keydown", (e) => {
      const b = e.target.closest(".g-tile-main");
      if (!b || e.ctrlKey || e.metaKey || e.altKey) return;
      const i = tiles().indexOf(b), n = cols();
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + n, ArrowUp: i - n, Home: 0, End: Infinity }[e.key];
      if (e.key === "ArrowUp" && i < n) { e.preventDefault(); input.focus(); return; }
      if (to !== undefined) { e.preventDefault(); rove(to, true); return; }
      if (e.key === "PageDown" || e.key === "PageUp") { e.preventDefault(); api.page(st.page + (e.key === "PageDown" ? 1 : -1)); rove(0, true); return; }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); favourite(b.dataset.id); return; }
      if (e.key === "/") { e.preventDefault(); input.focus(); input.select(); }
    });
    input.addEventListener("input", () => { st.q = input.value.trim(); st.page = 0; st.focus = 0; draw(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); rove(0, true); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const first = tiles().find((b) => !b.disabled);
        if (first) pick(first.dataset.id);
      } else if (e.key === "Escape" && input.value) {
        /* first Escape clears the search; the next one is the container's */
        e.preventDefault();
        e.stopPropagation();
        api.search("");
      }
    });

    /* ---- api --------------------------------------------------------------- */

    const api = {
      el,
      set(items) {
        st.items = items.map((it) => {
          const label = plain(it.label ?? it.id);
          return { ...it, source: it, _plainLabel: label, _label: label.toLowerCase(),
            _hay: [label, it.meta, it.category, ...(it.keywords || [])].filter(Boolean).join(" ").toLowerCase() };
        });
        st.byId = new Map(st.items.map((it) => [it.id, it]));
        drawTree();
        draw();
        return api;
      },
      category(id) {
        st.cat = id; st.page = 0; st.focus = 0;
        tree.querySelectorAll(".g-tree-row").forEach((r) => r.setAttribute("aria-selected", String(r.dataset.cat === id)));
        draw();
        return api;
      },
      search(q) { input.value = q; st.q = q.trim(); st.page = 0; st.focus = 0; draw(); return api; },
      page(p) {
        const pages = Math.max(1, Math.ceil(inView().length / o.pageSize));
        const next = Math.max(0, Math.min(p, pages - 1));
        if (next === st.page) return api;
        st.page = next; st.focus = 0;
        draw();
        scroll.scrollTop = 0;
        return api;
      },
      current(id) {
        st.current = id;
        tiles().forEach((b) => (b.dataset.id === id ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
        return api;
      },
      focus() { input.focus(); input.select(); return api; },
      get state() { return { category: st.cat, query: st.q, page: st.page, favourites: [...st.favs], recent: [...st.recent] }; },
    };
    el._gLibrary = api;
    g.init?.(side);
    api.set(o.items || []);
    return api;
  };
})();
