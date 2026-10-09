import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig, motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { Button } from "../src/components/button.jsx";
import { Switch } from "../src/components/switch.jsx";
import { GDialog, DialogClose } from "../src/components/dialog.jsx";
import { GMenu } from "../src/components/menu.jsx";
import { TipProvider, Tip } from "../src/components/tooltip.jsx";
import { GTabs } from "../src/components/tabs.jsx";
import { GDrawer } from "../src/components/drawer.jsx";
import { CommandPanel } from "../src/components/command.jsx";
import { Stat } from "../src/components/stat.jsx";
import "./shim.css";

const SERVICES = [
  { id: "brain-mcp", region: "eu-central", p95: "84 ms", detail: "MCP and REST faces of the knowledge layer. One process, one cache. Probed by L5 on a timer." },
  { id: "g-command-web", region: "eu-central", p95: "121 ms", detail: "The command centre. Renders the topology from gp-core and the live health snapshot from brain." },
  { id: "g-site", region: "eu-central", p95: "67 ms", detail: "The public face. Editions are frozen static builds; the grid is generated from the manifest." },
];

function Expander() {
  const [open, setOpen] = useState(null);
  return (
    <div className="exp-list">
      {SERVICES.map((s) => (
        <motion.div
          key={s.id}
          layout
          layoutId={s.id}
          className="card exp-item"
          onClick={() => setOpen(open === s.id ? null : s.id)}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        >
          <motion.div layout="position" className="line">
            <span className="card-title">{s.id}</span>
            <span className="badge badge-ok">Live</span>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{s.p95}</span>
          </motion.div>
          <AnimatePresence>
            {open === s.id && (
              <motion.div
                className="exp-detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                {s.detail} Region {s.region}.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function App() {
  const [deploying, setDeploying] = useState(false);
  const [requests, setRequests] = useState(1241082);
  return (
    <TipProvider>
      <div className="lab">
        <section>
          <h1 style={{ fontSize: 18 }}>React lab</h1>
          <p className="cap">The same tokens and recipes, driven by the React layer: Base UI primitives, Sonner toasts, a Vaul sheet, cmdk, NumberFlow and one Motion shared-element transition. Every visual state comes from data attributes, not class toggles.</p>
        </section>

        <section>
          <span className="label">Buttons and controls</span>
          <div className="row">
            <Button variant="primary" loading={deploying} onClick={() => { setDeploying(true); setTimeout(() => { setDeploying(false); setRequests((r) => r + 1029); toast.success("Deployed", { description: "Live in 2.4s" }); }, 1800); }}>Deploy</Button>
            <Button>Preview</Button>
            <Button variant="tertiary">Cancel</Button>
            <Tip text="Base UI switch, spring thumb"><Switch defaultChecked aria-label="Alerts" /></Tip>
            <Tip text="Tooltips share the 300ms warm-up"><Button variant="tertiary" size="sm">Hover me</Button></Tip>
            <Tip text="Instant between neighbours"><Button variant="tertiary" size="sm">Then me</Button></Tip>
          </div>
        </section>

        <div className="cols">
          <section>
            <span className="label">Overlays</span>
            <div className="row">
              <GDialog
                trigger={<Button>Delete service…</Button>}
                title="Delete state-api?"
                desc="The service stops immediately and its domain is released. Deployments and logs are kept for 30 days, so this can be undone until 3 October."
                actions={<>
                  <DialogClose render={<Button>Cancel</Button>} />
                  <DialogClose render={<Button variant="danger" onClick={() => toast.error("state-api deleted", { description: "Restorable until 3 October" })}><svg viewBox="0 0 256 256" fill="currentColor" width="15" height="15" aria-hidden="true"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>Delete service</Button>} />
                </>}
              />
              <GMenu
                trigger={<Button>Actions</Button>}
                items={[
                  { label: "Refresh now", onClick: () => toast("Refreshed") },
                  { label: "Download CSV" },
                  "-",
                  { label: "Pause probes", danger: true },
                ]}
              />
              <GDrawer trigger={<Button>Open sheet</Button>} title="Deployment notes">
                <p className="cap">A bottom sheet on Vaul: 500ms, the iOS curve, drag down to dismiss and velocity decides. The one surface allowed past the 300ms ceiling.</p>
              </GDrawer>
            </div>
            <GTabs
              tabs={[
                { value: "overview", label: "Overview", content: "The indicator rides Base UI's --active-tab-left and --active-tab-width variables." },
                { value: "logs", label: "Logs", content: "Nothing new in the last hour." },
                { value: "settings", label: "Settings", content: "Settings live here." },
              ]}
            />
          </section>
          <section>
            <span className="label">Command menu (cmdk)</span>
            <CommandPanel
              groups={[
                { heading: "Go to", items: [{ label: "Overview" }, { label: "Services" }, { label: "Alerts" }] },
                { heading: "Actions", items: [{ label: "New deployment", onSelect: () => toast.success("Deployment started") }, { label: "Toggle theme", onSelect: () => document.documentElement.toggleAttribute("data-theme") }] },
              ]}
            />
          </section>
        </div>

        <div className="cols">
          <section>
            <span className="label">NumberFlow</span>
            <Stat label="Requests, last 24h" value={requests} />
            <div className="row">
              <Button size="sm" onClick={() => setRequests((r) => r + Math.floor(1000 + Math.random() * 9000))}>Simulate traffic</Button>
            </div>
            <p className="cap">Deploying bumps the counter too; digits roll rather than swap, and the animation respects reduced motion.</p>
          </section>
          <section>
            <span className="label">Shared-element transition (Motion)</span>
            <Expander />
            <p className="cap">Click a service: the card grows to hold its detail with a layout transition. The one shared-element demo, per the spec.</p>
          </section>
        </div>
      </div>
      <Toaster
        position="bottom-right"
        offset={16}
        gap={14}
        toastOptions={{ unstyled: true, classNames: { toast: "rtoast" } }}
      />
    </TipProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
