import "fake-indexeddb/auto";
import { afterAll, describe, expect, it } from "vitest";
import {
  defaultNotificationPreferences,
  notificationPreferencesSchema,
  readNotificationPermission,
} from "../../src/lib/notification-preferences";
import { isDebtReminderEligible } from "../../src/lib/notification-sources";
import { appSchema, parseBackup, type Debt } from "../../src/lib/domain";
import { seed } from "../../src/data/seed";
import { change, db } from "../../src/lib/store";

const debt: Debt = {
  id: "existing-debt",
  kind: "utang",
  person: "Friend",
  reason: "Meal",
  currency: "CNY",
  amount: 10000,
  createdAt: "2026-10-15T00:00:00Z",
  due: "2026-10-20",
  payments: [],
};
describe("notification preferences", () => {
  it("defaults to disabled preferences with the required lead times", () => {
    const defaults = defaultNotificationPreferences();
    expect(defaults.enabled).toBe(false);
    expect(defaults.timezone).toBe("Asia/Shanghai");
    expect(defaults.modules).toEqual({
      timetable: { enabled: false, leadMinutes: 30 },
      subscriptions: { enabled: false, leadDays: 3 },
      countdown: { enabled: false, leadDays: 1 },
      debts: { enabled: false, leadDays: 0 },
    });
    defaults.modules.timetable.enabled = true;
    expect(defaultNotificationPreferences().modules.timetable.enabled).toBe(
      false,
    );
  });
  it.each([undefined, null, "bad", [], { version: 99, enabled: true }])(
    "recovers missing/invalid roots safely: %j",
    (value) => {
      expect(notificationPreferencesSchema.parse(value)).toEqual(
        defaultNotificationPreferences(),
      );
    },
  );
  it("recovers invalid individual fields while preserving valid siblings", () => {
    const value = notificationPreferencesSchema.parse({
      enabled: "yes",
      timezone: "invalid/zone",
      delivery: 12,
      updatedAt: "invalid",
      modules: {
        timetable: { enabled: true, leadMinutes: 10 },
        subscriptions: { enabled: true, leadDays: 9 },
        countdown: null,
        debts: { enabled: "yes", leadDays: -1 },
      },
    });
    expect(value.enabled).toBe(false);
    expect(value.modules.timetable).toEqual({ enabled: true, leadMinutes: 10 });
    expect(value.modules.subscriptions).toEqual({ enabled: true, leadDays: 3 });
    expect(value.modules.countdown).toEqual({ enabled: false, leadDays: 1 });
    expect(value.modules.debts).toEqual({ enabled: false, leadDays: 0 });
    expect(value.timezone).toBe("Asia/Shanghai");
    expect(value.updatedAt).toBeNull();
  });
  it("supports a configured IANA timezone and all offered lead times", () => {
    const data = defaultNotificationPreferences();
    data.timezone = "Asia/Jakarta";
    for (const value of [5, 10, 15, 30, 60]) {
      data.modules.timetable.leadMinutes = value;
      expect(
        notificationPreferencesSchema.parse(data).modules.timetable.leadMinutes,
      ).toBe(value);
    }
    for (const value of [1, 3, 7]) {
      data.modules.subscriptions.leadDays = value;
      data.modules.countdown.leadDays = value;
      expect(notificationPreferencesSchema.parse(data)).toEqual(data);
    }
    for (const value of [0, 1, 3, 7]) {
      data.modules.debts.leadDays = value;
      expect(
        notificationPreferencesSchema.parse(data).modules.debts.leadDays,
      ).toBe(value);
    }
  });
  it.each(["", "not-a-date", "2026-02-30"])(
    "excludes debts without a valid due date: %s",
    (due) => {
      expect(isDebtReminderEligible({ ...debt, due })).toBe(false);
    },
  );
  it("includes dated unpaid utang/piutang, excludes fully paid debts without mutation", () => {
    const before = structuredClone(debt);
    expect(isDebtReminderEligible(debt)).toBe(true);
    expect(isDebtReminderEligible({ ...debt, kind: "piutang" })).toBe(true);
    expect(
      isDebtReminderEligible({
        ...debt,
        payments: [
          { id: "paid", amount: debt.amount, at: debt.createdAt, note: "" },
        ],
      }),
    ).toBe(false);
    expect(debt).toEqual(before);
  });
});
describe("permission observation", () => {
  it.each(["default", "granted", "denied"] as const)(
    "reports %s without requesting permission",
    (permission) => {
      expect(readNotificationPermission({ Notification: { permission } })).toBe(
        permission,
      );
    },
  );
  it("handles unavailable APIs, unknown values and blocked getters", () => {
    expect(readNotificationPermission({})).toBe("unavailable");
    expect(
      readNotificationPermission({ Notification: { permission: "future" } }),
    ).toBe("unknown");
    expect(
      readNotificationPermission({
        get Notification() {
          throw new Error("blocked");
        },
      }),
    ).toBe("unknown");
  });
});
describe("notification settings preserve the existing database", () => {
  afterAll(async () => {
    await db.delete();
  });
  it("reads old backups without modifying them or requiring a new database version", () => {
    const legacy = JSON.parse(JSON.stringify(seed()));
    delete legacy.settings.notifications;
    const parsed = parseBackup(JSON.stringify(legacy));
    expect(parsed.settings.notifications).toEqual(
      defaultNotificationPreferences(),
    );
    expect(legacy.settings.notifications).toBeUndefined();
    const { notifications, ...settings } = parsed.settings;
    expect({ ...parsed, settings }).toEqual(legacy);
  });
  it("changes only preferences, persists them and round-trips backup", async () => {
    const data = seed();
    data.debts.push(debt);
    data.events.push({
      id: "event",
      name: "Exam",
      date: "2026-12-01",
      time: "09:00",
      recurrence: "none",
      notes: "Keep",
    });
    data.subscriptions.push({
      id: "sub",
      name: "Service",
      amount: 1000,
      currency: "CNY",
      anchor: "2026-10-01",
      cycle: "monthly",
      every: 1,
      period: 0,
      status: "active",
      remindDays: 7,
      payments: [],
    });
    data.randomizers.push({
      id: "random",
      name: "Lunch",
      options: ["A", "B"],
      lastResult: "A",
    });
    data.quickNotes.push({
      id: "note",
      body: "Keep this",
      createdAt: debt.createdAt,
    });
    data.conversions.push({
      id: "convert",
      from: "CNY",
      input: 2,
      output: 4400,
      rate: 2200,
      at: debt.createdAt,
    });
    const legacy = JSON.parse(JSON.stringify(data));
    delete legacy.settings.notifications;
    await db.documents.put({ id: "main", data: legacy });
    await change((draft) => {
      draft.settings.notifications.enabled = true;
      draft.settings.notifications.modules.timetable = {
        enabled: true,
        leadMinutes: 15,
      };
    });
    db.close();
    await db.open();
    const saved = (await db.documents.get("main"))!.data;
    expect(saved.settings.notifications.enabled).toBe(true);
    const { notifications, ...settings } = saved.settings;
    expect({ ...saved, settings }).toEqual(legacy);
    expect(parseBackup(JSON.stringify(saved))).toEqual(saved);
    expect(
      appSchema.parse({
        ...saved,
        settings: { ...settings, notifications: null },
      }).settings.notifications.enabled,
    ).toBe(false);
  });
});
