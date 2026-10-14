import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { type Command, searchCommands } from "../lib/commands";
import { Modal } from "./ui/dialog";

export function CommandPalette({
  commands,
  onExecute,
  onClose,
}: {
  commands: Command[];
  onExecute: (command: Command) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const results = searchCommands(commands, query);
  const active = Math.min(selected, Math.max(0, results.length - 1));
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, query]);
  return (
    <Modal
      title="Search & commands"
      description="Cari tujuan atau jalankan aksi · Indonesia / English"
      onClose={onClose}
      className="command-palette"
    >
      <div className="command-search">
        <Search size={21} aria-hidden="true" />
        <input
          autoFocus
          role="combobox"
          aria-label="Cari perintah"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={
            results.length ? `command-${results[active].id}` : undefined
          }
          placeholder="Jadwal, add debt, catatan…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (results.length)
                setSelected(
                  (active +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    results.length) %
                    results.length,
                );
            }
            if (event.key === "Enter" && results[active]) {
              event.preventDefault();
              onExecute(results[active]);
            }
          }}
        />
      </div>
      <div
        id="command-results"
        role="listbox"
        aria-label="Hasil perintah"
        className="command-results"
        ref={list}
      >
        {results.map((command, index) => (
          <div
            key={command.id}
            id={`command-${command.id}`}
            role="option"
            aria-selected={index === active}
            className="command-option"
            onPointerMove={() => setSelected(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onExecute(command)}
          >
            <span>
              <strong>{command.title}</strong>
              <small>{command.category}</small>
            </span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </div>
        ))}
      </div>
      {!results.length && (
        <p className="command-empty" role="status">
          Tidak ada hasil. Coba “jadwal”, “add debt”, atau “catatan”.
        </p>
      )}
      <footer className="command-footer">
        <span>↑ ↓ pilih · Enter buka</span>
        <span>Esc tutup</span>
      </footer>
    </Modal>
  );
}
