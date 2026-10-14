import { test, expect, type Page } from "@playwright/test";

const searchButton = (page: Page) =>
  page.getByRole("button", { name: "Buka pencarian dan perintah" });
const capture = (page: Page) =>
  page.getByRole("button", { name: "Quick Capture", exact: true });
const browserErrors = new WeakMap<Page, string[]>();
async function command(page: Page, query: string) {
  await searchButton(page).click();
  await page.getByRole("combobox", { name: "Cari perintah" }).fill(query);
  await page.getByRole("combobox").press("Enter");
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("./");
  await expect(searchButton(page)).toBeVisible();
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});
test("palette bilingual navigation, keyboard, focus, empty state and existing forms", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      errors.push(message.text());
  });
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: "Cari perintah" });
  await expect(input).toBeFocused();
  await expect(page.getByRole("option")).toHaveCount(11);
  await input.press("ArrowUp");
  await expect(
    page.getByRole("option", { name: "Quick Note Aksi" }),
  ).toHaveAttribute("aria-selected", "true");
  await input.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Overview Navigasi" }),
  ).toHaveAttribute("aria-selected", "true");
  await input.fill("no such command");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Tidak ada hasil" }),
  ).toBeVisible();
  await input.press("Enter");
  await expect(input).toBeVisible();
  await input.press("Escape");
  await expect(searchButton(page)).toBeFocused();
  await page.keyboard.press("Meta+k");
  await expect(input).toBeFocused();
  await input.fill("  JADW  ");
  await page.screenshot({
    path: `test-results/${info.project.name}-command-palette.png`,
    animations: "disabled",
  });
  await input.press("Enter");
  await expect(page).toHaveURL(/#timetable$/);
  for (const [query, hash] of [
    ["hutang", "debts"],
    ["convert currency", "convert"],
    ["tanggal", "countdown"],
    ["billing", "subscriptions"],
    ["acak", "randomizer"],
  ]) {
    await command(page, query);
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
  }
  await command(page, "add debt");
  await expect(
    page.getByRole("dialog", { name: "Tambah utang" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nama", { exact: true })).toBeFocused();
  await page.getByLabel("Nama", { exact: true }).fill("Palette friend");
  await page.keyboard.press("Control+k");
  await expect(page.getByLabel("Nama", { exact: true })).toHaveValue(
    "Palette friend",
  );
  await page.getByLabel("Alasan", { exact: true }).fill("Lunch");
  await page.getByLabel("Jumlah awal").fill("25000");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  await command(page, "buat countdown");
  await expect(page.getByLabel("Nama event")).toBeFocused();
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await command(page, "tambah subscription");
  await expect(page.getByLabel("Nama layanan")).toBeFocused();
  await page.keyboard.press("Escape");
  await searchButton(page).click();
  await page.locator(".dialog-overlay").click({ position: { x: 2, y: 2 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  await page
    .getByRole("button", { name: "Buka pengaturan", exact: true })
    .click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await searchButton(page).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: `test-results/${info.project.name}-command-light.png`,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});
test("capture actions, notes persist and backup includes the added fields", async ({
  page,
}, info) => {
  if (info.project.name === "iphone") await capture(page).tap();
  else await capture(page).click();
  const menu = page.getByRole("dialog", { name: "Quick Capture" });
  await expect(menu).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-quick-capture.png`,
    animations: "disabled",
  });
  await menu.getByRole("button", { name: "Quick Note" }).click();
  await expect(page.getByLabel("Catatan baru")).toBeFocused();
  await page.getByLabel("Catatan baru").fill("Remember the library\n带学生证");
  await page.getByRole("button", { name: "Simpan catatan" }).click();
  await expect(
    page.getByRole("region", { name: "Catatan tersimpan" }),
  ).toContainText("带学生证");
  await expect(page.getByLabel("Catatan baru")).toHaveValue("");
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await expect(capture(page)).toBeFocused();
  await page.reload();
  await command(page, "catatan");
  await expect(
    page.getByRole("region", { name: "Catatan tersimpan" }),
  ).toContainText("Remember the library");
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await capture(page).click();
  await menu.getByRole("button", { name: "Tambah utang" }).click();
  await page.getByLabel("Nama", { exact: true }).fill("Capture friend");
  await page.getByLabel("Alasan", { exact: true }).fill("Coffee");
  await page.getByLabel("Jumlah awal").fill("30");
  await page.getByRole("dialog").getByLabel("Mata uang").selectOption("CNY");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await capture(page).click();
  await menu.getByRole("button", { name: "Tambah countdown" }).click();
  await page.getByLabel("Nama event").fill("Capture event");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await capture(page).click();
  await menu.getByRole("button", { name: "Quick convert" }).click();
  await expect(page).toHaveURL(/#convert$/);
  await page
    .getByRole("button", { name: "Buka pengaturan", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const file = await downloading;
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.quickNotes[0].body).toContain("带学生证");
  expect(backup.settings.capturePosition.side).toBe("right");
  expect(backup.debts[0].person).toBe("Capture friend");
  expect(backup.events[0].name).toBe("Capture event");
  await page.getByLabel("File backup").setInputFiles((await file.path())!);
  await expect(page.locator(".import-preview")).toContainText(
    "1 catatan cepat",
  );
  await page.getByLabel("Ganti semua data").check();
  await page.getByRole("button", { name: "Import dan ganti data" }).click();
  await expect(page.locator(".import-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.reload();
  await command(page, "quick note");
  await expect(
    page.getByRole("region", { name: "Catatan tersimpan" }),
  ).toContainText("带学生证");
});
test("floating drag snaps, never opens during drag, persists and stays in viewport", async ({
  page,
}) => {
  const button = capture(page),
    initial = (await button.boundingBox())!;
  await page.mouse.move(initial.x + 24, initial.y + 24);
  await page.mouse.down();
  await page.mouse.move(75, 160, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(async () => Math.round((await button.boundingBox())!.x))
    .toBe(12);
  const moved = (await button.boundingBox())!;
  await page.reload();
  await expect
    .poll(async () => Math.round((await button.boundingBox())!.x))
    .toBe(12);
  expect(Math.abs((await button.boundingBox())!.y - moved.y)).toBeLessThan(2);
  await page.setViewportSize({ width: 320, height: 568 });
  let box = (await button.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(568);
  await button.focus();
  await button.press("End");
  await button.press("ArrowRight");
  await expect
    .poll(async () => Math.round((await button.boundingBox())!.x))
    .toBe(260);
  await button.press("Enter");
  const menu = page.getByRole("dialog", { name: "Quick Capture" });
  const rect = (await menu.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(320);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.y + rect.height).toBeLessThanOrEqual(568);
  await page.keyboard.press("Tab");
  expect(
    await menu.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
  await searchButton(page).focus();
  await page.mouse.move(1, 1);
  await expect(button).toHaveCSS("opacity", "0.48", { timeout: 6500 });
  await button.focus();
  await expect(button).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  expect(
    await button.evaluate((element) =>
      parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThanOrEqual(0.00001);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("real touch input drags and snaps without opening the menu", async ({
  browser,
  browserName,
}, info) => {
  test.skip(
    browserName !== "chromium",
    "Touch drag uses Chromium's native input protocol; WebKit covers touch tap and pointer dragging separately.",
  );
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto(info.project.use.baseURL!);
    const button = capture(page);
    await expect(button).toBeVisible();
    const rect = (await button.boundingBox())!;
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: rect.x + 24, y: rect.y + 24, id: 1 }],
    });
    for (let step = 1; step <= 12; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: rect.x + 24 + ((60 - rect.x - 24) * step) / 12,
            y: rect.y + 24 + ((180 - rect.y - 24) * step) / 12,
            id: 1,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => Math.round((await button.boundingBox())!.x))
      .toBe(12);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await button.tap();
    await expect(
      page.getByRole("dialog", { name: "Quick Capture" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
