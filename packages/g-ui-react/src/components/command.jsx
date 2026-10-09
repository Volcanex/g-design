import { Command } from "cmdk";

export function CommandPanel({ groups }) {
  return (
    <Command className="card rcmdk" label="Command menu">
      <Command.Input className="cmdk-input" placeholder="Type a command or search…" />
      <Command.List className="cmdk-list">
        <Command.Empty className="cmdk-empty">No results. Try fewer letters.</Command.Empty>
        {groups.map((g) => (
          <Command.Group key={g.heading} heading={g.heading}>
            {g.items.map((i) => (
              <Command.Item key={i.label} className="menu-item" onSelect={i.onSelect}>
                {i.label}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command>
  );
}
