/* g-icons — generated from packages/g-icons/icons/*.svg. Do not edit. */
(() => {
  const g = (window.g = window.g || {});
  g.icons = {
  "bell": "<svg class=\"gi gi-bell\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"body\"><path d=\"M56 110 a72 72 0 0 1 144 0 c0 34 8 58 14 68 a5 5 0 0 1 -4 8 H46 a5 5 0 0 1 -4 -8 c6 -10 14 -34 14 -68 Z\"/></g> <g data-part=\"clapper\"><path d=\"M102 214 a26 26 0 0 0 52 0\"/></g></svg>",
  "check": "<svg class=\"gi gi-check\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"tick\"><path pathLength=\"1\" d=\"M48 138 l52 52 108 -110\"/></g></svg>",
  "copy": "<svg class=\"gi gi-copy\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"back\"><path d=\"M96 80 V56 a8 8 0 0 1 8 -8 h96 a8 8 0 0 1 8 8 v96 a8 8 0 0 1 -8 8 h-24\"/></g> <g data-part=\"front\"><path d=\"M56 96 h96 a8 8 0 0 1 8 8 v96 a8 8 0 0 1 -8 8 h-96 a8 8 0 0 1 -8 -8 v-96 a8 8 0 0 1 8 -8 Z\"/></g></svg>",
  "download": "<svg class=\"gi gi-download\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"arrow-clip\"><g data-part=\"arrow\"><path d=\"M128 36 v100 M86 100 l42 42 42 -42\"/></g></g> <g data-part=\"tray\"><path d=\"M40 158 v34 a16 16 0 0 0 16 16 h144 a16 16 0 0 0 16 -16 v-34\"/></g> <g data-part=\"check\"><path pathLength=\"1\" d=\"M92 106 l26 26 50 -52\"/></g></svg>",
  "plus": "<svg class=\"gi gi-plus\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"cross\"><path d=\"M128 48 v160 M48 128 h160\"/></g></svg>",
  "refresh": "<svg class=\"gi gi-refresh\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"arc1\"><path pathLength=\"1\" d=\"M62 71 A80 80 0 0 1 196 100\"/><path d=\"M196 58 v42 h-42\"/></g> <g data-part=\"arc2\"><path pathLength=\"1\" d=\"M194 185 A80 80 0 0 1 60 156\"/><path d=\"M60 198 v-42 h42\"/></g></svg>",
  "save": "<svg class=\"gi gi-save\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"body\"><path d=\"M172 40 H48 a8 8 0 0 0 -8 8 v160 a8 8 0 0 0 8 8 h160 a8 8 0 0 0 8 -8 V84 Z\"/></g> <g data-part=\"label\"><path pathLength=\"1\" d=\"M88 216 v-52 a6 6 0 0 1 6 -6 h68 a6 6 0 0 1 6 6 v52\"/></g> <g data-part=\"stripe\"><path d=\"M96 78 h52\"/></g></svg>",
  "search": "<svg class=\"gi gi-search\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"glass\"><circle cx=\"112\" cy=\"112\" r=\"72\"/></g> <g data-part=\"handle\"><path d=\"M164 164 L218 218\"/></g></svg>",
  "send": "<svg class=\"gi gi-send\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"plane\"><path d=\"M222 34 L36 102 l86 36 26 82 Z\"/><path d=\"M222 34 L124 140\"/></g> <g data-part=\"check\"><path pathLength=\"1\" d=\"M84 142 l30 28 60 -58\"/></g></svg>",
  "trash": "<svg class=\"gi gi-trash\" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><g data-part=\"lid\"><path d=\"M40 72 h176 M100 72 v-16 a12 12 0 0 1 12 -12 h32 a12 12 0 0 1 12 12 v16\"/></g> <g data-part=\"body\"><path d=\"M60 72 l8 138 a8 8 0 0 0 8 8 h104 a8 8 0 0 0 8 -8 l8 -138 M106 112 v58 M150 112 v58\"/></g></svg>"
};
  g.icon = (name) => g.icons[name] || "";
})();

