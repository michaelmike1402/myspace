import { useState } from "react";
import { ArrowUpRight, Hourglass, Plus, Repeat } from "lucide-react";
import { useApp, change, announce } from "../lib/store";
import {
  dateKey,
  eventSchema,
  formatDate,
  nextEvent,
  uid,
  type Countdown,
} from "../lib/domain";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Empty, Field, Form, str, useNow } from "./common";
export function CountdownEditor({
  event,
  onClose,
}: {
  event?: Countdown;
  onClose: () => void;
}) {
  return (
    <Modal
      title={event ? "Edit countdown" : "Something to look forward to."}
      description="Semua tanggal dan waktu menggunakan Asia/Shanghai (UTC+8)."
      onClose={onClose}
    >
      <Form
        onSave={async (f) => {
          const item = eventSchema.parse({
            id: event?.id || uid(),
            name: str(f, "name"),
            date: str(f, "date"),
            time: str(f, "time"),
            recurrence: str(f, "recurrence"),
            notes: str(f, "notes"),
          });
          await change((d) => {
            d.events = event
              ? d.events.map((x) => (x.id === event.id ? item : x))
              : [...d.events, item];
          });
          onClose();
          announce("Countdown tersimpan.");
        }}
        onDelete={
          event
            ? async () => {
                await change((d) => {
                  d.events = d.events.filter((x) => x.id !== event.id);
                });
                onClose();
              }
            : undefined
        }
      >
        <Field label="Nama event">
          <input
            name="name"
            required
            maxLength={100}
            placeholder="Apa yang kamu nantikan?"
            defaultValue={event?.name}
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field label="Tanggal">
            <input
              type="date"
              name="date"
              required
              defaultValue={event?.date || dateKey()}
            />
          </Field>
          <Field label="Waktu · UTC+8">
            <input
              type="time"
              name="time"
              required
              defaultValue={event?.time || "09:00"}
            />
          </Field>
        </div>
        <Field label="Pengulangan">
          <select name="recurrence" defaultValue={event?.recurrence || "none"}>
            <option value="none">Sekali saja</option>
            <option value="weekly">Setiap minggu</option>
            <option value="monthly">Setiap bulan</option>
            <option value="yearly">Setiap tahun</option>
          </select>
        </Field>
        <Field label="Catatan">
          <textarea
            name="notes"
            maxLength={2000}
            rows={3}
            defaultValue={event?.notes}
          />
        </Field>
        <small>
          Tanggal 29–31 menyesuaikan akhir bulan; bulan berikutnya kembali ke
          tanggal awal.
        </small>
      </Form>
    </Modal>
  );
}
export function Countdowns({ compact = false }: { compact?: boolean }) {
  const events = useApp((s) => s.data!.events),
    [editor, setEditor] = useState<Countdown | "new" | null>(null),
    now = useNow();
  const sorted = [...events].sort(
    (a, b) => nextEvent(a, now).getTime() - nextEvent(b, now).getTime(),
  );
  const featured = sorted.find((e) => nextEvent(e, now) >= now) || sorted[0];
  const remaining = featured
    ? Math.max(0, nextEvent(featured, now).getTime() - now.getTime())
    : 0;
  const unit = (ms: number, mod?: number) =>
    Math.floor(remaining / ms) % (mod || Infinity);
  return (
    <div
      className={
        compact ? "compact-content countdowns" : "module-content countdowns"
      }
    >
      {!events.length ? (
        <Empty
          icon={<Hourglass size={compact ? 25 : 32} />}
          title="Make time for what matters."
          text="Liburan, ujian, atau hari istimewa berikutnya."
          action="Tambah countdown"
          onClick={() => setEditor("new")}
        />
      ) : (
        <>
          {featured && (
            <button
              className="countdown-feature"
              onClick={() => setEditor(featured)}
            >
              <span className="pill">
                {nextEvent(featured, now) < now
                  ? "Event selesai"
                  : "ON THE HORIZON"}
              </span>
              <div className="countdown-number">
                {unit(86400000)}
                <span>days</span>
              </div>
              <h3>
                {featured.name}
                <ArrowUpRight size={15} />
              </h3>
              <p>
                {formatDate(dateKey(nextEvent(featured, now)), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                · {featured.time}
              </p>
              <div className="countdown-ticks">
                <span>
                  {String(unit(3600000, 24)).padStart(2, "0")}{" "}
                  <small>HRS</small>
                </span>
                <i>:</i>
                <span>
                  {String(unit(60000, 60)).padStart(2, "0")} <small>MIN</small>
                </span>
                <i>:</i>
                <span>
                  {String(unit(1000, 60)).padStart(2, "0")} <small>SEC</small>
                </span>
              </div>
            </button>
          )}
          {!compact && (
            <>
              <div className="section-heading">
                <h3>All your moments</h3>
                <Button size="sm" onClick={() => setEditor("new")}>
                  <Plus size={15} />
                  Tambah event
                </Button>
              </div>
              <div className="event-grid">
                {sorted.map((e) => {
                  const target = nextEvent(e, now);
                  const days = Math.ceil(
                    (target.getTime() - now.getTime()) / 86400000,
                  );
                  return (
                    <button
                      key={e.id}
                      className="panel event-card"
                      onClick={() => setEditor(e)}
                    >
                      <div>
                        <strong>{e.name}</strong>
                        <small>
                          {formatDate(dateKey(target))} · {e.time}
                          {e.recurrence !== "none" && <Repeat size={12} />}
                        </small>
                        {e.notes && <p>{e.notes}</p>}
                      </div>
                      <span>{days < 0 ? "Selesai" : `${days}d`}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {compact && (
            <button
              className="text-button add-inline"
              onClick={() => setEditor("new")}
            >
              <Plus size={14} />
              Tambah event
            </button>
          )}
        </>
      )}
      {editor && (
        <CountdownEditor
          event={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
