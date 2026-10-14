import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { ModuleId } from "../lib/domain";
import {
  createCommands,
  type Command,
  type QuickEditor,
} from "../lib/commands";
import { DebtEditor } from "./Finance";
import { CountdownEditor } from "./Countdowns";
import { SubscriptionEditor } from "./Subscriptions";
import { CommandPalette } from "./CommandPalette";
import { FloatingCapture } from "./FloatingCapture";
import { QuickNotes } from "./QuickNotes";
import { ModalReturnFocus } from "./ui/dialog";

export function GlobalActions({
  navigate,
}: {
  navigate: (page: ModuleId | "dashboard") => void;
}) {
  const [overlay, setOverlay] = useState<QuickEditor | "search" | null>(null);
  const [launcher, setLauncher] = useState<HTMLElement | null>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const commands = createCommands({ navigate, openEditor: setOverlay });
  const openSearch = () => {
    setLauncher(searchButton.current);
    setOverlay("search");
  };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.key.toLowerCase() !== "k" ||
        event.isComposing ||
        event.repeat
      )
        return;
      event.preventDefault();
      // Keep an in-progress editor intact. Escape returns to the global tools.
      if (document.querySelector('[role="dialog"]') && overlay !== "search")
        return;
      if (overlay === "search") setOverlay(null);
      else openSearch();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [overlay]);
  const close = () => setOverlay(null);
  const execute = (command: Command) => {
    setOverlay(null);
    command.action();
    if (command.category === "Navigasi")
      requestAnimationFrame(() =>
        document.getElementById("main-content")?.focus({ preventScroll: true }),
      );
  };
  return (
    <ModalReturnFocus.Provider value={launcher}>
      <button
        ref={searchButton}
        className="search-launcher"
        aria-label="Buka pencarian dan perintah"
        aria-keyshortcuts="Control+k Meta+k"
        onClick={openSearch}
      >
        <Search size={18} aria-hidden="true" />
        <span>Search</span>
        <kbd>⌘ / Ctrl K</kbd>
      </button>
      <FloatingCapture
        commands={commands}
        onExecute={execute}
        onLaunch={setLauncher}
      />
      {overlay === "search" && (
        <CommandPalette
          commands={commands}
          onExecute={execute}
          onClose={close}
        />
      )}
      {overlay === "debt" && <DebtEditor kind="utang" onClose={close} />}
      {overlay === "countdown" && <CountdownEditor onClose={close} />}
      {overlay === "subscription" && <SubscriptionEditor onClose={close} />}
      {overlay === "note" && <QuickNotes onClose={close} />}
    </ModalReturnFocus.Provider>
  );
}
