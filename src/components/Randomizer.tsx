import { useEffect, useRef, useState } from "react";
import { Dices, Pencil, Plus, Shuffle } from "lucide-react";
import { useApp, change, announce } from "../lib/store";
import { randomIndex, randomSchema, uid, type RandomSet } from "../lib/domain";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Empty, Field, Form, str } from "./common";
export function Randomizer({ compact = false }: { compact?: boolean }) {
  const sets = useApp((s) => s.data!.randomizers),
    [selected, setSelected] = useState(""),
    [editor, setEditor] = useState<RandomSet | "new" | null>(null),
    [rolling, setRolling] = useState(false),
    [display, setDisplay] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = sets.find((s) => s.id === selected) || sets[0];
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const roll = () => {
    if (!active || rolling) return;
    const chosen = active.options[randomIndex(active.options.length)];
    setRolling(true);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (let i = 0; i < (reduced ? 0 : 18); i++)
      timers.current.push(
        setTimeout(
          () => setDisplay(active.options[randomIndex(active.options.length)]),
          i * 65 + i * i * 2,
        ),
      );
    timers.current.push(
      setTimeout(
        async () => {
          setDisplay(chosen);
          try {
            await change((d) => {
              const set = d.randomizers.find((s) => s.id === active.id);
              if (set) set.lastResult = chosen;
            });
            announce(`Terpilih: ${chosen}`);
          } finally {
            setRolling(false);
          }
        },
        reduced ? 0 : 1850,
      ),
    );
  };
  return (
    <div
      className={
        compact ? "compact-content randomizer" : "module-content randomizer"
      }
    >
      {!sets.length ? (
        <Empty
          icon={<Dices size={28} />}
          title="Leave a little to chance."
          text="Simpan pilihan. Biarkan satu putaran menentukan."
          action="Buat daftar pilihan"
          onClick={() => setEditor("new")}
        />
      ) : (
        <>
          <div className="random-toolbar">
            <select
              aria-label="Daftar pilihan"
              value={active.id}
              disabled={rolling}
              onChange={(e) => {
                setSelected(e.target.value);
                setDisplay("");
              }}
            >
              {sets.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit daftar"
              disabled={rolling}
              onClick={() => setEditor(active)}
            >
              <Pencil size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tambah daftar"
              disabled={rolling}
              onClick={() => setEditor("new")}
            >
              <Plus size={17} />
            </Button>
          </div>
          <div className={`rolling-window ${rolling ? "is-rolling" : ""}`}>
            <div className="rolling-fade" />
            <span className="roll-marker">›</span>
            <strong aria-live={rolling ? "off" : "polite"}>
              {display || active.lastResult || "Your next possibility."}
            </strong>
            <span className="roll-marker">‹</span>
          </div>
          <div className="random-footer">
            <small>{active.options.length} pilihan · peluang setara</small>
            <Button onClick={roll} disabled={rolling}>
              <Shuffle size={15} />
              {rolling ? "Rolling…" : "Let it roll"}
            </Button>
          </div>
          {!compact && (
            <div className="option-chips">
              {active.options.map((o, i) => (
                <span className="pill" key={i}>
                  {o}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {editor && (
        <Modal
          title={
            editor === "new" ? "Buat daftar pilihan" : "Edit daftar pilihan"
          }
          description="Satu pilihan per baris. Minimal 2, maksimal 100; setiap baris memiliki peluang yang sama."
          onClose={() => setEditor(null)}
        >
          <Form
            onSave={async (f) => {
              const item = randomSchema.parse({
                id: editor === "new" ? uid() : editor.id,
                name: str(f, "name"),
                options: str(f, "options")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                lastResult: editor === "new" ? "" : editor.lastResult,
              });
              await change((d) => {
                d.randomizers =
                  editor === "new"
                    ? [...d.randomizers, item]
                    : d.randomizers.map((x) => (x.id === item.id ? item : x));
              });
              setSelected(item.id);
              setDisplay("");
              setEditor(null);
            }}
            onDelete={
              editor !== "new"
                ? async () => {
                    await change((d) => {
                      d.randomizers = d.randomizers.filter(
                        (s) => s.id !== editor.id,
                      );
                    });
                    setEditor(null);
                    setDisplay("");
                  }
                : undefined
            }
          >
            <Field label="Nama daftar">
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={editor === "new" ? "" : editor.name}
                placeholder="Makan apa hari ini?"
                autoFocus
              />
            </Field>
            <Field label="Pilihan">
              <textarea
                name="options"
                required
                rows={7}
                defaultValue={editor === "new" ? "" : editor.options.join("\n")}
                placeholder={"Noodles\nDumplings\nFried rice"}
              />
            </Field>
          </Form>
        </Modal>
      )}
    </div>
  );
}
