/* g-ui behaviour layer. Framework-free; progressive: pages work without it,
   this adds the interactions CSS cannot do alone. */
(() => {
  const g = (window.g = window.g || {});

  /* ---- theme + density -------------------------------------------------- */

  g.theme = (mode) => {
    /* "dark" (the default), "light", or "system" (follow the OS) */
    const el = document.documentElement;
    if (mode === "dark") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", mode);
    try { localStorage.setItem("g-theme", mode); } catch {}
  };
  g.density = (mode) => {
    const el = document.documentElement;
    if (mode === "compact") el.setAttribute("data-density", "compact");
    else el.removeAttribute("data-density");
    try { localStorage.setItem("g-density", mode); } catch {}
  };
  try {
    const t = localStorage.getItem("g-theme");
    if (t && t !== "dark") document.documentElement.setAttribute("data-theme", t);
    if (localStorage.getItem("g-density") === "compact")
      document.documentElement.setAttribute("data-density", "compact");
  } catch {}

  /* ---- plain: markdown source flattened to label text -------------------
     Authored markdown reaches interface chrome constantly: a note title
     lifted from a body's first line, a search hit, a table cell, a tooltip.
     Chrome has no markdown renderer, so the syntax survives as literal
     asterisks and backticks. `.prose` is the ONLY place markdown is
     rendered; every other slot flattens first.

     Upstream truncation is the common case ("**A title cut mid-phrase"),
     which leaves openers with no closer, so unmatched asterisks and
     backticks are swept after the paired passes. Underscores are not
     swept: snake_case survives far more often than a stray _emphasis_,
     so they only pair at word boundaries, the way CommonMark reads them. */

  g.plain = (s) => String(s ?? "")
    .replace(/```[\s\S]*?```/g, " ")                     /* fenced code */
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")            /* image, keep the alt */
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")         /* labelled wikilink */
    .replace(/\[\[([^\]]*)\]\]/g, "$1")                  /* bare wikilink */
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")             /* link, keep the text */
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")                  /* heading marker */
    .replace(/^\s{0,3}>\s?/gm, "")                       /* quote marker */
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "")           /* list marker */
    .replace(/`+([^`]*)`+/g, "$1")                       /* code span */
    .replace(/\*\*\*([\s\S]*?)\*\*\*/g, "$1")
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/\*(?=\S)([\s\S]*?\S)\*/g, "$1")
    .replace(/(^|\W)___([\s\S]*?)___(?!\w)/g, "$1$2")
    .replace(/(^|\W)__([\s\S]*?)__(?!\w)/g, "$1$2")
    .replace(/(^|\W)_(?=\S)([\s\S]*?\S)_(?!\w)/g, "$1$2")
    .replace(/~~([\s\S]*?)~~/g, "$1")
    .replace(/[*`]/g, "")                                /* opener left by a cut */
    .replace(/\s+/g, " ")
    .trim();

  /* ---- tooltip with delay grouping -------------------------------------
     300ms warm-up before the first tooltip; once one is visible (or was
     within the last 300ms) neighbours show instantly. */

  let tipEl, tipTimer, tipWarm = false, tipCool;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "tooltip";
      tipEl.role = "tooltip";
      tipEl.id = "g-tooltip";
      document.body.append(tipEl);
    }
    return tipEl;
  }
  function showTip(trigger) {
    const el = tip();
    el.textContent = trigger.getAttribute("data-tip");
    el.toggleAttribute("data-instant", tipWarm);
    const r = trigger.getBoundingClientRect();
    el.style.left = "0px"; el.style.top = "0px";
    const w = el.offsetWidth, h = el.offsetHeight;
    /* Prefer above; flip below when there is no headroom. */
    const above = r.top - h - 6 >= 8;
    el.toggleAttribute("data-side", false);
    if (!above) el.setAttribute("data-side", "bottom");
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
    el.style.top = (above ? r.top - h - 6 : r.bottom + 6) + "px";
    el.setAttribute("data-open", "");
    trigger.setAttribute("aria-describedby", "g-tooltip");
    tipWarm = true;
    clearTimeout(tipCool);
  }
  function hideTip(trigger) {
    clearTimeout(tipTimer);
    tipEl?.removeAttribute("data-open");
    trigger?.removeAttribute("aria-describedby");
    tipCool = setTimeout(() => { tipWarm = false; }, 300);
  }
  document.addEventListener("pointerenter", (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (!t) return;
    clearTimeout(tipTimer);
    if (tipWarm) showTip(t);
    else tipTimer = setTimeout(() => showTip(t), 300);
  }, true);
  document.addEventListener("pointerleave", (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (t) hideTip(t);
  }, true);
  document.addEventListener("focusin", (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (t) showTip(t);
  });
  document.addEventListener("focusout", (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (t) hideTip(t);
  });

  /* ---- tabs: sliding indicator + arrow keys ----------------------------- */

  function initTabs(tabs) {
    let ind = tabs.querySelector(".tab-indicator");
    if (!ind) {
      ind = document.createElement("span");
      ind.className = "tab-indicator";
      tabs.append(ind);
    }
    const items = [...tabs.querySelectorAll(".tab")];
    function select(tab, focus) {
      items.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        const panel = t.getAttribute("aria-controls");
        if (panel) document.getElementById(panel)?.toggleAttribute("hidden", !on);
      });
      ind.style.width = tab.offsetWidth + "px";
      ind.style.translate = tab.offsetLeft + "px 0";
      if (focus) tab.focus();
    }
    items.forEach((t) => t.addEventListener("click", () => select(t)));
    tabs.addEventListener("keydown", (e) => {
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === "ArrowRight") select(items[(i + 1) % items.length], true);
      if (e.key === "ArrowLeft") select(items[(i - 1 + items.length) % items.length], true);
    });
    select(tabs.querySelector('.tab[aria-selected="true"]') || items[0]);
  }

  /* ---- menus on the Popover API ----------------------------------------- */

  function initMenu(menu) {
    const trigger = document.querySelector(`[popovertarget="${menu.id}"]`);
    menu.addEventListener("toggle", (e) => {
      if (e.newState !== "open" || !trigger) return;
      menu.style.maxHeight = "";
      const r = trigger.getBoundingClientRect();
      const fitsBelow = r.bottom + 4 + menu.offsetHeight < innerHeight;
      const fitsAbove = r.top - 4 - menu.offsetHeight > 0;
      /* A menu too tall for either side of the trigger stays below it and
         scrolls in whatever room is actually there, rather than flipping
         above and landing off the top of the screen: fitsAbove is false in
         that case too, so flipping never helped. */
      const below = fitsBelow || !fitsAbove;
      menu.style.setProperty("--_origin", below ? "top" : "bottom");
      menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + "px";
      menu.style.top = (below ? r.bottom + 4 : r.top - menu.offsetHeight - 4) + "px";
      if (below && !fitsBelow) menu.style.maxHeight = innerHeight - r.bottom - 12 + "px";
      highlight(menu, null);
    });
    menu.addEventListener("keydown", (e) => {
      const items = [...menu.querySelectorAll(".menu-item:not(:disabled)")];
      const cur = items.findIndex((i) => i.hasAttribute("data-highlighted"));
      if (e.key === "ArrowDown") { e.preventDefault(); highlight(menu, items[(cur + 1) % items.length]); }
      if (e.key === "ArrowUp") { e.preventDefault(); highlight(menu, items[(cur - 1 + items.length) % items.length]); }
      if (e.key === "Enter" && cur >= 0) { items[cur].click(); menu.hidePopover(); }
    });
    menu.addEventListener("pointermove", (e) => {
      const item = e.target.closest(".menu-item");
      if (item) highlight(menu, item);
    });
    menu.querySelectorAll(".menu-item").forEach((i) =>
      i.addEventListener("click", () => menu.hidePopover()));
  }
  function highlight(menu, item) {
    menu.querySelectorAll("[data-highlighted]").forEach((i) => i.removeAttribute("data-highlighted"));
    if (item) { item.setAttribute("data-highlighted", ""); item.focus({ preventScroll: true }); }
  }

  /* ---- toast: Sonner-style stack, scale + 14px offset ------------------- */

  let toaster;
  const toasts = [];
  const TOAST_ICONS = {
    ok: '<svg class="t-ok" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>',
    danger: '<svg class="t-danger" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>',
    loading: '<span class="spinner"></span>',
  };
  function toastBody(el, { title, desc, kind, action }) {
    el.innerHTML = `${TOAST_ICONS[kind] || ""}<div class="t-body"><b>${title || ""}</b>${desc ? `<div class="t-desc">${desc}</div>` : ""}</div>`;
    if (action) {
      const b = document.createElement("button");
      b.className = "btn btn-secondary btn-sm";
      b.textContent = action.label;
      b.addEventListener("click", () => { action.onClick?.(); dismiss(el); });
      el.append(b);
    }
  }
  /* patch the body in place when the shape is unchanged, so a loading
     spinner keeps turning across updates instead of restarting */
  function patchBody(el, next) {
    const same = el._kind === next.kind && !!el.querySelector(".t-body") && !next.action && !el.querySelector(".btn");
    if (!same) { el._kind = next.kind; toastBody(el, next); return; }
    const body = el.querySelector(".t-body");
    body.querySelector("b").textContent = next.title || "";
    let d = body.querySelector(".t-desc");
    if (next.desc) {
      if (!d) { d = document.createElement("div"); d.className = "t-desc"; body.append(d); }
      d.textContent = next.desc;
    } else d?.remove();
  }
  /* The toast's bar is the same progress component, pinned to its bottom edge. */
  function toastProgress(el, p) {
    let bar = el.querySelector(".t-bar");
    if (p == null || p === false) { bar?.remove(); el.removeAttribute("data-progress"); return; }
    if (!bar) { bar = document.createElement("div"); bar.className = "g-progress t-bar"; el.append(bar); }
    el.setAttribute("data-progress", "");
    g.progress(bar, p);
  }
  g.toast = (opts = {}) => {
    if (!toaster) {
      toaster = document.createElement("div");
      toaster.className = "toaster";
      toaster.setAttribute("aria-live", "polite");
      document.body.append(toaster);
      toaster.addEventListener("pointerenter", () => toasts.forEach((t) => clearTimeout(t.timer)));
      toaster.addEventListener("pointerleave", () =>
        toasts.forEach((t) => { if (!t.sticky) t.timer = setTimeout(() => dismiss(t), 2000); }));
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("data-entering", "");
    el.opts = Object.assign({}, opts);
    patchBody(el, opts);
    toastProgress(el, opts.progress);
    el.sticky = opts.kind === "loading" || opts.sticky;
    toaster.append(el);
    toasts.unshift(el);
    requestAnimationFrame(() => { el.removeAttribute("data-entering"); restack(); });
    if (!el.sticky) el.timer = setTimeout(() => dismiss(el), opts.duration || 4000);
    return {
      el,
      /* update merges, so a running job can move one field at a time */
      update(next) {
        const o = Object.assign(el.opts, next);
        patchBody(el, o);
        toastProgress(el, o.progress);
        el.sticky = o.kind === "loading" || o.sticky;
        clearTimeout(el.timer);
        if (!el.sticky) el.timer = setTimeout(() => dismiss(el), o.duration || 4000);
      },
      progress(p) { el.opts.progress = p; toastProgress(el, p); },
      dismiss: () => dismiss(el),
    };
  };
  function restack() {
    toasts.forEach((t, i) => {
      t.style.zIndex = 10 - i;
      t.style.translate = `0 ${-i * 14}px`;
      t.style.scale = `${Math.max(0, 1 - i * 0.05)}`;
      t.style.opacity = i > 2 ? "0" : "1";
      t.style.pointerEvents = i > 2 ? "none" : "";
    });
  }
  function dismiss(el) {
    clearTimeout(el.timer);
    const i = toasts.indexOf(el);
    if (i < 0) return;
    toasts.splice(i, 1);
    el.style.translate = ""; el.style.scale = "";
    el.setAttribute("data-leaving", "");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);
    restack();
  }

  /* ---- copy button ------------------------------------------------------ */

  function initCopy(btn) {
    if (!btn.querySelector(".copy-icons"))
      btn.insertAdjacentHTML("afterbegin", `<span class="copy-icons">${icon("copy")}${icon("check")}</span>`);
    const label = btn.querySelector(".copy-label");
    const live = document.createElement("span");
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    btn.append(live);
    if (label) btn.style.minWidth = btn.offsetWidth + "px";
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy")
        ?? document.querySelector(btn.getAttribute("data-copy-from"))?.textContent ?? "";
      try { await navigator.clipboard.writeText(text.trim()); } catch {}
      btn.setAttribute("data-copied", "");
      if (label) { label.textContent = "Copied"; bridgeLabel(label); }
      live.textContent = "Copied to clipboard";
      clearTimeout(btn.timer); /* re-click resets the timer, never stacks */
      btn.timer = setTimeout(() => {
        btn.removeAttribute("data-copied");
        if (label) label.textContent = "Copy";
        live.textContent = "";
      }, 1800);
    });
  }

  /* ---- command menu ----------------------------------------------------- */

  function fuzzy(q, s) {
    q = q.toLowerCase(); s = s.toLowerCase();
    let i = 0;
    for (const c of s) if (c === q[i]) i++;
    return i === q.length;
  }
  function initCmdk(dlg) {
    const input = dlg.querySelector(".cmdk-input");
    const list = dlg.querySelector(".cmdk-list");
    const empty = dlg.querySelector(".cmdk-empty");
    const items = () => [...list.querySelectorAll(".menu-item:not([hidden])")];
    function filter() {
      let any = false;
      list.querySelectorAll(".menu-item").forEach((i) => {
        const hit = !input.value || fuzzy(input.value, i.textContent);
        i.toggleAttribute("hidden", !hit);
        any = any || hit;
      });
      list.querySelectorAll(".cmdk-group").forEach((h) => {
        let sib = h.nextElementSibling, show = false;
        while (sib && !sib.classList.contains("cmdk-group")) {
          if (sib.classList.contains("menu-item") && !sib.hidden) show = true;
          sib = sib.nextElementSibling;
        }
        h.toggleAttribute("hidden", !show);
      });
      if (empty) empty.toggleAttribute("hidden", any);
      highlight(list, items()[0]);
    }
    input.addEventListener("input", filter);
    dlg.addEventListener("keydown", (e) => {
      const it = items();
      const cur = it.findIndex((i) => i.hasAttribute("data-highlighted"));
      if (e.key === "ArrowDown") { e.preventDefault(); highlight(list, it[(cur + 1) % it.length]); input.focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); highlight(list, it[(cur - 1 + it.length) % it.length]); input.focus(); }
      if (e.key === "Enter" && cur >= 0) { it[cur].click(); dlg.close(); }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (dlg.open) dlg.close();
        else { dlg.showModal(); input.value = ""; filter(); input.focus(); }
      }
    });
  }

  /* ---- view swap: page change inside persistent chrome ------------------ */

  /* g.swap(el, update): fade the old content out (100ms), run `update` to
     put the new view in, then replay the entrance stagger. Interruption
     safe: rapid navigation cancels the pending swap and the last one wins. */
  g.swap = (el, update) => {
    clearTimeout(el._swapTimer);
    el.setAttribute("data-leaving", "");
    el._swapTimer = setTimeout(() => {
      update(el);
      el.removeAttribute("data-leaving");
      if (el.classList.contains("enter")) {
        el.classList.remove("enter");
        void el.offsetWidth; /* restart the stagger */
        el.classList.add("enter");
      }
      init(el);
    }, 100);
  };

  /* ---- feedback buttons: save, send, download, refresh -------------------
     The taxonomy: destructive buttons show their icon before (the trash
     warns); feedback buttons earn theirs after the action succeeds. */

  /* Icons come from g-icons (concatenated ahead of this file by the build). */
  const icon = (name) => (g.icon ? g.icon(name) : "");

  function bridgeLabel(el) {
    if (!el) return;
    el.classList.remove("g-label-bridge");
    void el.offsetWidth;
    el.classList.add("g-label-bridge");
  }

  function announcer(btn) {
    let live = btn.querySelector(".g-live");
    if (!live) {
      live = document.createElement("span");
      live.className = "sr-only g-live";
      live.setAttribute("aria-live", "polite");
      btn.append(live);
    }
    return live;
  }

  /* click → done state + label swap, reverting after 2s; a re-click resets
     the timer, never stacks (the copy-button rule, everywhere) */
  function doneCycle(btn, attr, label, apply) {
    btn.style.minWidth = btn.offsetWidth + "px";
    const live = announcer(btn);
    btn.addEventListener("click", () => {
      apply?.();
      btn.setAttribute(attr, "");
      const doneText = btn.getAttribute("data-label-done");
      if (label && doneText) { label.textContent = doneText; bridgeLabel(label); }
      live.textContent = doneText || "Done";
      clearTimeout(btn._cycleTimer);
      btn._cycleTimer = setTimeout(() => {
        btn.removeAttribute(attr);
        if (label) { label.textContent = btn.getAttribute("data-label") || label.textContent; bridgeLabel(label); }
        live.textContent = "";
      }, 2000);
    });
  }

  function initSave(btn) {
    if (!btn.querySelector(".gi-save")) btn.insertAdjacentHTML("afterbegin", icon("save"));
    doneCycle(btn, "data-saved", btn.querySelector(".save-label"));
  }

  function initSend(btn) {
    if (!btn.querySelector(".gi-send")) btn.insertAdjacentHTML("afterbegin", icon("send"));
    doneCycle(btn, "data-sent", btn.querySelector(".send-label"));
  }

  function initDownload(btn) {
    if (!btn.querySelector(".gi-download")) btn.insertAdjacentHTML("afterbegin", icon("download"));
    const label = btn.querySelector(".dl-label");
    const live = announcer(btn);
    btn.style.minWidth = btn.offsetWidth + "px";
    const wait = parseInt(btn.getAttribute("data-wait") || "1100", 10);
    btn.addEventListener("click", () => {
      clearTimeout(btn._dlTimer); clearTimeout(btn._cycleTimer);
      btn.removeAttribute("data-done");
      btn.setAttribute("data-active", "");
      btn._dlTimer = setTimeout(() => {
        btn.removeAttribute("data-active");
        btn.setAttribute("data-done", "");
        const doneText = btn.getAttribute("data-label-done");
        if (label && doneText) { label.textContent = doneText; bridgeLabel(label); }
        live.textContent = doneText || "Downloaded";
        btn._cycleTimer = setTimeout(() => {
          btn.removeAttribute("data-done");
          if (label) label.textContent = btn.getAttribute("data-label") || label.textContent;
          live.textContent = "";
        }, 2000);
      }, wait);
    });
  }

  function initSpin(btn) {
    if (!btn.querySelector("svg")) btn.insertAdjacentHTML("afterbegin", icon("refresh"));
    btn.addEventListener("click", () => {
      btn.removeAttribute("data-spinning");
      void btn.offsetWidth; /* restart mid-spin cleanly */
      btn.setAttribute("data-spinning", "");
    });
    btn.addEventListener("animationend", (e) => {
      if (e.animationName === "g-revolve") btn.removeAttribute("data-spinning");
    });
  }

  /* ---- status badge: swap with a blink ---------------------------------- */

  /* One swell: the pill resizes to its new label while colours crossfade and
     the text types through a blur; once settled, the pill blinks three times.
     Width is measured in px at both ends so the transition has real numbers. */
  g.status = (el, { kind, label }) => {
    const nextClass = "badge" + (kind ? " badge-" + kind : "");
    const sameClass = el.className.replace(/\s*g-swelling\s*/, " ").trim() === nextClass;
    const sameText = label == null || el.textContent === label;
    if (sameClass && sameText) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !el.isConnected) {
      el.className = nextClass;
      if (label != null) el.textContent = label;
      return;
    }
    const from = el.getBoundingClientRect().width;
    el.className = nextClass + " g-swelling";
    if (label != null) el.textContent = label;
    el.style.width = "";
    const to = el.getBoundingClientRect().width;
    el.style.width = from + "px";
    void el.offsetWidth;
    el.style.width = to + "px";
    el.removeAttribute("data-flash");
    void el.offsetWidth; /* restart the animation */
    el.setAttribute("data-flash", "");
    if (label != null && !sameText) bridgeLabel(el);
    clearTimeout(el._swell);
    el._swell = setTimeout(() => { el.style.width = ""; el.classList.remove("g-swelling"); }, 700);
  };

  /* ---- confirm button: tick draws in on click --------------------------- */

  function initConfirm(btn) {
    const label = btn.querySelector(".confirm-label");
    btn.style.minWidth = btn.offsetWidth + "px";
    if (!btn.querySelector(".gi-check")) btn.insertAdjacentHTML("afterbegin", icon("check"));
    btn.addEventListener("click", () => {
      /* one-way; a re-click resets the revert timer, never un-ticks */
      const first = !btn.hasAttribute("data-done");
      btn.setAttribute("data-done", "");
      if (label && first) { label.textContent = btn.getAttribute("data-label-done") || label.textContent; bridgeLabel(label); }
      if (btn.hasAttribute("data-revert")) {
        clearTimeout(btn.timer);
        btn.timer = setTimeout(() => {
          btn.removeAttribute("data-done");
          if (label) label.textContent = btn.getAttribute("data-label") || label.textContent;
        }, 2000);
      }
    });
  }

  /* ---- hold to delete ---------------------------------------------------- */

  /* Holding a button down is a pointer gesture: it wants a cursor that can rest
     on a target without the finger covering it, and a press that is distinct
     from a tap. Touch has neither, so a held finger there reads as a stuck tap.
     Fine-pointer devices get the hold; everything else gets a two-step confirm
     ("Delete" then "Really delete?"), which is the same guard by other means.
     Both paths end in one `hold-complete` event, so consumers never branch. */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function initHold(btn) {
    if (!btn.querySelector("svg")) btn.insertAdjacentHTML("afterbegin", icon("trash"));
    if (!btn.querySelector(".hold-fill")) {
      const f = document.createElement("span");
      f.className = "hold-fill";
      btn.prepend(f);
    }
    const label = btn.querySelector("span:not(.hold-fill)");
    const holdLabel = btn.getAttribute("data-hold-label") || (label && label.textContent) || "Hold to delete";
    const tapLabel = btn.getAttribute("data-tap-label") || "Delete";
    const confirmLabel = btn.getAttribute("data-confirm-label") || "Really delete?";
    const dur = parseInt(btn.getAttribute("data-hold-ms") || "2000", 10);
    btn.style.setProperty("--hold-dur", dur + "ms");

    const fire = () => btn.dispatchEvent(new CustomEvent("hold-complete", { bubbles: true }));

    /* --- hold path (fine pointer) --- */
    let timer;
    const start = () => {
      if (btn.disabled || btn.hasAttribute("data-holding")) return;
      btn.setAttribute("data-holding", "");
      timer = setTimeout(() => { cancel(); fire(); }, dur);
    };
    const cancel = () => { clearTimeout(timer); btn.removeAttribute("data-holding"); };

    /* --- confirm path (coarse pointer) --- */
    let armed;
    const disarm = () => {
      clearTimeout(armed);
      armed = null;
      btn.removeAttribute("data-confirming");
      if (label) label.textContent = tapLabel;
    };
    const arm = () => {
      btn.setAttribute("data-confirming", "");
      if (label) label.textContent = confirmLabel;
      /* an unanswered confirm goes back to rest rather than sitting armed */
      armed = setTimeout(disarm, 3000);
    };

    btn.addEventListener("pointerdown", (e) => { if (btn.dataset.mode === "hold" && e.pointerType !== "touch") start(); });
    btn.addEventListener("pointerup", cancel);
    btn.addEventListener("pointerleave", cancel);
    btn.addEventListener("keydown", (e) => {
      if (btn.dataset.mode !== "hold") return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!e.repeat) start(); }
    });
    btn.addEventListener("keyup", (e) => { if (e.key === "Enter" || e.key === " ") cancel(); });
    btn.addEventListener("blur", () => { cancel(); if (armed) disarm(); });
    btn.addEventListener("click", (e) => {
      e.preventDefault(); /* a completed hold is the click; never the plain action */
      if (btn.dataset.mode === "hold" || btn.disabled) return;
      if (armed) { disarm(); fire(); } else arm();
    });

    /* Mode is an attribute so the button describes its own behaviour in the
       DOM, and so a hybrid device that gains or loses a mouse re-decides. */
    const setMode = () => {
      const hold = finePointer.matches;
      if (btn.dataset.mode === (hold ? "hold" : "confirm")) return;
      cancel();
      if (armed) disarm();
      btn.dataset.mode = hold ? "hold" : "confirm";
      if (label) label.textContent = hold ? holdLabel : tapLabel;
    };
    setMode();
    finePointer.addEventListener("change", setMode);
  }

  /* ---- dialogs: light-dismiss ------------------------------------------ */

  function initDialog(dlg) {
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close(); /* backdrop click */
    });
  }

  /* ---- wire up ----------------------------------------------------------- */

  /* Component fragments (packages/g-ui/src/components/*.js) register here;
     they run once immediately and again for every g.swap'd view. */
  g.plugins = [];
  g.use = (fn) => {
    g.plugins.push(fn);
    if (document.readyState !== "loading") fn(document);
    else document.addEventListener("DOMContentLoaded", () => fn(document), { once: true });
  };

  function init(root = document) {
    g.plugins.forEach((fn) => { if (root !== document) fn(root); });
    /* generic: any element can request an animated icon by name */
    root.querySelectorAll("[data-icon]").forEach((el) => {
      if (!el.querySelector(".gi")) el.insertAdjacentHTML("afterbegin", icon(el.getAttribute("data-icon")));
    });
    root.querySelectorAll(".tabs").forEach(initTabs);
    root.querySelectorAll(".menu[popover]").forEach(initMenu);
    root.querySelectorAll(".copy-btn").forEach(initCopy);
    root.querySelectorAll(".confirm-btn").forEach(initConfirm);
    root.querySelectorAll(".hold-btn").forEach(initHold);
    root.querySelectorAll(".save-btn").forEach(initSave);
    root.querySelectorAll(".send-btn").forEach(initSend);
    root.querySelectorAll(".dl-btn").forEach(initDownload);
    root.querySelectorAll(".spin-btn").forEach(initSpin);
    root.querySelectorAll("dialog.cmdk").forEach(initCmdk);
    root.querySelectorAll("dialog.dlg").forEach(initDialog);
  }
  g.init = init;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => init());
  else init();
})();
