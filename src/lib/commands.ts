import type { ModuleId } from "./domain";

export type QuickEditor = "note" | "debt" | "countdown" | "subscription";
export type Command = {
  id: string;
  title: string;
  keywords: string[];
  category: "Navigasi" | "Aksi";
  action: () => void;
};
type CommandContext = {
  navigate: (page: ModuleId | "dashboard") => void;
  openEditor: (editor: QuickEditor) => void;
};

// Both entry points execute these same actions, including the existing editors.
export function createCommands({
  navigate,
  openEditor,
}: CommandContext): Command[] {
  const navigation: [ModuleId | "dashboard", string, string[]][] = [
    ["dashboard", "Overview", ["dashboard", "home", "beranda"]],
    ["timetable", "Timetable", ["jadwal", "kelas", "schedule"]],
    ["debts", "Debt tracker", ["utang", "hutang", "piutang", "debt"]],
    [
      "convert",
      "Quick convert",
      ["kurs", "uang", "currency", "convert uang", "convert currency"],
    ],
    ["countdown", "Countdown hub", ["tanggal", "event"]],
    [
      "subscriptions",
      "Subscriptions",
      ["subscription", "langganan", "billing"],
    ],
    ["randomizer", "Randomizer", ["random", "acak", "pilih"]],
  ];
  return [
    ...navigation.map(([id, title, keywords]) => ({
      id: `go-${id}`,
      title,
      keywords,
      category: "Navigasi" as const,
      action: () => navigate(id),
    })),
    {
      id: "add-debt",
      title: "Tambah utang",
      keywords: ["tambah hutang", "add debt", "buat utang"],
      category: "Aksi",
      action: () => openEditor("debt"),
    },
    {
      id: "add-countdown",
      title: "Tambah countdown",
      keywords: ["buat countdown", "add countdown", "tambah event"],
      category: "Aksi",
      action: () => openEditor("countdown"),
    },
    {
      id: "add-subscription",
      title: "Tambah subscription",
      keywords: ["add subscription", "tambah langganan", "buat langganan"],
      category: "Aksi",
      action: () => openEditor("subscription"),
    },
    {
      id: "quick-note",
      title: "Quick Note",
      keywords: ["catatan", "catat", "tulis", "add note", "notes"],
      category: "Aksi",
      action: () => openEditor("note"),
    },
  ];
}
const normalize = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase().trim().replace(/\s+/g, " ");
export function searchCommands(commands: Command[], query: string) {
  const term = normalize(query);
  if (!term) return commands;
  const tokens = term.split(" ");
  return commands
    .map((command, order) => {
      const phrases = [command.title, ...command.keywords].map(normalize);
      const matches = tokens.every((token) =>
        phrases.some((phrase) => phrase.includes(token)),
      );
      const score = phrases.some((phrase) => phrase === term)
        ? 0
        : phrases.some((phrase) => phrase.startsWith(term))
          ? 1
          : 2;
      return { command, matches, score, order };
    })
    .filter((item) => item.matches)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map((item) => item.command);
}
export const captureCommandIds = [
  "quick-note",
  "add-debt",
  "add-countdown",
  "go-convert",
] as const;