/* g-ui behaviour layer. Framework-free; progressive — pages work without it,
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
      const r = trigger.getBoundingClientRect();
      const below = r.bottom + 4 + menu.offsetHeight < innerHeight;
      menu.style.setProperty("--_origin", below ? "top" : "bottom");
      menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + "px";
      menu.style.top = (below ? r.bottom + 4 : r.top - menu.offsetHeight - 4) + "px";
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
    toastBody(el, opts);
    el.sticky = opts.kind === "loading" || opts.sticky;
    toaster.append(el);
    toasts.unshift(el);
    requestAnimationFrame(() => { el.removeAttribute("data-entering"); restack(); });
    if (!el.sticky) el.timer = setTimeout(() => dismiss(el), opts.duration || 4000);
    return {
      el,
      update(next) {
        toastBody(el, next);
        el.sticky = next.kind === "loading" || next.sticky;
        clearTimeout(el.timer);
        if (!el.sticky) el.timer = setTimeout(() => dismiss(el), next.duration || 4000);
      },
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
      if (label) label.textContent = "Copied";
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
      if (label && doneText) label.textContent = doneText;
      live.textContent = doneText || "Done";
      clearTimeout(btn._cycleTimer);
      btn._cycleTimer = setTimeout(() => {
        btn.removeAttribute(attr);
        if (label) label.textContent = btn.getAttribute("data-label") || label.textContent;
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
        if (label && doneText) label.textContent = doneText;
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

  g.status = (el, { kind, label }) => {
    el.className = "badge" + (kind ? " badge-" + kind : "");
    if (label != null) el.textContent = label;
    el.removeAttribute("data-flash");
    void el.offsetWidth; /* restart the animation */
    el.setAttribute("data-flash", "");
  };

  /* ---- confirm button: tick draws in on click --------------------------- */

  function initConfirm(btn) {
    const label = btn.querySelector(".confirm-label");
    btn.style.minWidth = btn.offsetWidth + "px";
    if (!btn.querySelector(".gi-check")) btn.insertAdjacentHTML("afterbegin", icon("check"));
    btn.addEventListener("click", () => {
      /* one-way; a re-click resets the revert timer, never un-ticks */
      btn.setAttribute("data-done", "");
      if (label) label.textContent = btn.getAttribute("data-label-done") || label.textContent;
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

  function initHold(btn) {
    if (!btn.querySelector("svg")) btn.insertAdjacentHTML("afterbegin", icon("trash"));
    if (!btn.querySelector(".hold-fill")) {
      const f = document.createElement("span");
      f.className = "hold-fill";
      btn.prepend(f);
    }
    const dur = parseInt(btn.getAttribute("data-hold-ms") || "900", 10);
    btn.style.setProperty("--hold-dur", dur + "ms");
    let timer;
    const start = () => {
      if (btn.disabled || btn.hasAttribute("data-holding")) return;
      btn.setAttribute("data-holding", "");
      timer = setTimeout(() => {
        cancel();
        btn.dispatchEvent(new CustomEvent("hold-complete", { bubbles: true }));
      }, dur);
    };
    const cancel = () => { clearTimeout(timer); btn.removeAttribute("data-holding"); };
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", cancel);
    btn.addEventListener("pointerleave", cancel);
    btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!e.repeat) start(); } });
    btn.addEventListener("keyup", (e) => { if (e.key === "Enter" || e.key === " ") cancel(); });
    /* a completed hold is the click; suppress the plain click action */
    btn.addEventListener("click", (e) => e.preventDefault());
  }

  /* ---- dialogs: light-dismiss ------------------------------------------ */

  function initDialog(dlg) {
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close(); /* backdrop click */
    });
  }

  /* ---- wire up ----------------------------------------------------------- */

  function init(root = document) {
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
