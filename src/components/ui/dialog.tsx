import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
export const ModalReturnFocus = createContext<HTMLElement | null>(null);
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const launcher = useContext(ModalReturnFocus);
  const [returnFocus] = useState(
    () => launcher || (document.activeElement as HTMLElement | null),
  );
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={`dialog-content ${wide ? "dialog-wide" : ""} ${className}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              const activeDialog = Array.from(
                document.querySelectorAll('[role="dialog"]'),
              ).at(-1);
              // Restore into a parent dialog, but never steal focus from a new one.
              if (
                activeDialog &&
                (!returnFocus || !activeDialog.contains(returnFocus))
              )
                return;
              const target = returnFocus?.isConnected
                ? returnFocus
                : document.getElementById("main-content");
              target?.focus({ preventScroll: true });
            });
          }}
        >
          <div className="dialog-heading">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>
                {description || "Tersimpan di perangkat ini."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="btn btn-icon btn-ghost"
              aria-label="Tutup"
            >
              <X size={19} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
