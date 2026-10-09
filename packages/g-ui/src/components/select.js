/* g-select and g-combobox, listbox popups on the Popover API.

   The popups are manual popovers, not auto ones: light dismiss fires on the
   pointerdown that opens the control, so an auto popover would close and
   reopen inside one click. This fragment owns dismissal instead. */
(() => {
  const g = (window.g = window.g || {});
  let uid = 0;
  const nextId = (prefix) => `${prefix}-${++uid}`;

  const rows = (list) =>
    [...list.querySelectorAll('.g-option:not([hidden]):not([aria-disabled="true"])')];

  const labelOf = (opt) =>
    opt.getAttribute("data-label") || opt.textContent.trim().replace(/\s+/g, " ");

  const valueOf = (opt) => opt.getAttribute("data-value") ?? labelOf(opt);

  /* Position under the anchor, flipping above when there is no room, the
     same geometry initMenu uses for .menu, plus a clamp, because a list long
     enough to flip is often too long to fit above the anchor either. */
  function place(list, anchor) {
    const r = anchor.getBoundingClientRect();
    list.style.minWidth = r.width + "px";
    const h = list.offsetHeight;
    const below = r.bottom + 4 + h < innerHeight;
    list.style.setProperty("--_origin", below ? "top" : "bottom");
    list.style.left = Math.min(r.left, innerWidth - list.offsetWidth - 8) + "px";
    const top = below ? r.bottom + 4 : r.top - h - 4;
    list.style.top = Math.max(8, Math.min(top, innerHeight - h - 8)) + "px";
  }

  /* owner is whatever holds DOM focus, so aria-activedescendant lands there:
     the list itself for a select, the text field for a combobox. */
  function highlight(list, opt, owner) {
    list.querySelectorAll("[data-highlighted]").forEach((o) => o.removeAttribute("data-highlighted"));
    if (!opt) { owner.removeAttribute("aria-activedescendant"); return; }
    opt.setAttribute("data-highlighted", "");
    opt.scrollIntoView({ block: "nearest" });
    owner.setAttribute("aria-activedescendant", opt.id);
  }

  function move(list, owner, step) {
    const items = rows(list);
    if (!items.length) return;
    const cur = items.findIndex((o) => o.hasAttribute("data-highlighted"));
    let i;
    if (step === "first") i = 0;
    else if (step === "last") i = items.length - 1;
    else if (cur < 0) i = step > 0 ? 0 : items.length - 1;
    else i = (cur + step + items.length) % items.length;
    highlight(list, items[i], owner);
  }

  function prepare(list, owner) {
    if (!list.id) list.id = nextId("g-listbox");
    list.setAttribute("popover", "manual");
    list.setAttribute("role", "listbox");
    list.tabIndex = -1;
    list.querySelectorAll(".g-option").forEach((o) => {
      if (!o.id) o.id = nextId("g-option");
      o.setAttribute("role", "option");
      if (!o.hasAttribute("aria-selected")) o.setAttribute("aria-selected", "false");
      if (!o.querySelector(".gi-check")) o.insertAdjacentHTML("afterbegin", g.icon("check"));
      o.addEventListener("pointermove", () => highlight(list, o, owner));
    });
    let empty = list.querySelector(".g-listbox-empty");
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "g-listbox-empty";
      empty.textContent = list.getAttribute("data-empty-text") || "No matches";
      list.append(empty);
    }
    empty.setAttribute("role", "presentation");
    empty.hidden = true;
    return empty;
  }

  /* A hidden input mirrors the value so the control posts with the form. */
  function mirror(root) {
    const name = root.getAttribute("data-name");
    if (!name) return null;
    let input = root.querySelector('input[type="hidden"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      root.append(input);
    }
    input.name = name;
    return input;
  }

  function announce(root, opt) {
    root.dispatchEvent(new CustomEvent("change", {
      bubbles: true,
      detail: { value: valueOf(opt), label: labelOf(opt) },
    }));
  }

  function markSelected(list, opt) {
    list.querySelectorAll(".g-option").forEach((o) =>
      o.setAttribute("aria-selected", String(o === opt)));
  }

  /* ---- select ----------------------------------------------------------- */

  function initGSelect(root) {
    if (root.hasAttribute("data-g-init")) return;
    const trigger = root.querySelector(".g-select-trigger");
    const list = root.querySelector(".g-listbox");
    if (!trigger || !list) return;
    root.setAttribute("data-g-init", "");

    const empty = prepare(list, list);
    empty.hidden = true;
    const hidden = mirror(root);

    let value = trigger.querySelector(".g-select-value");
    if (!value) {
      value = document.createElement("span");
      value.className = "g-select-value";
      trigger.append(value);
    }
    value.id = value.id || nextId("g-select-value");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", list.id);
    const labelledby = root.getAttribute("data-labelledby");
    trigger.setAttribute("aria-labelledby", labelledby ? `${labelledby} ${value.id}` : value.id);

    const placeholder = root.getAttribute("data-placeholder") || "Choose one";

    function paint(opt) {
      if (!opt) {
        trigger.setAttribute("data-empty", "");
        value.textContent = placeholder;
        if (hidden) hidden.value = "";
        return;
      }
      trigger.removeAttribute("data-empty");
      /* the trigger wears the row itself, badge and all, minus the check */
      const parts = [...opt.cloneNode(true).childNodes]
        .filter((n) => !(n.nodeType === 1 && n.classList.contains("gi")));
      value.replaceChildren(...parts);
      if (hidden) hidden.value = valueOf(opt);
    }

    function choose(opt) {
      markSelected(list, opt);
      paint(opt);
      announce(root, opt);
    }

    const isOpen = () => list.matches(":popover-open");

    function open() {
      if (isOpen() || trigger.disabled) return;
      list.showPopover();
      place(list, trigger);
      trigger.setAttribute("aria-expanded", "true");
      list.focus({ preventScroll: true });
      highlight(list, list.querySelector('.g-option[aria-selected="true"]') || rows(list)[0], list);
    }

    function close(refocus) {
      if (!isOpen()) return;
      list.hidePopover();
      trigger.setAttribute("aria-expanded", "false");
      highlight(list, null, list);
      if (refocus) trigger.focus();
    }

    trigger.addEventListener("click", () => (isOpen() ? close(true) : open()));
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); }
    });

    /* the list keeps focus while a row is clicked, so the keys keep working
       if the popup stays open */
    list.addEventListener("pointerdown", (e) => e.preventDefault());
    list.addEventListener("click", (e) => {
      const opt = e.target.closest('.g-option:not([aria-disabled="true"])');
      if (!opt) return;
      choose(opt);
      close(true);
    });

    /* typeahead: a single letter cycles the rows that start with it, a longer
       run searches from the top. The buffer clears after 600ms of quiet. */
    let buf = "", bufTimer;
    function typeahead(ch) {
      clearTimeout(bufTimer);
      buf += ch.toLowerCase();
      bufTimer = setTimeout(() => { buf = ""; }, 600);
      const items = rows(list);
      const from = items.findIndex((o) => o.hasAttribute("data-highlighted"));
      const order = buf.length === 1
        ? [...items.slice(from + 1), ...items.slice(0, from + 1)]
        : items;
      const hit = order.find((o) => labelOf(o).toLowerCase().startsWith(buf));
      if (hit) highlight(list, hit, list);
    }

    list.addEventListener("keydown", (e) => {
      const cur = list.querySelector("[data-highlighted]");
      if (e.key === "ArrowDown") { e.preventDefault(); move(list, list, 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(list, list, -1); }
      else if (e.key === "Home") { e.preventDefault(); move(list, list, "first"); }
      else if (e.key === "End") { e.preventDefault(); move(list, list, "last"); }
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (cur) choose(cur);
        close(true);
      } else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") { close(true); }
      else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        typeahead(e.key);
      }
    });

    document.addEventListener("pointerdown", (e) => {
      if (!root.contains(e.target)) close(false);
    });

    paint(list.querySelector('.g-option[aria-selected="true"]'));
  }

  /* ---- combobox --------------------------------------------------------- */

  function initGCombobox(root) {
    if (root.hasAttribute("data-g-init")) return;
    const input = root.querySelector("input:not([type=hidden])");
    const list = root.querySelector(".g-listbox");
    if (!input || !list) return;
    root.setAttribute("data-g-init", "");

    const empty = prepare(list, input);
    const hidden = mirror(root);

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("autocomplete", "off");

    let chosen = list.querySelector('.g-option[aria-selected="true"]');
    if (chosen) {
      input.value = labelOf(chosen);
      if (hidden) hidden.value = valueOf(chosen);
    }

    const isOpen = () => list.matches(":popover-open");

    function filter() {
      const q = input.value.trim().toLowerCase();
      let any = false;
      list.querySelectorAll(".g-option").forEach((o) => {
        const hit = !q || labelOf(o).toLowerCase().includes(q);
        o.hidden = !hit;
        any = any || hit;
      });
      empty.hidden = any;
      if (isOpen()) { highlight(list, rows(list)[0], input); place(list, input); }
      else highlight(list, null, input);
    }

    function open() {
      if (isOpen() || input.disabled) return;
      list.showPopover();
      place(list, input);
      input.setAttribute("aria-expanded", "true");
      highlight(list, list.querySelector('.g-option[aria-selected="true"]:not([hidden])') || rows(list)[0], input);
    }

    function close() {
      if (!isOpen()) return;
      list.hidePopover();
      input.setAttribute("aria-expanded", "false");
      highlight(list, null, input);
    }

    function choose(opt) {
      chosen = opt;
      markSelected(list, opt);
      input.value = labelOf(opt);
      if (hidden) hidden.value = valueOf(opt);
      announce(root, opt);
      close();
    }

    /* leaving with half-typed text is not a choice: the field settles back
       onto whatever is actually selected */
    function settle() {
      input.value = chosen ? labelOf(chosen) : "";
      filter();
    }

    input.addEventListener("input", () => { open(); filter(); });
    input.addEventListener("click", () => open());
    input.addEventListener("keydown", (e) => {
      const cur = list.querySelector("[data-highlighted]");
      if (e.key === "ArrowDown") { e.preventDefault(); if (!isOpen()) { open(); return; } move(list, input, 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (!isOpen()) { open(); return; } move(list, input, -1); }
      else if (e.key === "Home" && isOpen()) { e.preventDefault(); move(list, input, "first"); }
      else if (e.key === "End" && isOpen()) { e.preventDefault(); move(list, input, "last"); }
      else if (e.key === "Enter") {
        if (!isOpen()) return;
        e.preventDefault();
        if (cur) choose(cur); else close();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (isOpen()) close(); else settle();
      } else if (e.key === "Tab") { close(); }
    });

    /* the field keeps focus while the popup is clicked, so the click lands
       as a choice rather than as a blur */
    list.addEventListener("pointerdown", (e) => e.preventDefault());
    list.addEventListener("click", (e) => {
      const opt = e.target.closest('.g-option:not([aria-disabled="true"])');
      if (opt) { choose(opt); input.focus(); }
    });

    root.addEventListener("focusout", (e) => {
      if (root.contains(e.relatedTarget)) return;
      close();
      settle();
    });
    document.addEventListener("pointerdown", (e) => {
      if (!root.contains(e.target) && isOpen()) { close(); settle(); }
    });

    filter();
  }

  g.use((root) => {
    root.querySelectorAll(".g-select").forEach(initGSelect);
    root.querySelectorAll(".g-combobox").forEach(initGCombobox);
  });
})();
