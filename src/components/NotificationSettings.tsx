import { useEffect, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { change, useApp } from "../lib/store";
import { dateSchema, renewalDate } from "../lib/domain";
import { isDebtReminderEligible } from "../lib/notification-sources";
import {
  classLeadMinutes,
  eventLeadDays,
  debtLeadDays,
  readNotificationPermission,
  type NotificationPreferences,
} from "../lib/notification-preferences";

const permissionLabels = {
  default: "Belum diputuskan",
  granted: "Diizinkan browser",
  denied: "Diblokir browser",
  unavailable: "Tidak tersedia di konteks browser ini",
  unknown: "Tidak dapat dibaca",
};

export function NotificationSettings() {
  const data = useApp((state) => state.data!);
  const preferences = data.settings.notifications;
  const [permission, setPermission] = useState(() =>
    readNotificationPermission(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const refresh = () => setPermission(readNotificationPermission());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const update = async (edit: (draft: NotificationPreferences) => void) => {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await change((draft) => {
        edit(draft.settings.notifications);
        draft.settings.notifications.updatedAt = new Date().toISOString();
      });
      setSaved(true);
    } catch {
      setError(
        "Preferensi belum tersimpan. Coba lagi; pilihan sebelumnya tetap berlaku.",
      );
    } finally {
      setBusy(false);
    }
  };
  const categories = [
    {
      id: "timetable",
      title: "Class reminders",
      description: `${data.classes.length} pertemuan bertanggal · memakai tanggal dan jam mulai Timetable.`,
      options: classLeadMinutes,
      unit: "menit",
    },
    {
      id: "subscriptions",
      title: "Subscription reminders",
      description: `${data.subscriptions.filter((sub) => sub.status === "active" && dateSchema.safeParse(renewalDate(sub)).success).length} subscription aktif · memakai tanggal renewal dari siklus saat ini.`,
      options: eventLeadDays,
      unit: "hari",
    },
    {
      id: "countdown",
      title: "Countdown reminders",
      description: `${data.events.length} event · memakai tanggal, waktu, dan pengulangan Countdown Hub.`,
      options: eventLeadDays,
      unit: "hari",
    },
    {
      id: "debts",
      title: "Debt reminders",
      description: `${data.debts.filter(isDebtReminderEligible).length} utang/piutang memenuhi syarat · hanya jatuh tempo valid dan belum lunas.`,
      options: debtLeadDays,
      unit: "hari",
    },
  ] as const;
  return (
    <details className="notification-settings">
      <summary>
        <Bell size={17} aria-hidden="true" />
        <span>Notifications</span>
        <small>Planned</small>
        <ChevronDown
          size={16}
          className="notification-chevron"
          aria-hidden="true"
        />
      </summary>
      <section
        aria-label="Notification preferences"
        className="notification-content"
        aria-busy={busy}
      >
        <p className="notification-notice" id="notification-disclaimer">
          Pengiriman push belum tersedia. Pengaturan ini hanya menyimpan
          preferensi; tidak menjadwalkan atau mengirim notifikasi.
        </p>
        <dl className="notification-status">
          <div>
            <dt>Delivery preference</dt>
            <dd>iPhone Web Push (Planned)</dd>
          </div>
          <div>
            <dt>Izin browser</dt>
            <dd data-testid="notification-permission">
              {permissionLabels[permission]}
            </dd>
          </div>
          <div>
            <dt>Zona waktu pengingat</dt>
            <dd>{preferences.timezone}</dd>
          </div>
        </dl>
        <p className="notification-help">
          Status izin hanya dibaca, bukan diminta. Izin “diizinkan” tidak
          berarti pengiriman sudah aktif.
        </p>
        <label className="notification-toggle notification-master">
          <span>
            <strong>Aktifkan preferensi pengingat</strong>
            <small>Saklar utama untuk konfigurasi mendatang.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Aktifkan preferensi pengingat"
            aria-describedby="notification-disclaimer"
            checked={preferences.enabled}
            disabled={busy}
            onChange={(event) => {
              const enabled = event.target.checked;
              void update((draft) => {
                draft.enabled = enabled;
              });
            }}
          />
        </label>
        {!preferences.enabled && (
          <p className="notification-help">
            Preferensi global nonaktif. Pilihan tiap kategori tetap disimpan.
          </p>
        )}
        <fieldset
          disabled={!preferences.enabled || busy}
          className="notification-categories"
        >
          <legend className="sr-only">Preferensi per kategori</legend>
          {categories.map((category) => {
            const config = preferences.modules[category.id];
            const lead =
              "leadMinutes" in config ? config.leadMinutes : config.leadDays;
            return (
              <div className="notification-category" key={category.id}>
                <label className="notification-toggle">
                  <strong>{category.title}</strong>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={category.title}
                    checked={config.enabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      void update((draft) => {
                        draft.modules[category.id].enabled = enabled;
                      });
                    }}
                  />
                </label>
                <p
                  className="notification-help"
                  id={`notification-${category.id}-source`}
                >
                  {category.description}
                </p>
                <label className="notification-lead">
                  <span>Ingatkan</span>
                  <select
                    aria-label={`Waktu ${category.title}`}
                    aria-describedby={`notification-${category.id}-source`}
                    value={lead}
                    disabled={!config.enabled}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      void update((draft) => {
                        if (category.id === "timetable")
                          draft.modules.timetable.leadMinutes = value;
                        else draft.modules[category.id].leadDays = value;
                      });
                    }}
                  >
                    {category.options.map((value) => (
                      <option key={value} value={value}>
                        {value === 0
                          ? "Pada jatuh tempo"
                          : `${value} ${category.unit} sebelumnya`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </fieldset>
        <p className="notification-help">
          Pengingat tagihan di dashboard tetap memakai pengaturan tiap
          subscription. Preferensi di sini untuk pengiriman mendatang.
        </p>
        <p className="notification-save" role="status">
          {busy
            ? "Menyimpan preferensi…"
            : saved
              ? "Preferensi tersimpan di perangkat ini."
              : "Preferensi disimpan otomatis di perangkat ini."}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </details>
  );
}
