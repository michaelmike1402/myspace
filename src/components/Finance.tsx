import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  History,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { useApp, change, announce } from "../lib/store";
import {
  dateKey,
  debtSchema,
  major,
  minor,
  money,
  payDebt,
  remaining,
  stamp,
  uid,
  type Currency,
  type Debt,
} from "../lib/domain";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { CurrencySelect, Empty, Field, Form, num, str } from "./common";

export function DebtEditor({
  debt,
  kind,
  onClose,
}: {
  debt?: Debt;
  kind: "utang" | "piutang";
  onClose: () => void;
}) {
  return (
    <Modal
      title={
        debt
          ? "Edit catatan"
          : kind === "utang"
            ? "Tambah utang"
            : "Tambah piutang"
      }
      description={
        kind === "utang"
          ? "Uang yang perlu kamu kembalikan."
          : "Uang yang akan dikembalikan kepadamu."
      }
      onClose={onClose}
    >
      <Form
        onSave={async (f) => {
          const currency = str(f, "currency") as Currency;
          const item = debtSchema.parse({
            id: debt?.id || uid(),
            kind,
            person: str(f, "person"),
            reason: str(f, "reason"),
            currency,
            amount: minor(num(f, "amount"), currency),
            due: str(f, "due"),
            createdAt: debt?.createdAt || new Date().toISOString(),
            payments: debt?.payments || [],
          });
          if (debt?.payments.length && currency !== debt.currency)
            throw new Error(
              "Mata uang tidak dapat diubah setelah ada pembayaran.",
            );
          await change((d) => {
            d.debts = debt
              ? d.debts.map((x) => (x.id === debt.id ? item : x))
              : [...d.debts, item];
          });
          onClose();
          announce("Catatan tersimpan.");
        }}
        onDelete={
          debt
            ? async () => {
                await change((d) => {
                  d.debts = d.debts.filter((x) => x.id !== debt.id);
                });
                onClose();
              }
            : undefined
        }
      >
        <Field label="Nama">
          <input
            name="person"
            required
            maxLength={100}
            defaultValue={debt?.person}
            placeholder="Nama orang"
            autoFocus
          />
        </Field>
        <Field label="Alasan">
          <input
            name="reason"
            required
            maxLength={300}
            defaultValue={debt?.reason}
            placeholder="Contoh: makan malam bersama"
          />
        </Field>
        <div className="form-row">
          <Field label="Jumlah awal">
            <input
              name="amount"
              type="number"
              min="0.01"
              step="any"
              required
              defaultValue={
                debt ? major(debt.amount, debt.currency) : undefined
              }
              placeholder="0"
            />
          </Field>
          <Field label="Mata uang">
            <CurrencySelect value={debt?.currency} />
          </Field>
        </div>
        <Field label="Jatuh tempo (opsional)">
          <input name="due" type="date" defaultValue={debt?.due} />
        </Field>
      </Form>
    </Modal>
  );
}
function DebtDetail({
  id,
  onClose,
  onEdit,
}: {
  id: string;
  onClose: () => void;
  onEdit: (d: Debt) => void;
}) {
  const debt = useApp((s) => s.data!.debts.find((d) => d.id === id));
  const [pay, setPay] = useState(false);
  if (!debt) return null;
  const balance = remaining(debt);
  return (
    <Modal
      title={debt.person}
      description={`${debt.kind === "utang" ? "Utang" : "Piutang"} · ${debt.reason}`}
      onClose={onClose}
    >
      <div className="detail-balance">
        <span className="eyebrow">SISA SALDO</span>
        <strong>{money(balance, debt.currency)}</strong>
        <small>
          dari {money(debt.amount, debt.currency)}
          {debt.due && ` · jatuh tempo ${debt.due}`}
        </small>
      </div>
      <div className="action-row">
        <Button variant="secondary" onClick={() => onEdit(debt)}>
          Edit catatan
        </Button>
        {balance > 0 && (
          <Button onClick={() => setPay(!pay)}>
            <Plus size={16} />
            Catat pembayaran
          </Button>
        )}
        {balance === 0 && (
          <span className="pill">
            <Check size={13} />
            Lunas
          </span>
        )}
      </div>
      {pay && (
        <Form
          saveLabel="Simpan pembayaran"
          onSave={async (f) => {
            const amount = minor(num(f, "payment"), debt.currency);
            await change((d) => {
              d.debts = d.debts.map((x) =>
                x.id === id ? payDebt(x, amount, str(f, "note")) : x,
              );
            });
            setPay(false);
            announce("Pembayaran tercatat.");
          }}
        >
          <Field label={`Pembayaran (${debt.currency})`}>
            <input
              name="payment"
              type="number"
              min={debt.currency === "CNY" ? 0.01 : 1}
              max={major(balance, debt.currency)}
              step={debt.currency === "CNY" ? 0.01 : 1}
              defaultValue={major(balance, debt.currency)}
              required
            />
          </Field>
          <Field label="Catatan (opsional)">
            <input name="note" maxLength={500} placeholder="Transfer / tunai" />
          </Field>
          <small>
            Isi seluruh sisa saldo untuk menandai lunas. Timestamp dicatat saat
            disimpan, Asia/Shanghai.
          </small>
        </Form>
      )}
      <h3 className="section-label">Riwayat pembayaran</h3>
      <div className="history-list">
        {[...debt.payments].reverse().map((p) => (
          <div className="history-row" key={p.id}>
            <div>
              <strong>{money(p.amount, debt.currency)}</strong>
              <small>
                {p.note || "Pembayaran"} · {stamp(p.at)}
              </small>
            </div>
            <Check size={15} />
          </div>
        ))}
        {!debt.payments.length && (
          <p className="muted">Belum ada pembayaran.</p>
        )}
        <small>Dibuat {stamp(debt.createdAt)}</small>
      </div>
    </Modal>
  );
}
export function DebtTracker({ compact = false }: { compact?: boolean }) {
  const debts = useApp((s) => s.data!.debts),
    [editor, setEditor] = useState<{
      kind: "utang" | "piutang";
      debt?: Debt;
    } | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [showPaid, setShowPaid] = useState(false);
  return (
    <div className={compact ? "compact-content" : "module-content"}>
      {!compact && (
        <div className="module-toolbar">
          <span className="muted">Setiap pembayaran, tercatat.</span>
          <label className="check-label">
            <input
              type="checkbox"
              checked={showPaid}
              onChange={(e) => setShowPaid(e.target.checked)}
            />
            Tampilkan lunas
          </label>
        </div>
      )}
      <div className="debt-columns">
        {(["utang", "piutang"] as const).map((kind) => {
          const rows = debts.filter(
            (d) => d.kind === kind && (showPaid || remaining(d) > 0),
          );
          return (
            <section className="debt-column" key={kind}>
              <div className="column-heading">
                <span>
                  {kind === "utang" ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownLeft size={16} />
                  )}{" "}
                  {kind === "utang" ? "Utang" : "Piutang"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Tambah ${kind}`}
                  onClick={() => setEditor({ kind })}
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="money-total">
                {money(
                  debts
                    .filter((d) => d.kind === kind && d.currency === "IDR")
                    .reduce((s, d) => s + remaining(d), 0),
                  "IDR",
                )}
              </div>
              <div className="muted small">
                {money(
                  debts
                    .filter((d) => d.kind === kind && d.currency === "CNY")
                    .reduce((s, d) => s + remaining(d), 0),
                  "CNY",
                )}
              </div>
              <div className="debt-entries">
                {rows.slice(0, compact ? 2 : undefined).map((d) => (
                  <button
                    className="debt-entry"
                    key={d.id}
                    onClick={() => setDetail(d.id)}
                  >
                    <span className="avatar">
                      {d.person.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="entry-label">
                      <strong>{d.person}</strong>
                      <small>{d.reason}</small>
                    </span>
                    <span className="entry-value">
                      {remaining(d) === 0
                        ? "Lunas"
                        : money(remaining(d), d.currency)}
                      {d.due && d.due < dateKey() && remaining(d) > 0 && (
                        <small>Lewat tempo</small>
                      )}
                    </span>
                  </button>
                ))}
                {!rows.length && (
                  <p className="quiet-empty">
                    {kind === "utang"
                      ? "Tidak ada utang aktif."
                      : "Tidak ada piutang aktif."}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {!compact && debts.length === 0 && (
        <Empty
          icon={<Wallet size={24} />}
          title="A little clarity for your money."
          text="Catat utang atau piutang pertama dari tombol + di atas."
        />
      )}
      {editor && <DebtEditor {...editor} onClose={() => setEditor(null)} />}{" "}
      {detail && (
        <DebtDetail
          id={detail}
          onClose={() => setDetail(null)}
          onEdit={(debt) => {
            setDetail(null);
            setEditor({ kind: debt.kind, debt });
          }}
        />
      )}
    </div>
  );
}
export function RateEditor({ onClose }: { onClose: () => void }) {
  const settings = useApp((s) => s.data!.settings);
  return (
    <Modal
      title="Kurs bersama"
      description="Satu kurs manual dipakai oleh Quick Convert. Nilai transaksi dan riwayat sebelumnya tetap tersimpan."
      onClose={onClose}
    >
      <Form
        onSave={async (f) => {
          const rate = num(f, "rate");
          if (!Number.isFinite(rate) || rate <= 0 || rate > 1e9)
            throw new Error("Kurs harus lebih dari 0.");
          await change((d) => {
            d.settings.rate = rate;
            d.settings.rateAt = new Date().toISOString();
          });
          onClose();
          announce("Kurs manual diperbarui.");
        }}
      >
        <Field
          label="1 CNY = berapa IDR?"
          hint="Masukkan kurs pilihanmu. Aplikasi tidak mengambil kurs otomatis."
        >
          <input
            name="rate"
            type="number"
            min="0.0001"
            max="1000000000"
            step="any"
            required
            defaultValue={settings.rate || undefined}
            placeholder="Masukkan kurs"
            autoFocus
          />
        </Field>
      </Form>
    </Modal>
  );
}
export function Converter({ compact = false }: { compact?: boolean }) {
  const data = useApp((s) => s.data!),
    [from, setFrom] = useState<Currency>("CNY"),
    [input, setInput] = useState("100"),
    [rateOpen, setRateOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [confirmClear, setConfirmClear] = useState(false);
  const rate = data.settings.rate;
  const value = Number(input);
  const valid =
    input !== "" && Number.isFinite(value) && value >= 0 && value <= 1e12;
  const to = from === "CNY" ? "IDR" : "CNY";
  const output =
    valid && rate ? (from === "CNY" ? value * rate : value / rate) : null;
  return (
    <div
      className={
        compact ? "compact-content converter" : "module-content converter"
      }
    >
      <div className="converter-fields">
        <label className="convert-box">
          <span>
            {from}
            <small>
              {from === "CNY" ? "Chinese Yuan" : "Indonesian Rupiah"}
            </small>
          </span>
          <input
            aria-label="Jumlah konversi"
            type="number"
            min="0"
            max="1000000000000"
            step="any"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <Button
          className="swap-button"
          size="icon"
          variant="secondary"
          aria-label="Tukar mata uang"
          onClick={() => {
            setFrom(to);
            if (output !== null)
              setInput(String(Number(output.toFixed(to === "IDR" ? 0 : 2))));
          }}
        >
          <ArrowLeftRight size={17} />
        </Button>
        <div className="convert-box result">
          <span>
            {to}
            <small>{to === "CNY" ? "Chinese Yuan" : "Indonesian Rupiah"}</small>
          </span>
          <output aria-live="polite">
            {output === null
              ? "—"
              : new Intl.NumberFormat("id-ID", {
                  maximumFractionDigits: to === "IDR" ? 0 : 2,
                }).format(output)}
          </output>
        </div>
      </div>
      <div className="rate-row">
        <button className="text-button" onClick={() => setRateOpen(true)}>
          {rate
            ? `1 CNY = ${new Intl.NumberFormat("id-ID").format(rate)} IDR`
            : "Atur kurs manual"}
          <ArrowUpRight size={12} />
        </button>
        <span className="pill">Manual</span>
      </div>
      {!compact && data.settings.rateAt && (
        <small className="muted">
          Diperbarui {stamp(data.settings.rateAt)}
        </small>
      )}
      <Button
        className="full-width"
        variant="secondary"
        disabled={output === null || busy}
        onClick={async () => {
          if (output === null || !rate) return;
          setBusy(true);
          try {
            await change((d) => {
              d.conversions = [
                {
                  id: uid(),
                  from,
                  input: value,
                  output,
                  rate,
                  at: new Date().toISOString(),
                },
                ...d.conversions,
              ].slice(0, 10000);
            });
            announce("Konversi disimpan ke riwayat.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <History size={15} />
        Simpan konversi
      </Button>
      {!compact && (
        <section className="panel history-panel">
          <div className="section-heading">
            <h3>Conversion history</h3>
            {data.conversions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(true)}
              >
                Bersihkan
              </Button>
            )}
          </div>
          {data.conversions.length === 0 ? (
            <Empty
              title="Your conversions, remembered."
              text="Simpan hasil konversi untuk melihatnya kembali."
            />
          ) : (
            data.conversions.map((c) => (
              <div className="history-row" key={c.id}>
                <div>
                  <strong>
                    {new Intl.NumberFormat("id-ID").format(c.input)} {c.from}{" "}
                    <span className="muted">→</span>{" "}
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 2,
                    }).format(c.output)}{" "}
                    {c.from === "CNY" ? "IDR" : "CNY"}
                  </strong>
                  <small>
                    {stamp(c.at)} · kurs {c.rate} IDR / CNY
                  </small>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Hapus konversi"
                  onClick={() =>
                    void change((d) => {
                      d.conversions = d.conversions.filter(
                        (x) => x.id !== c.id,
                      );
                    })
                  }
                >
                  <X size={14} />
                </Button>
              </div>
            ))
          )}
        </section>
      )}
      {rateOpen && <RateEditor onClose={() => setRateOpen(false)} />}{" "}
      {confirmClear && (
        <Modal
          title="Hapus seluruh riwayat konversi?"
          onClose={() => setConfirmClear(false)}
        >
          <div className="form-footer">
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await change((d) => {
                  d.conversions = [];
                });
                setConfirmClear(false);
              }}
            >
              Hapus riwayat
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
