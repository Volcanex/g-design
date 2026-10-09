import { Dialog } from "@base-ui/react/dialog";

export function GDialog({ trigger, title, desc, actions }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="rdlg-backdrop" />
        <Dialog.Popup className="rdlg">
          <div className="dlg-body">
            <Dialog.Title className="dlg-title">{title}</Dialog.Title>
            {desc && <Dialog.Description className="dlg-desc">{desc}</Dialog.Description>}
          </div>
          {actions && <div className="dlg-foot">{actions}</div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const DialogClose = Dialog.Close;
