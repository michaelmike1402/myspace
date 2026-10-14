import { useEffect, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ArrowLeftRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Dices,
  Grip,
  Hourglass,
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import { initialize, useApp, change } from "./lib/store";
import {
  addDays,
  dateKey,
  formatDate,
  moduleIds,
  nextClass,
  renewalDate,
  type ModuleId,
} from "./lib/domain";
import { Button } from "./components/ui/button";
import { PageTitle, useNow } from "./components/common";
import { Settings } from "./components/Settings";
import { Timetable } from "./components/Timetable";
import { DebtTracker, Converter } from "./components/Finance";
import { Countdowns } from "./components/Countdowns";
import { Subscriptions } from "./components/Subscriptions";
import { Randomizer } from "./components/Randomizer";
import { GlobalActions } from "./components/GlobalActions";

const modules = {
  timetable: {
    title: "Timetable",
    subtitle: "A little structure for your week.",
    eyebrow: "YOUR TIME",
    Icon: CalendarDays,
  },
  debts: {
    title: "Debt tracker",
    subtitle: "Know what you owe. Remember what comes back.",
    eyebrow: "YOUR MONEY",
    Icon: Wallet,
  },
  convert: {
    title: "Quick convert",
    subtitle: "Two currencies. One less thing to think about.",
    eyebrow: "IDR ⇄ CNY",
    Icon: ArrowLeftRight,
  },
  countdown: {
    title: "Countdown hub",
    subtitle: "Good things are on the horizon.",
    eyebrow: "YOUR MOMENTS",
    Icon: Hourglass,
  },
  subscriptions: {
    title: "Subscriptions",
    subtitle: "Keep the little recurring things in view.",
    eyebrow: "YOUR RENEWALS",
    Icon: CreditCard,
  },
  randomizer: {
    title: "Randomizer",
    subtitle: "For the days when choosing is the hard part.",
    eyebrow: "A LITTLE CHANCE",
    Icon: Dices,
  },
};
type Page = "dashboard" | ModuleId;
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function Widget({
  id,
  editing,
  children,
  onOpen,
}: {
  id: ModuleId;
  editing: boolean;
  children: ReactNode;
  onOpen: () => void;
}) {
  const widgets = useApp((s) => s.data!.settings.widgets),
    widget = widgets.find((w) => w.id === id)!;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });
  const { title, Icon } = modules[id];
  const position = widgets.findIndex((w) => w.id === id);
  const move = async (direction: number) =>
    change((d) => {
      const index = d.settings.widgets.findIndex((w) => w.id === id);
      d.settings.widgets = arrayMove(
        d.settings.widgets,
        index,
        Math.max(0, Math.min(d.settings.widgets.length - 1, index + direction)),
      );
    });
  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`widget panel ${widget.size === "wide" ? "wide" : ""} ${isDragging ? "dragging" : ""}`}
      data-widget={id}
    >
      <header className="widget-header">
        <h2>
          <Icon size={17} />
          {title}
        </h2>
        {editing ? (
          <div className="widget-edit-controls">
            <button
              className="drag-handle"
              aria-label={`Drag ${title}`}
              {...attributes}
              {...listeners}
            >
              <Grip size={17} />
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Pindah ${title} ke atas`}
              disabled={position === 0}
              onClick={() => void move(-1)}
            >
              <ArrowUp size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Pindah ${title} ke bawah`}
              disabled={position === widgets.length - 1}
              onClick={() => void move(1)}
            >
              <ArrowDown size={14} />
            </Button>
            <select
              aria-label={`Ukuran ${title}`}
              value={widget.size}
              onChange={(e) => {
                const size = e.target.value as "normal" | "wide";
                void change((d) => {
                  d.settings.widgets.find((w) => w.id === id)!.size = size;
                });
              }}
            >
              <option value="normal">Normal</option>
              <option value="wide">Wide</option>
            </select>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Buka ${title}`}
            onClick={onOpen}
          >
            <ArrowUpRight size={17} />
          </Button>
        )}
      </header>
      {children}
    </section>
  );
}
function ModuleContent({
  id,
  compact = false,
  onOpen,
}: {
  id: ModuleId;
  compact?: boolean;
  onOpen?: () => void;
}) {
  switch (id) {
    case "timetable":
      return <Timetable compact={compact} onOpen={onOpen} />;
    case "debts":
      return <DebtTracker compact={compact} />;
    case "convert":
      return <Converter compact={compact} />;
    case "countdown":
      return <Countdowns compact={compact} />;
    case "subscriptions":
      return <Subscriptions compact={compact} />;
    case "randomizer":
      return <Randomizer compact={compact} />;
  }
}
export default function App() {
  const { data, ready, error, notice, setNotice } = useApp(),
    [page, setPage] = useState<Page>(() =>
      moduleIds.includes(location.hash.slice(1) as ModuleId)
        ? (location.hash.slice(1) as ModuleId)
        : "dashboard",
    ),
    [settings, setSettings] = useState(false),
    [editing, setEditing] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const now = useNow();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  useEffect(() => {
    void initialize();
    const onHash = () => {
      const id = location.hash.slice(1);
      setPage(
        moduleIds.includes(id as ModuleId) ? (id as ModuleId) : "dashboard",
      );
    };
    const network = () => setOnline(navigator.onLine);
    const install = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("beforeinstallprompt", install);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        data.settings.theme === "dark" ||
        (data.settings.theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#111113" : "#f7f7f8");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data?.settings.theme]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice, setNotice]);
  const go = (target: Page) => {
    location.hash = target;
    setPage(target);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (!ready)
    return (
      <div className="app-loading">
        <div className="brand-mark">M</div>
        <p>Making space for your day.</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="app-loading">
        <h1>MYSPACE</h1>
        <p role="alert">{error || "Data belum tersedia."}</p>
        <p>
          Izinkan penyimpanan browser, lalu muat ulang. Data yang sudah ada
          tidak dihapus.
        </p>
        <Button onClick={() => location.reload()}>Coba lagi</Button>
      </div>
    );
  const today = dateKey(now),
    time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now),
    hour = Number(time.slice(0, 2));
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const next = nextClass(data.classes, now);
  const todaysClasses = data.classes.filter((c) => c.date === today);
  const reminders = data.subscriptions.filter(
    (s) =>
      s.status === "active" && renewalDate(s) <= addDays(today, s.remindDays),
  );
  const visible = data.settings.widgets.filter((w) => w.visible);
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      void change((d) => {
        const widgets = d.settings.widgets;
        d.settings.widgets = arrayMove(
          widgets,
          widgets.findIndex((w) => w.id === active.id),
          widgets.findIndex((w) => w.id === over.id),
        );
      });
  };
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Tutup navigasi"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <button
          className="brand"
          onClick={() => go("dashboard")}
          aria-label="MYSPACE dashboard"
        >
          <span className="brand-mark">M</span>
          <span>
            MYSPACE<small>YOUR PERSONAL SPACE</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <span className="nav-label">WORKSPACE</span>
          <button
            className={`nav-item ${page === "dashboard" ? "active" : ""}`}
            aria-current={page === "dashboard" ? "page" : undefined}
            onClick={() => go("dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
            {page === "dashboard" && <span className="nav-active-dot" />}
          </button>
          <div className="nav-divider" />
          <span className="nav-label">YOUR ESSENTIALS</span>
          {moduleIds.map((id) => {
            const { Icon, title } = modules[id];
            return (
              <button
                key={id}
                className={`nav-item ${page === id ? "active" : ""}`}
                aria-current={page === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <Icon size={18} />
                <span>{title}</span>
                {page === id && <span className="nav-active-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <ShieldCheck size={17} />
            <div>
              <strong>Only yours.</strong>
              <small>Saved on this device</small>
            </div>
            <span className="status-dot" />
          </div>
          <button
            className="nav-item"
            onClick={() => {
              setSettings(true);
              setMobileNav(false);
            }}
          >
            <Settings2 size={18} />
            <span>Settings & backup</span>
          </button>
          <div className="sidebar-time">
            <span>{time}</span>
            <small>SHANGHAI · UTC+8</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Buka navigasi"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </Button>
            <span>Your workspace</span>
            <ChevronRight size={13} />
            <strong>
              {page === "dashboard" ? "Overview" : modules[page].title}
            </strong>
          </div>
          <div className="topbar-right">
            <GlobalActions navigate={go} />
            <span className="connection-status">
              {online ? (
                <>
                  <span className="status-dot" />
                  Local & private
                </>
              ) : (
                <>
                  <WifiOff size={14} />
                  Offline
                </>
              )}
            </span>
            <button
              className="profile-button"
              aria-label="Buka pengaturan"
              onClick={() => setSettings(true)}
            >
              {data.settings.name?.slice(0, 1).toUpperCase() || "M"}
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-container" key={page}>
            {page === "dashboard" ? (
              <>
                <div className="dashboard-heading">
                  <div>
                    <p className="greeting">
                      {greeting}
                      {data.settings.name
                        ? `, ${data.settings.name}`
                        : ""}. <span>Welcome to your space.</span>
                    </p>
                    <h1>
                      Your everyday,
                      <br />
                      <span>in order.</span>
                    </h1>
                    <p>
                      A little clarity. A little calm. Everything that matters.
                    </p>
                  </div>
                  <div className="dashboard-date">
                    <span className="eyebrow">
                      {formatDate(today, {
                        month: "long",
                        year: "numeric",
                      }).toUpperCase()}
                    </span>
                    <strong>
                      {today.slice(-2)}
                      <span>{formatDate(today, { weekday: "long" })}</span>
                    </strong>
                    <span>
                      Harbin, China <span className="date-dot">·</span> {time}
                    </span>
                  </div>
                </div>
                <div className="dashboard-toolbar">
                  <div className="overview-stats">
                    <span>
                      <CalendarDays size={15} />
                      <strong>{todaysClasses.length}</strong> classes today
                    </span>
                    <i />
                    <button onClick={() => go("subscriptions")}>
                      <CreditCard size={15} />
                      <strong>{reminders.length}</strong> renewals to review
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant={editing ? "default" : "ghost"}
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? (
                      <Check size={15} />
                    ) : (
                      <SlidersHorizontal size={15} />
                    )}{" "}
                    {editing ? "Done" : "Customize"}
                  </Button>
                </div>
                {editing && (
                  <div className="customize-panel">
                    <p>
                      Make room for your essentials. Drag a handle to reorder.
                    </p>
                    <div>
                      {data.settings.widgets.map((w) => (
                        <label className="check-label" key={w.id}>
                          <input
                            type="checkbox"
                            checked={w.visible}
                            onChange={(e) => {
                              const visible = e.target.checked;
                              void change((d) => {
                                d.settings.widgets.find(
                                  (x) => x.id === w.id,
                                )!.visible = visible;
                              });
                            }}
                          />
                          {modules[w.id].title}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {reminders.length > 0 && (
                  <button
                    className="reminder-banner"
                    onClick={() => go("subscriptions")}
                  >
                    <CreditCard size={17} />
                    <span>
                      <strong>
                        {reminders.length} tagihan perlu perhatian
                      </strong>{" "}
                      · {reminders.map((s) => s.name).join(", ")}
                    </span>
                    <ArrowRight size={17} />
                  </button>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={dragEnd}
                >
                  <SortableContext
                    items={visible.map((w) => w.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="widget-grid">
                      {visible.map((w) => (
                        <Widget
                          id={w.id}
                          key={w.id}
                          editing={editing}
                          onOpen={() => go(w.id)}
                        >
                          <ModuleContent
                            id={w.id}
                            compact
                            onOpen={() => go(w.id)}
                          />
                        </Widget>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {!visible.length && (
                  <div className="empty-state">
                    <h3>A blank canvas, just for you.</h3>
                    <p>Pilih widget melalui Customize.</p>
                    <Button
                      variant="secondary"
                      onClick={() => setEditing(true)}
                    >
                      Customize dashboard
                    </Button>
                  </div>
                )}
                <footer className="dashboard-footer">
                  <span>
                    <ShieldCheck size={13} />
                    Your data stays with you.
                  </span>
                  <span>Less noise. More space.</span>
                </footer>
              </>
            ) : (
              <>
                <PageTitle
                  eyebrow={modules[page].eyebrow}
                  title={modules[page].title}
                  description={modules[page].subtitle}
                >
                  {page === "timetable" && next && (
                    <span className="pill">
                      Next · {formatDate(next.date)} {next.start}
                    </span>
                  )}
                </PageTitle>
                <ModuleContent id={page} />
              </>
            )}
          </div>
        </main>
      </div>
      {settings && (
        <Settings
          onClose={() => setSettings(false)}
          install={
            installPrompt
              ? async () => {
                  await installPrompt.prompt();
                  await installPrompt.userChoice;
                  setInstallPrompt(null);
                }
              : undefined
          }
        />
      )}{" "}
      {notice && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          <span>{notice}</span>
          <button aria-label="Tutup notifikasi" onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {needRefresh && (
        <div className="update-banner">
          <span>Versi baru MYSPACE tersedia.</span>
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
            Update
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Nanti"
            onClick={() => setNeedRefresh(false)}
          >
            <X size={14} />
          </Button>
        </div>
      )}
      {offlineReady && (
        <span className="sr-only" role="status">
          MYSPACE siap digunakan offline.
        </span>
      )}
    </div>
  );
}
