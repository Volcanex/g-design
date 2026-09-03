import { Tabs } from "@base-ui/react/tabs";

export function GTabs({ tabs }) {
  return (
    <Tabs.Root defaultValue={tabs[0].value}>
      <Tabs.List className="tabs rtabs">
        {tabs.map((t) => (
          <Tabs.Tab key={t.value} value={t.value} className="tab">
            {t.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="rtab-indicator" />
      </Tabs.List>
      {tabs.map((t) => (
        <Tabs.Panel key={t.value} value={t.value} className="rtab-panel">
          {t.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
