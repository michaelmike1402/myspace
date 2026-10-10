import { useRef, useState } from "react";
import { Download, HardDrive, Laptop, Moon, Sun, Upload } from "lucide-react";
import { useApp, change, replaceData, announce } from "../lib/store";
import { parseBackup, dateKey, type AppData } from "../lib/domain";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Field } from "./common";
export function exportBackup(data: AppData) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `myspace-backup-${dateKey()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function Settings({
  onClose,
  install,
}: {
  onClose: () => void;
  install?: () => void;
}) {
  const data = useApp((s) => s.data!),
    file = useRef<HTMLInputElement>(null),
    [preview, setPreview] = useState<AppData | null>(null),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [persistent, setPersistent] = useState("");
  return (
    <Modal
      title="Make yourself at home."
      description="Preferensi dan backup untuk ruang pribadimu."
      onClose={onClose}
    >
      <div className="settings-content">
        <Field label="Nama panggilan">
          <input
            maxLength={50}
            placeholder="Nama kamu (opsional)"
            defaultValue={data.settings.name}
            onBlur={(e) => {
              const name = e.target.value;
              if (name !== data.settings.name)
                void change((d) => {
                  d.settings.name = name;
                });
            }}
          />
        </Field>
        <h3 className="section-label">APPEARANCE</h3>
        <div className="theme-options">
          {(
            [
              { id: "dark", name: "Dark", Icon: Moon },
              { id: "light", name: "Light", Icon: Sun },
              { id: "system", name: "System", Icon: Laptop },
            ] as const
          ).map(({ id, name, Icon }) => (
            <button
              aria-pressed={data.settings.theme === id}
              className={data.settings.theme === id ? "selected" : ""}
              key={id}
              onClick={() =>
                void change((d) => {
                  d.settings.theme = id;
                })
              }
            >
              <Icon size={19} />
              {name}
            </button>
          ))}
        </div>
        <h3 className="section-label">YOUR DATA, YOUR DEVICE</h3>
        <div className="storage-note">
          <HardDrive size={20} />
          <p>
            Data disimpan di IndexedDB pada browser ini. Perangkat atau browser
            lain memiliki data tersendiri. Ekspor backup untuk memindahkannya.
          </p>
        </div>
        <div className="backup-actions">
          <Button
            variant="secondary"
            onClick={() => {
              exportBackup(data);
              announce("Backup JSON diekspor.");
            }}
          >
            <Download size={16} />
            Export backup
          </Button>
          <Button variant="secondary" onClick={() => file.current?.click()}>
            <Upload size={16} />
            Import backup
          </Button>
          <input
            ref={file}
            hidden
            type="file"
            accept=".json,application/json"
            aria-label="File backup"
            onChange={async (e) => {
              setError("");
              setConfirmed(false);
              const selected = e.target.files?.[0];
              e.target.value = "";
              if (!selected) return;
              if (selected.size > 10_000_000) {
                setError("Backup maksimal 10 MB.");
                return;
              }
              try {
                setPreview(parseBackup(await selected.text()));
              } catch (e) {
                setPreview(null);
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {preview && (
          <section className="import-preview">
            <h3>Preview backup</h3>
            <p>
              {preview.classes.length} kelas · {preview.debts.length}{" "}
              utang/piutang · {preview.events.length} countdown ·{" "}
              {preview.subscriptions.length} subscription ·{" "}
              {preview.randomizers.length} daftar pilihan ·{" "}
              {preview.conversions.length} konversi
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Ganti semua data di perangkat ini dengan backup tersebut.
            </label>
            <div className="action-row">
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Batal
              </Button>
              <Button
                disabled={!confirmed || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    exportBackup(data);
                    await replaceData(preview);
                    setPreview(null);
                    announce(
                      "Backup diimpor. Salinan data sebelumnya juga diekspor.",
                    );
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Import dan ganti data
              </Button>
            </div>
          </section>
        )}
        <button
          className="text-button"
          onClick={async () => {
            const granted = await navigator.storage?.persist?.();
            setPersistent(
              granted
                ? "Penyimpanan persisten diizinkan browser."
                : "Browser belum mengizinkan penyimpanan persisten. Tetap simpan backup secara berkala.",
            );
          }}
        >
          Minta penyimpanan persisten <HardDrive size={13} />
        </button>
        {persistent && <p className="small muted">{persistent}</p>}
        <h3 className="section-label">INSTALL MYSPACE</h3>
        {install ? (
          <Button variant="secondary" onClick={install}>
            Install aplikasi
          </Button>
        ) : (
          <p className="small muted">
            iPhone: buka melalui Safari → Share → Add to Home Screen. Desktop:
            gunakan tombol install di address bar browser jika tersedia. Buka
            sekali saat online agar aplikasi siap offline.
          </p>
        )}
        <div className="settings-bottom">
          <span>MYSPACE v1.0</span>
          <span>Asia/Shanghai · UTC+8</span>
        </div>
      </div>
    </Modal>
  );
}
