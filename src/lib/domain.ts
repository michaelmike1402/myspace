import { z } from "zod";
export const ZONE = "Asia/Shanghai";
export const uid = () => crypto.randomUUID();
export const dateKey = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
export const localInstant = (date: string, time = "00:00") =>
  new Date(`${date}T${time}:00+08:00`);
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
export const monday = (date: string) =>
  addDays(date, -((new Date(`${date}T12:00Z`).getUTCDay() + 6) % 7));
export const formatDate = (
  date: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: ZONE }).format(
    localInstant(date),
  );
export const stamp = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Tanggal tidak valid",
  );
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const timestamp = z.string().datetime({ offset: true });
const text = z.string().trim().min(1).max(300);
const amountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
export const currencySchema = z.enum(["IDR", "CNY"]);
export type Currency = z.infer<typeof currencySchema>;
export const classSchema = z
  .object({
    id: text,
    seriesId: text,
    course: text,
    pinyin: z.string().max(300),
    instructor: z.string().max(300),
    building: z.string().max(100),
    room: z.string().max(100),
    date: dateSchema,
    start: timeSchema,
    end: timeSchema,
    source: z.string().max(2000),
    verified: z.boolean(),
    notes: z.string().max(2000),
  })
  .refine((c) => c.end > c.start, "Jam selesai harus setelah jam mulai");
const paymentSchema = z.object({
  id: text,
  amount: amountSchema.refine((v) => v > 0),
  at: timestamp,
  note: z.string().max(500),
});
export const debtSchema = z
  .object({
    id: text,
    kind: z.enum(["utang", "piutang"]),
    person: text,
    reason: text,
    currency: currencySchema,
    amount: amountSchema.refine((v) => v > 0),
    createdAt: timestamp,
    due: dateSchema.or(z.literal("")),
    payments: z.array(paymentSchema).max(10000),
  })
  .refine(
    (d) => d.payments.reduce((s, p) => s + p.amount, 0) <= d.amount,
    "Pembayaran melebihi saldo",
  );
export const eventSchema = z.object({
  id: text,
  name: text,
  date: dateSchema,
  time: timeSchema,
  recurrence: z.enum(["none", "weekly", "monthly", "yearly"]),
  notes: z.string().max(2000),
});
export const subSchema = z.object({
  id: text,
  name: text,
  amount: amountSchema.refine((v) => v > 0),
  currency: currencySchema,
  anchor: dateSchema,
  cycle: z.enum(["weekly", "monthly", "yearly"]),
  every: z.number().int().min(1).max(120),
  period: z.number().int().nonnegative().max(10000),
  status: z.enum(["active", "paused", "cancelled"]),
  remindDays: z.number().int().min(0).max(90),
  payments: z
    .array(
      z.object({
        id: text,
        due: dateSchema,
        at: timestamp,
        amount: amountSchema,
        currency: currencySchema,
      }),
    )
    .max(10000),
});
export const randomSchema = z.object({
  id: text,
  name: text,
  options: z.array(text).min(2).max(100),
  lastResult: z.string().max(300),
});
export const moduleIds = [
  "timetable",
  "debts",
  "convert",
  "countdown",
  "subscriptions",
  "randomizer",
] as const;
export const settingsSchema = z.object({
  theme: z.enum(["dark", "light", "system"]),
  name: z.string().max(50),
  rate: z.number().positive().max(1e9).nullable(),
  rateAt: timestamp.nullable(),
  widgets: z
    .array(
      z.object({
        id: z.enum(moduleIds),
        visible: z.boolean(),
        size: z.enum(["normal", "wide"]),
      }),
    )
    .length(6)
    .refine((w) => new Set(w.map((x) => x.id)).size === 6, "Widget duplikat"),
});
export const appSchema = z
  .object({
    schema: z.literal("myspace.backup.v1"),
    settings: settingsSchema,
    classes: z.array(classSchema).max(20000),
    debts: z.array(debtSchema).max(10000),
    events: z.array(eventSchema).max(10000),
    subscriptions: z.array(subSchema).max(10000),
    randomizers: z.array(randomSchema).max(1000),
    conversions: z
      .array(
        z.object({
          id: text,
          from: currencySchema,
          input: z.number().finite().nonnegative().max(1e12),
          output: z.number().finite().nonnegative(),
          rate: z.number().positive().max(1e9),
          at: timestamp,
        }),
      )
      .max(10000),
  })
  .superRefine((data, ctx) => {
    for (const key of [
      "classes",
      "debts",
      "events",
      "subscriptions",
      "randomizers",
      "conversions",
    ] as const) {
      if (new Set(data[key].map((x) => x.id)).size !== data[key].length)
        ctx.addIssue({
          code: "custom",
          message: `ID duplikat: ${key}`,
          path: [key],
        });
    }
  });
