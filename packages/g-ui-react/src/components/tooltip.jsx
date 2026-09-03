import { Tooltip } from "@base-ui/react/tooltip";

/* One provider per app: 300ms warm-up shared by every tooltip, instant
   between neighbours. */
export function TipProvider({ children }) {
  return <Tooltip.Provider delay={300}>{children}</Tooltip.Provider>;
}

export function Tip({ text, children }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6}>
          <Tooltip.Popup className="tooltip rtip">{text}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
