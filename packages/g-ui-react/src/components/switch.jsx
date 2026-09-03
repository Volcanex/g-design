import { Switch as BaseSwitch } from "@base-ui/react/switch";

export function Switch(props) {
  return (
    <BaseSwitch.Root className="rswitch" {...props}>
      <BaseSwitch.Thumb className="rswitch-thumb" />
    </BaseSwitch.Root>
  );
}
