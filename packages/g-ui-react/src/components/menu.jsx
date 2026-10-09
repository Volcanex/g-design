import { Menu } from "@base-ui/react/menu";

export function GMenu({ trigger, items }) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="start">
          <Menu.Popup className="menu rmenu">
            {items.map((it, i) =>
              it === "-" ? (
                <hr className="separator" key={i} />
              ) : (
                <Menu.Item
                  key={it.label}
                  className={it.danger ? "menu-item danger" : "menu-item"}
                  onClick={it.onClick}
                >
                  {it.label}
                </Menu.Item>
              )
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