export type AppData = z.infer<typeof appSchema>;
export type ClassSession = z.infer<typeof classSchema>;
export type Debt = z.infer<typeof debtSchema>;
export type Countdown = z.infer<typeof eventSchema>;
export type Subscription = z.infer<typeof subSchema>;
export type RandomSet = z.infer<typeof randomSchema>;
export type ModuleId = (typeof moduleIds)[number];
export const minor = (value: number, currency: Currency) =>
  Math.round(value * (currency === "CNY" ? 100 : 1));
export const major = (value: number, currency: Currency) =>
  value / (currency === "CNY" ? 100 : 1);
export const money = (value: number, currency: Currency) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CNY" ? 2 : 0,
  }).format(major(value, currency));
export const remaining = (debt: Debt) =>
  debt.amount - debt.payments.reduce((sum, p) => sum + p.amount, 0);
export function payDebt(
  debt: Debt,
  amount: number,
  note = "",
  at = new Date().toISOString(),
): Debt {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining(debt))
    throw new Error(
      "Masukkan pembayaran lebih dari 0 dan tidak melebihi sisa saldo.",
    );
  return debtSchema.parse({
    ...debt,
    payments: [...debt.payments, { id: uid(), amount, note, at }],
  });
}
export function cycleDate(
  anchor: string,
  cycle: "weekly" | "monthly" | "yearly",
  count: number,
): string {
  if (cycle === "weekly") return addDays(anchor, 7 * count);
  const [y, m, d] = anchor.split("-").map(Number);
  const total = y * 12 + (m - 1) + (cycle === "yearly" ? count * 12 : count);
  const year = Math.floor(total / 12),
    month = total % 12;
  const day = Math.min(d, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export const renewalDate = (s: Subscription) =>
  cycleDate(s.anchor, s.cycle, s.period * s.every);
export function nextEvent(e: Countdown, now = new Date()): Date {
  const initial = localInstant(e.date, e.time);
  if (e.recurrence === "none" || initial >= now) return initial;
  const today = dateKey(now);
  const [y, m] = today.split("-").map(Number);
  const [ay, am] = e.date.split("-").map(Number);
  let count =
    e.recurrence === "weekly"
      ? Math.max(
          0,
          Math.floor((now.getTime() - initial.getTime()) / (7 * 86400000)),
        )
      : e.recurrence === "yearly"
        ? Math.max(0, y - ay)
        : Math.max(0, (y - ay) * 12 + m - am);
  let next = localInstant(cycleDate(e.date, e.recurrence, count), e.time);
  while (next < now)
    next = localInstant(cycleDate(e.date, e.recurrence, ++count), e.time);
  return next;
}
export const nextClass = (classes: ClassSession[], now = new Date()) =>
  [...classes]
    .filter((c) => localInstant(c.date, c.end) > now)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
export const timingMatches = (c: Pick<ClassSession, "start" | "end">) =>
  [
    "08:00-09:45",
    "10:00-11:45",
    "13:45-15:30",
    "15:45-17:30",
    "18:30-20:15",
    "20:30-22:15",
  ].includes(`${c.start}-${c.end}`);
export function classIssues(classes: ClassSession[]): Map<string, string[]> {
  const issues = new Map<string, string[]>();
  const overlaps = new Set<string>();
  let furthest: ClassSession | undefined;
  for (const c of [...classes].sort((a, b) =>
    (a.date + a.start).localeCompare(b.date + b.start),
  )) {
    if (furthest && furthest.date === c.date && c.start < furthest.end) {
      overlaps.add(c.id);
      overlaps.add(furthest.id);
      if (c.end > furthest.end) furthest = c;
    } else furthest = c;
  }
  for (const c of classes) {
    const list: string[] = [];
    if (!c.verified)
      list.push(
        timingMatches(c)
          ? "Jam sesuai panduan 2022; perlu konfirmasi semester ini."
          : "Jam khusus, berbeda dari pasangan periode panduan 2022; perlu konfirmasi.",
      );
    if (overlaps.has(c.id))
      list.push("Bertabrakan dengan kelas lain pada tanggal ini.");
    if (list.length) issues.set(c.id, list);
  }
  return issues;
}
export function parseBackup(raw: string): AppData {
  if (raw.length > 10_000_000) throw new Error("Backup maksimal 10 MB.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("File bukan JSON yang valid.");
  }
  const result = appSchema.safeParse(parsed);
  if (!result.success)
    throw new Error(
      `Backup tidak valid: ${result.error.issues[0].path.join(".")} — ${result.error.issues[0].message}`,
    );
  return result.data;
}
export function randomIndex(length: number): number {
  const ceiling = Math.floor(4294967296 / length) * length;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= ceiling);
  return values[0] % length;
}
