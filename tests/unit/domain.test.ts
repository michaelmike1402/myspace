import "fake-indexeddb/auto";
import { describe, it, expect, afterAll } from "vitest";
import {
  addDays,
  appSchema,
  classIssues,
  classSchema,
  cycleDate,
  dateKey,
  localInstant,
  major,
  minor,
  monday,
  nextClass,
  nextEvent,
  parseBackup,
  payDebt,
  remaining,
  renewalDate,
  type Debt,
  type Subscription,
} from "../../src/lib/domain";
import { seed, master } from "../../src/data/seed";
import { MyspaceDB } from "../../src/lib/store";
const debt: Debt = {
  id: "d",
  kind: "utang",
  person: "Test",
  reason: "Lunch",
  currency: "CNY",
  amount: 10000,
  createdAt: "2026-10-10T00:00:00Z",
  due: "",
  payments: [],
};
describe("dated timetable and Shanghai time", () => {
  it("preserves every supplied occurrence with no generated recurrence", () => {
    const data = seed();
    expect(data.classes).toHaveLength(
      master.classes.reduce((s, c) => s + c.dates.length, 0),
    );
    for (const [i, c] of master.classes.entries()) {
      expect(
        data.classes
          .filter((s) => s.seriesId === `master-${i}`)
          .map((s) => s.date),
      ).toEqual(c.dates);
    }
    expect(
      data.classes.every(
        (s) =>
          s.date >= master.coverage.from && s.date <= master.coverage.through,
      ),
    ).toBe(true);
    expect(new Set(data.classes.map((c) => c.id)).size).toBe(
      data.classes.length,
    );
  });
  it("uses Shanghai date around UTC midnight", () => {
    expect(dateKey(new Date("2026-10-11T16:01:00Z"))).toBe("2026-10-12");
    expect(localInstant("2026-10-12", "08:00").toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
    expect(monday("2026-10-11")).toBe("2026-10-05");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("shows current class until end then advances; no next class after coverage", () => {
    const c = seed().classes;
    expect(nextClass(c, new Date("2026-10-12T06:00:00Z"))?.course).toBe(
      "初级汉语（1）",
    );
    expect(nextClass(c, new Date("2026-10-12T07:30:00Z"))?.course).toBe(
      "经济学原理",
    );
    expect(nextClass(c, new Date("2026-12-07T00:00:00Z"))).toBeUndefined();
  });
  it("flags uncertain and overlapping classes, rejects invalid dates and inverted times", () => {
    const a = seed().classes[0];
    expect(classIssues([a]).get(a.id)).toHaveLength(1);
    expect(classIssues([a, { ...a, id: "overlap" }]).get(a.id)).toHaveLength(2);
    expect(classSchema.safeParse({ ...a, date: "2026-02-30" }).success).toBe(
      false,
    );
    expect(classSchema.safeParse({ ...a, start: "24:00" }).success).toBe(false);
    expect(classSchema.safeParse({ ...a, end: a.start }).success).toBe(false);
  });
});
describe("money and repayment invariants", () => {
  it("records partial then full payment without mutating the original", () => {
    const partial = payDebt(debt, 2550, "Bank", "2026-10-10T01:02:03Z");
    expect(remaining(partial)).toBe(7450);
    expect(debt.payments).toHaveLength(0);
    const paid = payDebt(partial, 7450);
    expect(remaining(paid)).toBe(0);
    expect(paid.payments[0].at).toBe("2026-10-10T01:02:03Z");
  });
  it.each([0, -1, 10001, 0.5, NaN, Infinity])(
    "rejects invalid payment %s",
    (amount) => expect(() => payDebt(debt, amount)).toThrow(),
  );
  it("stores CNY in fen and IDR in whole rupiah", () => {
    expect(minor(10.1, "CNY")).toBe(1010);
    expect(minor(0.01, "CNY")).toBe(1);
    expect(major(1010, "CNY")).toBe(10.1);
    expect(minor(10000, "IDR")).toBe(10000);
  });
});
describe("calendar cycles", () => {
  it("clamps month end without drifting the original anchor", () => {
    expect(cycleDate("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(cycleDate("2026-01-31", "monthly", 2)).toBe("2026-03-31");
    expect(cycleDate("2024-02-29", "yearly", 1)).toBe("2025-02-28");
    expect(cycleDate("2024-02-29", "yearly", 4)).toBe("2028-02-29");
  });
  it("finds monthly/weekly recurrence after now, preserving local time", () => {
    const e = {
      id: "e",
      name: "End of month",
      date: "2026-01-31",
      time: "10:00",
      recurrence: "monthly" as const,
      notes: "",
    };
    expect(nextEvent(e, new Date("2026-02-28T03:00:00Z")).toISOString()).toBe(
      "2026-03-31T02:00:00.000Z",
    );
    expect(
      nextEvent(
        { ...e, date: "2026-10-05", recurrence: "weekly" },
        new Date("2026-10-10T03:00:00Z"),
      ).toISOString(),
    ).toBe("2026-10-12T02:00:00.000Z");
    expect(
      nextEvent(
        { ...e, recurrence: "none" },
        new Date("2026-10-10T03:00:00Z"),
      ).toISOString(),
    ).toBe("2026-01-31T02:00:00.000Z");
  });
  it("advances custom subscription intervals from an anchored due date", () => {
    const s: Subscription = {
      id: "s",
      name: "Service",
      amount: 100,
      currency: "CNY",
      anchor: "2026-01-31",
      cycle: "monthly",
      every: 2,
      period: 2,
      status: "active",
      remindDays: 3,
      payments: [],
    };
    expect(renewalDate(s)).toBe("2026-05-31");
  });
});
describe("backup and storage", () => {
  it("round-trips the complete dataset and validates invalid imports before replacement", () => {
    const data = seed();
    data.debts.push(payDebt(debt, 500));
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
    expect(() => parseBackup("{bad")).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...data, schema: "other" })),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...data,
          debts: [
            {
              ...debt,
              payments: [
                {
                  id: "p",
                  amount: 10001,
                  at: "2026-10-10T00:00:00Z",
                  note: "",
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...data,
          classes: [data.classes[0], data.classes[0]],
        }),
      ),
    ).toThrow();
  });
  const db = new MyspaceDB("myspace-test");
  afterAll(async () => {
    await db.delete();
  });
  it("persists data across connections and rolls back a failed transaction", async () => {
    const data = appSchema.parse(seed());
    await db.documents.put({ id: "main", data });
    db.close();
    await db.open();
    expect((await db.documents.get("main"))?.data).toEqual(data);
    await expect(
      db.transaction("rw", db.documents, async () => {
        await db.documents.delete("main");
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect((await db.documents.get("main"))?.data.classes.length).toBe(
      data.classes.length,
    );
  });
});
