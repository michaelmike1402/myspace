import { useState } from "react";
import { Check, CreditCard, Plus, Repeat } from "lucide-react";
import { useApp, change, announce } from "../lib/store";
import {
  addDays,
  dateKey,
  formatDate,
  major,
  minor,
  money,
  renewalDate,
  stamp,
  subSchema,
  uid,
  type Currency,
  type Subscription,
} from "../lib/domain";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { CurrencySelect, Empty, Field, Form, num, str } from "./common";
export function SubscriptionEditor({
  sub,
  onClose,
}: {
  sub?: Subscription;
  onClose: () => void;
}) {
  return (
    <Modal
      title={sub ? "Edit subscription" : "Tambah subscription"}
      description="Pengingat muncul di dashboard saat aplikasi dibuka. Pembayaran dicatat manual."
      onClose={onClose}
    >
      <Form
        onSave={async (f) => {
          const currency = str(f, "currency") as Currency;
          const anchor = str(f, "anchor"),
            cycle = str(f, "cycle"),
            every = num(f, "every");
          const changed =
            sub &&
            (anchor !== sub.anchor ||
              cycle !== sub.cycle ||
              every !== sub.every);
          const item = subSchema.parse({
            id: sub?.id || uid(),
            name: str(f, "name"),
            amount: minor(num(f, "amount"), currency),
            currency,
            anchor,
            cycle,
            every,
            period: changed ? 0 : sub?.period || 0,
            status: str(f, "status"),
            remindDays: num(f, "remindDays"),
            payments: sub?.payments || [],
          });
          await change((d) => {
            d.subscriptions = sub
              ? d.subscriptions.map((x) => (x.id === sub.id ? item : x))
              : [...d.subscriptions, item];
          });
          onClose();
          announce("Subscription tersimpan.");
        }}
        onDelete={
          sub
            ? async () => {
                await change((d) => {
                  d.subscriptions = d.subscriptions.filter(
                    (x) => x.id !== sub.id,
                  );
                });
                onClose();
              }
            : undefined
        }
      >
        <Field label="Nama layanan">
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={sub?.name}
            placeholder="Contoh: iCloud+"
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field label="Biaya per tagihan">
            <input
              name="amount"
              type="number"
              min="0.01"
              step="any"
              required
              defaultValue={sub ? major(sub.amount, sub.currency) : undefined}
            />
          </Field>
          <Field label="Mata uang">
            <CurrencySelect value={sub?.currency} />
          </Field>
        </div>
        <Field
          label="Tanggal tagihan awal"
          hint="Mengubah tanggal atau siklus akan memulai urutan tagihan baru. Riwayat tetap ada."
        >
          <input
            name="anchor"
            type="date"
            required
            defaultValue={sub?.anchor || dateKey()}
          />
        </Field>
        <div className="form-row">
          <Field label="Setiap">
            <input
              name="every"
              type="number"
              min="1"
              max="120"
              required
              defaultValue={sub?.every || 1}
            />
          </Field>
          <Field label="Siklus">
            <select name="cycle" defaultValue={sub?.cycle || "monthly"}>
              <option value="weekly">Minggu</option>
              <option value="monthly">Bulan</option>
              <option value="yearly">Tahun</option>
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Status">
            <select name="status" defaultValue={sub?.status || "active"}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Ingatkan (hari sebelumnya)">
            <input
              name="remindDays"
              type="number"
              min="0"
              max="90"
              required
              defaultValue={sub?.remindDays ?? 3}
            />
          </Field>
        </div>
      </Form>
    </Modal>
  );
}
export function Subscriptions({ compact = false }: { compact?: boolean }) {
  const subs = useApp((s) => s.data!.subscriptions),
    [editor, setEditor] = useState<Subscription | "new" | null>(null),
    [detailId, setDetailId] = useState<string | null>(null),
    [pay, setPay] = useState(false),
    [busy, setBusy] = useState(false);
  const today = dateKey();
  const sorted = [...subs].sort((a, b) =>
    renewalDate(a).localeCompare(renewalDate(b)),
  );
  const detail = subs.find((s) => s.id === detailId);
  const shown = compact
    ? sorted.filter((s) => s.status === "active").slice(0, 3)
    : sorted;
  return (
    <div
      className={
        compact
          ? "compact-content subscriptions"
          : "module-content subscriptions"
      }
    >
      {!compact && (
        <div className="module-toolbar">
          <span className="muted">Manual billing. No surprises.</span>
          <Button onClick={() => setEditor("new")}>
            <Plus size={16} />
            Tambah subscription
          </Button>
        </div>
      )}
      {!shown.length ? (
        <Empty
          icon={<CreditCard size={25} />}
          title="Keep your renewals in sight."
          text="Catat layanan dan tanggal tagihan berikutnya."
          action="Tambah subscription"
          onClick={() => setEditor("new")}
        />
      ) : (
        <div className="subscription-list">
          {shown.map((s) => {
            const due = renewalDate(s);
            const soon =
              s.status === "active" && due <= addDays(today, s.remindDays);
            return (
              <button
                className="subscription-row"
                key={s.id}
                onClick={() => {
                  setDetailId(s.id);
                  setPay(false);
                }}
              >
                <span className="service-icon">
                  {s.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="entry-label">
                  <strong>{s.name}</strong>
                  <small>
                    {s.status !== "active"
                      ? s.status
                      : due < today
                        ? "Lewat tempo"
                        : `Renews ${formatDate(due)}`}
                  </small>
                </div>
                <div className="entry-value">
                  <strong>{money(s.amount, s.currency)}</strong>
                  <small className={soon ? "due-soon" : ""}>
                    {soon
                      ? "Perlu perhatian"
                      : `/ ${s.every > 1 ? s.every + " " : ""}${s.cycle === "monthly" ? "month" : s.cycle === "yearly" ? "year" : "week"}`}
                  </small>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {compact && shown.length > 0 && (
        <div className="widget-footnote">
          <Repeat size={13} />
          Pengingat tagihan aktif di dashboard
        </div>
      )}
      {!compact && (
        <p className="footnote">
          Tagihan tidak dibayar otomatis. Pengingat tersedia ketika aplikasi
          dibuka; tidak ada push notification saat aplikasi tertutup.
        </p>
      )}
      {editor && (
        <SubscriptionEditor
          sub={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {detail && (
        <Modal
          title={detail.name}
          description={`${detail.status} · setiap ${detail.every} ${detail.cycle}`}
          onClose={() => setDetailId(null)}
        >
          <div className="detail-balance">
            <span className="eyebrow">TAGIHAN BERIKUTNYA</span>
            <strong>{money(detail.amount, detail.currency)}</strong>
            <small>
              {formatDate(renewalDate(detail), {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </small>
          </div>
          <div className="action-row">
            <Button
              variant="secondary"
              onClick={() => {
                setDetailId(null);
                setEditor(detail);
              }}
            >
              Edit subscription
            </Button>
            {detail.status === "active" && (
              <Button onClick={() => setPay(true)}>
                <Check size={16} />
                Tandai dibayar
              </Button>
            )}
          </div>
          {pay && (
            <div className="inline-confirm">
              <p>
                Catat pembayaran untuk {renewalDate(detail)} dan majukan satu
                siklus?
              </p>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await change((d) => {
                      const s = d.subscriptions.find(
                        (x) => x.id === detail.id,
                      )!;
                      if (renewalDate(s) !== renewalDate(detail))
                        throw new Error(
                          "Tagihan sudah berubah. Buka kembali detail.",
                        );
                      s.payments.push({
                        id: uid(),
                        due: renewalDate(s),
                        at: new Date().toISOString(),
                        amount: s.amount,
                        currency: s.currency,
                      });
                      s.period++;
                    });
                    setPay(false);
                    announce(
                      "Pembayaran dicatat, tagihan berikutnya diperbarui.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Konfirmasi pembayaran
              </Button>
            </div>
          )}
          <h3 className="section-label">Riwayat pembayaran</h3>
          {[...detail.payments].reverse().map((p) => (
            <div className="history-row" key={p.id}>
              <div>
                <strong>
                  {money(p.amount, p.currency)} · tagihan {p.due}
                </strong>
                <small>{stamp(p.at)}</small>
              </div>
              <Check size={14} />
            </div>
          ))}
          {!detail.payments.length && (
            <p className="muted">Belum ada pembayaran.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
