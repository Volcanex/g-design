/* g-ui behaviour: slider, progress, meter, dropzone.
   Every one of these reads its value straight out of the DOM, the range
   input, aria-valuenow, data-value, the file input's FileList, so there is
   no second copy to drift. Progress and meter watch their own attributes,
   which makes `el.setAttribute("aria-valuenow", 40)` the whole API. */
(() => {
  const g = (window.g = window.g || {});

  const num = (v, fallback) => (v == null || v === "" || isNaN(+v) ? fallback : +v);
  const clamp = (n) => Math.min(1, Math.max(0, n));

  /* ---- slider ----------------------------------------------------------- */

  function initSlider(wrap) {
    const input = wrap.querySelector('input[type="range"]');
    if (!input) return;
    let out = wrap.querySelector(".g-slider-out");
    if (wrap.hasAttribute("data-output") && !out) {
      out = document.createElement("span");
      out.className = "g-slider-out num";
      out.setAttribute("aria-hidden", "true"); /* the input already announces it */
      wrap.prepend(out);
    }
    const sync = () => {
      const min = num(input.min, 0);
      const max = num(input.max, 100);
      wrap.style.setProperty("--_p", max === min ? 0 : clamp((input.value - min) / (max - min)));
      if (out) {
        const suf = wrap.getAttribute("data-suffix") || "";
        /* the number is what sits over the thumb; the suffix hangs off its
           right edge without pulling the centre, so 5% and 100% both align */
        out.textContent = input.value;
        out.dataset.suffix = suf;
      }
    };
    input.addEventListener("input", sync);
    sync();
  }

  /* ---- progress --------------------------------------------------------- */

  function fillOf(el, cls) {
    let fill = el.querySelector("." + cls);
    if (!fill) {
      fill = document.createElement("span");
      fill.className = cls;
      el.append(fill);
    }
    return fill;
  }

  function initProgress(el) {
    const fill = fillOf(el, "g-progress-fill");
    if (!el.hasAttribute("role")) el.setAttribute("role", "progressbar");
    /* written once, before the observer starts: writing an observed attribute
       from inside the callback would re-enter forever */
    if (!el.hasAttribute("aria-valuemin")) el.setAttribute("aria-valuemin", 0);
    if (!el.hasAttribute("aria-valuemax")) el.setAttribute("aria-valuemax", 100);
    const sync = () => {
      const min = num(el.getAttribute("aria-valuemin"), 0);
      const max = num(el.getAttribute("aria-valuemax"), 100);
      if (el.hasAttribute("data-indeterminate")) {
        fill.style.width = "";
        return;
      }
      const now = num(el.getAttribute("aria-valuenow"), 0);
      fill.style.width = (max === min ? 0 : clamp((now - min) / (max - min)) * 100) + "%";
    };
    new MutationObserver(sync).observe(el, {
      attributes: true,
      attributeFilter: ["aria-valuenow", "aria-valuemin", "aria-valuemax", "data-indeterminate"],
    });
    sync();
  }

  /* ---- meter ------------------------------------------------------------ */

  function initMeter(el) {
    const fill = fillOf(el, "g-meter-fill");
    if (!el.hasAttribute("role")) el.setAttribute("role", "meter");
    const sync = () => {
      const min = num(el.dataset.min, 0);
      const max = num(el.dataset.max, 100);
      const value = num(el.dataset.value, 0);
      const warn = num(el.dataset.warnAt, Infinity);
      const danger = num(el.dataset.dangerAt, Infinity);
      fill.style.width = (max === min ? 0 : clamp((value - min) / (max - min)) * 100) + "%";
      el.setAttribute("data-zone", value >= danger ? "danger" : value >= warn ? "warn" : "ok");
      el.setAttribute("aria-valuemin", min);
      el.setAttribute("aria-valuemax", max);
      el.setAttribute("aria-valuenow", value);
      if (el.dataset.valuetext) el.setAttribute("aria-valuetext", el.dataset.valuetext);
    };
    new MutationObserver(sync).observe(el, {
      attributes: true,
      attributeFilter: ["data-value", "data-min", "data-max", "data-warn-at", "data-danger-at", "data-valuetext"],
    });
    sync();
  }

  /* ---- dropzone --------------------------------------------------------- */

  const FILE_ICON = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"/></svg>';
  const X_ICON = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';

  function fileSize(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  function initDropzone(zone) {
    const input = zone.querySelector('input[type="file"]');
    if (!input) return;
    let list = zone.querySelector(".g-dropzone-files");
    if (!list) {
      list = document.createElement("ul");
      list.className = "g-dropzone-files";
      zone.append(list);
    }

    /* the FileList on the input is the only store: a drop writes into it
       through a DataTransfer, so a real form submit carries what is shown */
    const put = (files) => {
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(f);
      input.files = dt.files;
      render();
      zone.dispatchEvent(new CustomEvent("files", {
        bubbles: true,
        detail: { files: [...input.files] },
      }));
    };
    const add = (incoming) => {
      const kept = input.multiple ? [...input.files] : [];
      for (const f of incoming) {
        if (kept.some((k) => k.name === f.name && k.size === f.size)) continue;
        if (!input.multiple) kept.length = 0;
        kept.push(f);
      }
      put(kept);
    };
    const remove = (i) => put([...input.files].filter((_, n) => n !== i));

    function render() {
      list.textContent = "";
      [...input.files].forEach((f, i) => {
        const li = document.createElement("li");
        li.className = "g-dropzone-file";
        li.innerHTML = `${FILE_ICON}<span class="g-dropzone-name"></span><span class="g-dropzone-size num"></span>`;
        li.querySelector(".g-dropzone-name").textContent = f.name;
        li.querySelector(".g-dropzone-size").textContent = fileSize(f.size);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-tertiary btn-sm btn-icon";
        btn.setAttribute("aria-label", "Remove " + f.name);
        btn.innerHTML = X_ICON;
        btn.addEventListener("click", () => remove(i));
        li.append(btn);
        list.append(li);
      });
    }

    input.addEventListener("change", () => {
      render();
      zone.dispatchEvent(new CustomEvent("files", { bubbles: true, detail: { files: [...input.files] } }));
    });

    /* dragenter/leave fire per child element, so count depth instead of
       trusting a single leave to mean the pointer really left */
    let depth = 0;
    const over = (on) => zone.toggleAttribute("data-dragover", on);
    zone.addEventListener("dragenter", (e) => { e.preventDefault(); depth++; over(true); });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
    zone.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; over(false); } });
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      depth = 0;
      over(false);
      if (e.dataTransfer?.files?.length) add(e.dataTransfer.files);
    });

    render();
  }

  /* g.progress(el, p, parts): the imperative face of .g-progress. p is 0..1 for
     measurable work, true for a sweep. parts fill the readout the bar reports
     to: the .progress-readout beside it, or the id its data-readout names (a
     bar pinned to a panel's top edge often reports in the footer). */
  g.progress = (el, p, parts) => {
    if (!el.classList.contains("g-progress")) el.classList.add("g-progress");
    if (!el.hasAttribute("data-progress-init")) { el.setAttribute("data-progress-init", ""); initProgress(el); }
    if (p === true) el.setAttribute("data-indeterminate", "");
    else {
      el.removeAttribute("data-indeterminate");
      el.setAttribute("aria-valuenow", Math.round(clamp(p || 0) * 100));
    }
    const ref = el.getAttribute("data-readout");
    const out = (ref && document.getElementById(ref)) || el.closest(".progress-row")?.querySelector(".progress-readout") || el.parentElement?.querySelector(".progress-readout");
    if (!out) return;
    const bits = [];
    if (p !== true) {
      const pct = document.createElement("b");
      pct.className = "pct";
      pct.textContent = Math.round(clamp(p || 0) * 100) + "%";
      bits.push(pct);
    }
    for (const part of [].concat(parts || []).filter(Boolean)) {
      const s = document.createElement("span"); s.textContent = part; bits.push(s);
    }
    out.replaceChildren(...bits);
  };

  /* One set of units for every readout in the system. */
  g.bytes = (n) => {
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i > 0 && n < 10 ? n.toFixed(1) : Math.round(n)) + " " + u[i];
  };
  g.rate = (bps) => g.bytes(bps) + "/s";
  g.eta = (s) => (s >= 60 ? Math.round(s / 60) + "m left" : Math.max(1, Math.round(s)) + "s left");

  /* ---- wire up ---------------------------------------------------------- */

  const each = (root, sel, flag, fn) =>
    root.querySelectorAll(sel).forEach((el) => {
      if (el.hasAttribute(flag)) return;
      el.setAttribute(flag, "");
      fn(el);
    });

  g.use((root) => {
    each(root, ".g-slider", "data-slider-init", initSlider);
    each(root, ".g-progress", "data-progress-init", initProgress);
    each(root, ".g-meter", "data-meter-init", initMeter);
    each(root, ".g-dropzone", "data-dropzone-init", initDropzone);
  });
})();
