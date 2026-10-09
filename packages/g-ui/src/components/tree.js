/* g-tree behaviour: roving focus with the arrow keys, and one event.
   ArrowUp and ArrowDown move between visible rows, ArrowRight expands and
   ArrowLeft collapses a row that has a caret, Enter and Space click the
   row. A caret click (or those arrows) dispatches a bubbling, cancelable
   "g-tree:toggle" with {row, expanded}; when nobody cancels it the row's
   aria-expanded flips so plain markup works, while a consumer that owns
   the state can preventDefault and re-render instead. Selection, renaming
   and drag stay with the consumer, which knows what the rows mean. */
(() => {
  const g = (window.g = window.g || {});

  const rowsOf = (tree) => [...tree.querySelectorAll(".g-tree-row:not([hidden])")];

  function toggle(row, expanded) {
    if (!row.hasAttribute("aria-expanded")) return;
    const ok = row.dispatchEvent(new CustomEvent("g-tree:toggle", {
      bubbles: true, cancelable: true, detail: { row, expanded },
    }));
    if (ok) row.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function initTree(tree) {
    tree.setAttribute("role", tree.getAttribute("role") || "tree");
    const rove = () => {
      const rows = rowsOf(tree);
      const active = rows.find((r) => r.getAttribute("aria-selected") === "true") || rows[0];
      rows.forEach((r) => {
        r.setAttribute("role", "treeitem");
        r.tabIndex = r === active ? 0 : -1;
      });
    };
    rove();
    new MutationObserver(rove).observe(tree, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected", "hidden"] });

    tree.addEventListener("click", (e) => {
      const caret = e.target.closest(".g-tree-caret");
      if (!caret) return;
      e.stopPropagation();
      const row = caret.closest(".g-tree-row");
      toggle(row, row.getAttribute("aria-expanded") !== "true");
    });

    tree.addEventListener("keydown", (e) => {
      const row = e.target.closest(".g-tree-row");
      if (!row) return;
      const rows = rowsOf(tree);
      const i = rows.indexOf(row);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = rows[e.key === "ArrowDown" ? Math.min(i + 1, rows.length - 1) : Math.max(i - 1, 0)];
        next?.focus();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        toggle(row, true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        toggle(row, false);
      } else if (e.key === "Enter" || e.key === " ") {
        if (e.target !== row) return; /* an input or button inside keeps its keys */
        e.preventDefault();
        row.click();
      }
    });
  }

  g.use((root) => {
    root.querySelectorAll(".g-tree").forEach((tree) => {
      if (tree.hasAttribute("data-tree-init")) return;
      tree.setAttribute("data-tree-init", "");
      initTree(tree);
    });
  });
})();
