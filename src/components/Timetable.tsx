import { lazy, Suspense, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import { useApp, change, announce } from "../lib/store";
import {
  addDays,
  classIssues,
  classSchema,
  dateKey,
  formatDate,
  localInstant,
  monday,
  nextClass,
  timingMatches,
  uid,
  type ClassSession,
} from "../lib/domain";
import { courseEnglish, master } from "../data/seed";
import { findBuilding, timingSource } from "../data/buildings";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import { Empty, Field, Form, str, useNow } from "./common";
const CampusMap = lazy(() =>
  import("./CampusMap").then((module) => ({ default: module.CampusMap })),
);
const instructors: Record<string, string> = {
  马骏: "Mǎ Jùn",
  曹海龙: "Cáo Hǎilóng",
  李寅: "Lǐ Yín",
  刘李明: "Liú Lǐmíng",
  刘宝魏: "Liú Bǎowèi",
};
function ClassEditor({
  session,
  onClose,
}: {
  session?: ClassSession;
  onClose: () => void;
}) {
  const [scope, setScope] = useState("single");
  return (
    <Modal
      title={session ? "Edit kelas" : "Tambah kelas"}
      description="Jadwal disimpan per tanggal. Semua jam menggunakan Asia/Shanghai (UTC+8)."
      onClose={onClose}
    >
      <Form
        onSave={async (f) => {
          const id = session?.id || uid();
          const item = classSchema.parse({
            id,
            seriesId: session?.seriesId || id,
            course: str(f, "course"),
            pinyin: str(f, "pinyin"),
            instructor: str(f, "instructor"),
            building: str(f, "building"),
            room: str(f, "room"),
            date: str(f, "date"),
            start: str(f, "start"),
            end: str(f, "end"),
            source: session?.source || "Ditambahkan manual",
            verified: f.get("verified") === "on",
            notes: str(f, "notes"),
          });
          await change((d) => {
            if (!session) d.classes.push(item);
            else
              d.classes = d.classes.map((c) => {
                if (scope === "series" && c.seriesId === session.seriesId)
                  return { ...item, id: c.id, date: c.date };
                return c.id === session.id ? item : c;
              });
          });
          onClose();
          announce(
            scope === "series"
              ? "Kelas pada seluruh tanggal yang tersimpan diperbarui."
              : "Kelas tersimpan.",
          );
        }}
        onDelete={
          session
            ? async () => {
                await change((d) => {
                  d.classes = d.classes.filter((c) =>
                    scope === "series"
                      ? c.seriesId !== session.seriesId
                      : c.id !== session.id,
                  );
                });
                onClose();
              }
            : undefined
        }
      >
        {session && (
          <Field label="Terapkan ke">
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="single">
                Pertemuan ini saja · {session.date}
              </option>
              <option value="series">
                Semua tanggal yang sudah tersimpan dalam seri ini
              </option>
            </select>
          </Field>
        )}
        <Field label="Nama mata kuliah / Hanzi">
          <input
            name="course"
            required
            maxLength={200}
            defaultValue={session?.course}
            autoFocus
          />
        </Field>
        <Field label="Pinyin">
          <input
            name="pinyin"
            maxLength={300}
            defaultValue={session?.pinyin}
            placeholder="Tambahkan pinyin"
          />
        </Field>
        <Field label="Dosen">
          <input
            name="instructor"
            maxLength={200}
            defaultValue={session?.instructor}
          />
        </Field>
        <div className="form-row">
          <Field label="Gedung">
            <input
              name="building"
              list="buildings"
              maxLength={100}
              defaultValue={session?.building}
            />
            <datalist id="buildings">
              <option>电机楼</option>
              <option>正心</option>
              <option>致知</option>
            </datalist>
          </Field>
          <Field label="Ruang">
            <input name="room" maxLength={100} defaultValue={session?.room} />
          </Field>
        </div>
        <Field
          label="Tanggal"
          hint={
            scope === "series"
              ? "Setiap tanggal asli dipertahankan. Tidak ada pertemuan baru yang ditambahkan."
              : undefined
          }
        >
          <input
            name="date"
            type="date"
            required
            readOnly={scope === "series"}
            defaultValue={session?.date || dateKey()}
          />
        </Field>
        <div className="form-row">
          <Field label="Mulai">
            <input
              name="start"
              type="time"
              required
              defaultValue={session?.start || "08:00"}
            />
          </Field>
          <Field label="Selesai">
            <input
              name="end"
              type="time"
              required
              defaultValue={session?.end || "09:45"}
            />
          </Field>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            name="verified"
            defaultChecked={session?.verified}
          />
          Saya telah mengonfirmasi jam kelas ini
        </label>
        <Field label="Catatan">
          <textarea
            name="notes"
            rows={2}
            maxLength={2000}
            defaultValue={session?.notes}
          />
        </Field>
      </Form>
    </Modal>
  );
}
export function ClassDetail({
  session,
  onClose,
  onEdit,
}: {
  session: ClassSession;
  onClose: () => void;
  onEdit: (c: ClassSession) => void;
}) {
  const building = findBuilding(session.building);
  return (
    <Modal
      title={session.course}
      description={session.pinyin || courseEnglish[session.course]}
      onClose={onClose}
      wide
    >
      <div className="class-detail-grid">
        <div>
          <p className="course-translation">
            {courseEnglish[session.course] || "Class details"}
          </p>
          <div className="detail-info">
            <div>
              <CalendarDays size={17} />
              <span>
                {formatDate(session.date, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <Clock3 size={17} />
              <span>
                {session.start}–{session.end} <small>Asia/Shanghai</small>
              </span>
            </div>
            <div>
              <MapPin size={17} />
              <span>
                {building?.name || session.building} · {session.room}
                <small>{building?.pinyin}</small>
              </span>
            </div>
            <div>
              <span className="avatar small-avatar">
                {session.instructor.slice(0, 1)}
              </span>
              <span>
                {session.instructor}
                <small>{instructors[session.instructor]}</small>
              </span>
            </div>
          </div>
          <div className="verification-note">
            <Info size={16} />
            <p>
              {session.verified
                ? "Jam dikonfirmasi oleh pengguna."
                : timingMatches(session)
                  ? "Jam cocok dengan panduan HIT 2022. Penerapannya pada semester 2026 belum dikonfirmasi."
                  : "Jam ini berbeda dari pasangan periode panduan HIT 2022. Periksa jam khusus dengan jadwal kampus."}
              <a href={timingSource} target="_blank" rel="noreferrer">
                Lihat panduan · halaman cetak 162 <ArrowUpRight size={11} />
              </a>
            </p>
          </div>
          {session.notes && <p className="class-notes">{session.notes}</p>}
          <details className="source-details">
            <summary>Teks sumber jadwal</summary>
            <p>{session.source}</p>
            <small>
              Rentang minggu pada teks sumber tidak otomatis menambah tanggal di
              luar master.
            </small>
          </details>
          <Button variant="secondary" onClick={() => onEdit(session)}>
            <Pencil size={14} />
            Edit kelas
          </Button>
        </div>
        <Suspense
          fallback={
            <div className="map-placeholder">Membuka peta tersimpan…</div>
          }
        >
          <CampusMap building={session.building} />
        </Suspense>
      </div>
    </Modal>
  );
}
export function Timetable({
  compact = false,
  onOpen,
}: {
  compact?: boolean;
  onOpen?: () => void;
}) {
  const classes = useApp((s) => s.data!.classes),
    now = useNow(),
    today = dateKey(now);
  const upcoming = nextClass(classes, now);
  const [week, setWeek] = useState(() => monday(upcoming?.date || today)),
    [day, setDay] = useState(upcoming?.date || today),
    [detail, setDetail] = useState<ClassSession | null>(null),
    [editor, setEditor] = useState<ClassSession | "new" | null>(null),
    [sourceOpen, setSourceOpen] = useState(false);
  const issues = useMemo(() => classIssues(classes), [classes]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const weekClasses = classes
    .filter((c) => c.date >= week && c.date <= addDays(week, 6))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const semesterWeek =
    7 +
    Math.round(
      (Date.parse(week) - Date.parse(master.coverage.from)) / (7 * 86400000),
    );
  const inCoverage =
    week >= master.coverage.from && week <= master.coverage.through;
  const navigate = (n: number) => {
    const next = addDays(week, n * 7);
    setWeek(next);
    setDay(next);
  };
  const card = (c: ClassSession) => (
    <button
      key={c.id}
      className={`class-card ${c.date === today ? "class-today" : ""}`}
      onClick={() => setDetail(c)}
    >
      <span className="class-time">
        {c.start} <span>— {c.end}</span>
        {issues.has(c.id) && (
          <span className="uncertain-dot" title={issues.get(c.id)?.join(" ")} />
        )}
      </span>
      <strong>{c.course}</strong>
      <span className="class-pinyin">{c.pinyin}</span>
      <span className="class-location">
        <MapPin size={11} />
        {c.building} {c.room}
      </span>
      {issues.get(c.id)?.some((x) => x.startsWith("Bertabrakan")) && (
        <span className="conflict-label">Jadwal bertabrakan</span>
      )}
    </button>
  );
  return (
    <div
      className={
        compact
          ? "compact-content timetable-compact"
          : "module-content timetable"
      }
    >
      {compact ? (
        <>
          <div className="next-class-label">
            <span className="pill">
              <span className="status-dot" />
              {upcoming && localInstant(upcoming.date, upcoming.start) <= now
                ? "IN CLASS NOW"
                : "NEXT CLASS"}
            </span>
            <span>
              {upcoming
                ? `${formatDate(upcoming.date, { weekday: "short", day: "numeric", month: "short" })} · ${upcoming.start}`
                : "Asia/Shanghai"}
            </span>
          </div>
          {upcoming ? (
            <button className="next-class" onClick={() => setDetail(upcoming)}>
              <div>
                <span className="next-class-english">
                  {courseEnglish[upcoming.course] || "Your next class"}
                </span>
                <h3>{upcoming.course}</h3>
                <p>{upcoming.pinyin}</p>
                <div className="next-class-meta">
                  <span>
                    <MapPin size={14} />
                    {upcoming.building} · {upcoming.room}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {upcoming.start}–{upcoming.end}
                  </span>
                </div>
              </div>
              <div className="class-art" aria-hidden="true">
                <div />
                <div />
                <div />
                <span>学</span>
              </div>
              <ArrowUpRight className="next-class-arrow" size={20} />
            </button>
          ) : (
            <Empty
              icon={<CalendarDays size={25} />}
              title="A little breathing room."
              text="Tidak ada kelas mendatang pada tanggal yang tersimpan."
            />
          )}
          <div className="week-mini">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setWeek(monday(d));
                  setDay(d);
                  onOpen?.();
                }}
                className={d === today ? "today" : ""}
              >
                <span>{formatDate(d, { weekday: "short" })}</span>
                <strong>{d.slice(-2)}</strong>
                <div className="day-dots">
                  {classes
                    .filter((c) => c.date === d)
                    .slice(0, 4)
                    .map((c) => (
                      <i key={c.id} />
                    ))}
                </div>
              </button>
            ))}
          </div>
          <div className="widget-footnote">
            <Info size={13} />
            Jam semester perlu konfirmasi{" "}
            <button className="text-button" onClick={() => setSourceOpen(true)}>
              Sumber
              <ArrowUpRight size={11} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="timetable-toolbar">
            <div className="week-navigation">
              <Button
                size="icon"
                variant="secondary"
                aria-label="Minggu sebelumnya"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={17} />
              </Button>
              <div>
                <strong>
                  {formatDate(week)} —{" "}
                  {formatDate(addDays(week, 6), {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
                <small>
                  {inCoverage
                    ? `Semester week ${semesterWeek}`
                    : "Di luar cakupan master"}{" "}
                  · Asia/Shanghai
                </small>
              </div>
              <Button
                size="icon"
                variant="secondary"
                aria-label="Minggu berikutnya"
                onClick={() => navigate(1)}
              >
                <ChevronRight size={17} />
              </Button>
            </div>
            <div className="action-row">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setWeek(monday(today));
                  setDay(today);
                }}
              >
                Today
              </Button>
              <label className="date-jump">
                <CalendarDays size={15} />
                <input
                  aria-label="Lompat ke tanggal"
                  type="date"
                  value={week}
                  onChange={(e) => {
                    if (e.target.value) {
                      setWeek(monday(e.target.value));
                      setDay(e.target.value);
                    }
                  }}
                />
              </label>
              <Button size="sm" onClick={() => setEditor("new")}>
                <Plus size={15} />
                Kelas
              </Button>
            </div>
          </div>
          <div className="schedule-notice">
            <Info size={15} />
            <p>
              Master mencakup 12 Okt–6 Des 2026.{" "}
              {weekClasses.filter((c) => !c.verified).length > 0
                ? `${weekClasses.filter((c) => !c.verified).length} jam kelas minggu ini perlu konfirmasi.`
                : "Tanggal tersimpan ditampilkan apa adanya."}
            </p>
            <button onClick={() => setSourceOpen(true)} className="text-button">
              Sumber
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="week-day-tabs">
            {days.map((d) => (
              <button
                key={d}
                className={`${day === d ? "selected" : ""} ${d === today ? "is-today" : ""}`}
                onClick={() => setDay(d)}
              >
                <span>{formatDate(d, { weekday: "short" })}</span>
                <strong>{d.slice(-2)}</strong>
                <i>{classes.filter((c) => c.date === d).length || "·"}</i>
              </button>
            ))}
          </div>
          <div className="week-grid">
            {days.map((d) => (
              <section
                key={d}
                className={`day-column ${day === d ? "mobile-active" : ""}`}
              >
                <header>
                  <span>{formatDate(d, { weekday: "short" })}</span>
                  <strong className={d === today ? "today-number" : ""}>
                    {d.slice(-2)}
                  </strong>
                </header>
                <div className="day-classes">
                  {weekClasses.filter((c) => c.date === d).map(card)}
                  {!weekClasses.some((c) => c.date === d) && (
                    <div className="day-free">
                      <span>—</span>
                      <small>No classes</small>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
          {!weekClasses.length && (
            <Empty
              title="Nothing on the timetable."
              text={
                inCoverage
                  ? "Tidak ada pertemuan tersimpan untuk minggu ini."
                  : "Minggu ini berada di luar data awal. Kamu dapat menambahkan kelas dengan tanggal pasti."
              }
            />
          )}
          <div className="timetable-footer">
            <span>
              {weekClasses.length} pertemuan ·{" "}
              {new Set(weekClasses.map((c) => c.course)).size} mata kuliah
            </span>
            <span>
              <i className="uncertain-dot" /> Jam belum dikonfirmasi
            </span>
          </div>
        </>
      )}
      {detail && (
        <ClassDetail
          session={classes.find((c) => c.id === detail.id) || detail}
          onClose={() => setDetail(null)}
          onEdit={(c) => {
            setDetail(null);
            setEditor(c);
          }}
        />
      )}
      {editor && (
        <ClassEditor
          session={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {sourceOpen && (
        <Modal
          title="Tentang jadwal awal"
          description="HIT · Autumn 2026 · Asia/Shanghai"
          onClose={() => setSourceOpen(false)}
        >
          <div className="prose">
            <p>
              {classes.length} pertemuan saat ini. Master berisi tanggal
              eksplisit untuk minggu 7–14; teks minggu yang lebih panjang tidak
              dijadikan pengulangan.
            </p>
            <p>
              Jam 08:00–09:45, 10:00–11:45, 13:45–15:30, dan 15:45–17:30 cocok
              dengan panduan resmi HIT tahun 2022 (halaman cetak 162). Belum ada
              konfirmasi khusus semester 2026; setiap kelas awal ditandai belum
              dikonfirmasi.
            </p>
            <p>
              Hanzi mengikuti master. Pinyin disediakan sebagai bantuan baca;
              pelafalan nama pribadi dapat berbeda.
            </p>
            <a href={timingSource} target="_blank" rel="noreferrer">
              Panduan resmi HIT 2022 <ArrowUpRight size={13} />
            </a>
            <a href={master.time_source} target="_blank" rel="noreferrer">
              Tautan sumber pada master <ArrowUpRight size={13} />
            </a>
            <p>
              Pin peta menggunakan data publik yang dicantumkan pada detail
              gedung. Tidak ada foto gedung yang ditambahkan tanpa izin
              penggunaan.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
