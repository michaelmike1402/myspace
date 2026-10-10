import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
export function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Button variant="secondary" size="sm" onClick={onClick}>
          <Plus size={14} />
          {action}
        </Button>
      )}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{children}</div>
    </header>
  );
}
export function Form({
  children,
  onSave,
  onDelete,
  saveLabel = "Simpan",
}: {
  children: ReactNode;
  onSave: (data: FormData) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  saveLabel?: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="edit-form">
      {children}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <footer className="form-footer">
        {onDelete && (
          <Button
            variant="ghost"
            aria-label="Hapus"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={16} />
            Hapus
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : saveLabel}
          <ArrowUpRight size={15} />
        </Button>
      </footer>
      {confirm && (
        <Modal
          title="Hapus data ini?"
          description="Tindakan ini akan menghapus data beserta riwayatnya dari perangkat ini."
          onClose={() => setConfirm(false)}
        >
          <div className="form-footer">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete?.();
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                  setConfirm(false);
                }
              }}
            >
              Ya, hapus
            </Button>
          </div>
        </Modal>
      )}
    </form>
  );
}
export const str = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();
export const num = (data: FormData, key: string) => Number(str(data, key));
export function CurrencySelect({
  value = "IDR",
  name = "currency",
}: {
  value?: string;
  name?: string;
}) {
  return (
    <select name={name} defaultValue={value}>
      <option value="IDR">IDR · Rupiah</option>
      <option value="CNY">CNY · Yuan</option>
    </select>
  );
}
