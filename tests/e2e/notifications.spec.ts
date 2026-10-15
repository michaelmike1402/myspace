import { test, expect, type Page } from "@playwright/test";

async function openNotifications(page: Page) {
  await page
    .getByRole("button", { name: "Buka pengaturan", exact: true })
    .click();
  await page.locator(".notification-settings summary").click();
  return page.getByRole("region", { name: "Notification preferences" });
}
async function saved(page: Page) {
  await expect(page.locator(".notification-save")).toHaveText(
    "Preferensi tersimpan di perangkat ini.",
  );
}
async function stored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const request = indexedDB.open("myspace-v1");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("documents", "readonly");
          const record = transaction.objectStore("documents").get("main");
          transaction.oncomplete = () => {
            database.close();
            resolve(record.result.data);
          };
        };
      }),
  );
}
async function corruptPreferences(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("myspace-v1");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result,
            transaction = database.transaction("documents", "readwrite"),
            store = transaction.objectStore("documents"),
            record = store.get("main");
          record.onsuccess = () => {
            const value = record.result;
            value.data.settings.notifications = {
              enabled: "broken",
              timezone: "invalid",
              modules: {
                timetable: { enabled: true, leadMinutes: 999 },
                debts: null,
              },
            };
            store.put(value);
          };
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
  );
}
test("preferences, toggles, lead times, reload, backup and no notification side effects", async ({
  page,
}, info) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.url().startsWith("http") &&
      !request.url().startsWith("http://127.0.0.1:5187/")
    )
      external.push(request.url());
  });
  await page.addInitScript(() => {
    const state = { requested: 0, delivered: 0, subscribed: 0 };
    (window as any).__notificationCalls = state;
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: class {
        static permission = "default";
        static requestPermission() {
          state.requested++;
          return Promise.resolve("granted");
        }
        constructor() {
          state.delivered++;
        }
      },
    });
    if (typeof ServiceWorkerRegistration !== "undefined")
      ServiceWorkerRegistration.prototype.showNotification = async () => {
        state.delivered++;
      };
    if (typeof PushManager !== "undefined")
      PushManager.prototype.subscribe = async () => {
        state.subscribed++;
        throw new Error("Push must not subscribe");
      };
  });
  await page.goto("./");
  const region = await openNotifications(page);
  const master = region.getByRole("switch", {
    name: "Aktifkan preferensi pengingat",
  });
  await expect(master).not.toBeChecked();
  await expect(region).toContainText("iPhone Web Push (Planned)");
  await expect(region).toContainText(
    "tidak menjadwalkan atau mengirim notifikasi",
  );
  await expect(region.getByTestId("notification-permission")).toHaveText(
    "Belum diputuskan",
  );
  const before = await stored(page);
  const categories = [
    "Class reminders",
    "Subscription reminders",
    "Countdown reminders",
    "Debt reminders",
  ];
  for (const title of categories) {
    await expect(
      region.getByRole("switch", { name: title, exact: true }),
    ).toBeDisabled();
    await expect(
      region.getByRole("combobox", { name: `Waktu ${title}` }),
    ).toBeDisabled();
  }
  await master.focus();
  await master.press("Space");
  await saved(page);
  const defaults = ["30", "3", "1", "0"];
  const options = [
    ["5", "10", "15", "30", "60"],
    ["1", "3", "7"],
    ["1", "3", "7"],
    ["0", "1", "3", "7"],
  ];
  for (const [index, title] of categories.entries()) {
    const toggle = region.getByRole("switch", { name: title, exact: true });
    const select = region.getByRole("combobox", { name: `Waktu ${title}` });
    await expect(toggle).not.toBeChecked();
    await expect(select).toHaveValue(defaults[index]);
    await toggle.click();
    await saved(page);
    for (const value of options[index]) {
      await select.selectOption(value);
      await saved(page);
    }
    await toggle.click();
    await saved(page);
    await expect(select).toBeDisabled();
    await toggle.click();
    await saved(page);
  }
  await master.click();
  await saved(page);
  await expect(
    region.getByRole("switch", { name: "Class reminders", exact: true }),
  ).toBeChecked();
  await expect(
    region.getByRole("switch", { name: "Class reminders", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await openNotifications(page);
  await expect(master).not.toBeChecked();
  await master.click();
  await saved(page);
  for (const [index, title] of categories.entries())
    await expect(
      region.getByRole("combobox", { name: `Waktu ${title}` }),
    ).toHaveValue(options[index].at(-1)!);
  const after = await stored(page);
  const { notifications: oldPreferences, ...oldSettings } = before.settings;
  const { notifications, ...newSettings } = after.settings;
  expect({ ...after, settings: newSettings }).toEqual({
    ...before,
    settings: oldSettings,
  });
  expect(notifications.timezone).toBe("Asia/Shanghai");
  expect(notifications.updatedAt).toBeTruthy();
  await page
    .locator(".notification-settings summary")
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({
    path: `test-results/${info.project.name}-notifications-top.png`,
    animations: "disabled",
  });
  await region
    .getByRole("combobox", { name: "Waktu Debt reminders" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/${info.project.name}-notifications-bottom.png`,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const file = await download;
  await page.getByLabel("File backup").setInputFiles((await file.path())!);
  await page.getByLabel("Ganti semua data").check();
  await page.getByRole("button", { name: "Import dan ganti data" }).click();
  await expect(page.locator(".import-preview")).toHaveCount(0);
  expect((await stored(page)).settings.notifications).toEqual(notifications);
  expect(
    await page.evaluate(() => (window as any).__notificationCalls),
  ).toEqual({ requested: 0, delivered: 0, subscribed: 0 });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("invalid stored preferences recover without changing existing data; permission refresh is read-only", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "denied" },
    }),
  );
  await page.goto("./");
  await openNotifications(page);
  const original = await stored(page);
  await corruptPreferences(page);
  await page.reload();
  const region = await openNotifications(page);
  await expect(region.getByTestId("notification-permission")).toHaveText(
    "Diblokir browser",
  );
  await expect(
    region.getByRole("switch", { name: "Aktifkan preferensi pengingat" }),
  ).not.toBeChecked();
  await expect(
    region.getByRole("combobox", { name: "Waktu Class reminders" }),
  ).toHaveValue("30");
  await expect(region).toContainText("Asia/Shanghai");
  await page.evaluate(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "granted" },
    });
    window.dispatchEvent(new Event("focus"));
  });
  await expect(region.getByTestId("notification-permission")).toHaveText(
    "Diizinkan browser",
  );
  await expect(region).toContainText("Pengiriman push belum tersedia");
  await page.evaluate(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: undefined,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(region.getByTestId("notification-permission")).toHaveText(
    "Tidak tersedia di konteks browser ini",
  );
  await region
    .getByRole("switch", { name: "Aktifkan preferensi pengingat" })
    .click();
  await saved(page);
  const recovered = await stored(page);
  const { notifications, ...settings } = recovered.settings;
  const { notifications: initial, ...initialSettings } = original.settings;
  expect({ ...recovered, settings }).toEqual({
    ...original,
    settings: initialSettings,
  });
});
