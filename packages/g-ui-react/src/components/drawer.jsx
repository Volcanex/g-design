import { Drawer } from "vaul";

/* The one 500ms surface. Vaul brings the gesture and velocity dismissal;
   the curve is ease-ios per the motion spec. */
export function GDrawer({ trigger, title, children }) {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="rdrawer-overlay" />
        <Drawer.Content className="rdrawer">
          <div className="rdrawer-handle" aria-hidden="true" />
          <Drawer.Title className="dlg-title">{title}</Drawer.Title>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
