import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, name: string) {
  if (
    await page
      .getByRole("button", { name: "Buka navigasi", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Buka navigasi", exact: true })
      .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Your everyday, in order." }),
  ).toBeVisible();
});
test("responsive dashboard, week edit, verified offline map, persistent theme", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-dashboard.png`,
    fullPage: true,
    animations: "disabled",
  });
  await nav(page, "Timetable");
  await page.getByLabel("Lompat ke tanggal").fill("2026-10-12");
  await page
    .getByRole("button")
    .filter({ hasText: "初级汉语（1）" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Diànjī lóu");
  await expect(page.locator(".map-canvas svg")).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-class-map.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Edit kelas", exact: true }).click();
  await page.getByLabel("Ruang", { exact: true }).fill("30030");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button").filter({ hasText: "初级汉语（1）" }).first(),
  ).toContainText("30030");
  await page
    .getByRole("button", { name: "Buka pengaturan", exact: true })
    .click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});
test("debt partial and complete payment persists with history", async ({
  page,
}) => {
  await nav(page, "Debt tracker");
  await page.getByRole("button", { name: "Tambah utang", exact: true }).click();
  await page.getByLabel("Nama", { exact: true }).fill("Test friend");
  await page.getByLabel("Alasan", { exact: true }).fill("Dinner");
  await page.getByLabel("Jumlah awal").fill("100");
  await page.getByLabel("Mata uang").selectOption("CNY");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button").filter({ hasText: "Test friend" }).click();
  await page.getByRole("button", { name: "Catat pembayaran" }).click();
  await page.getByLabel("Pembayaran (CNY)").fill("40");
  await page.getByLabel("Catatan (opsional)").fill("First transfer");
  await page.getByRole("button", { name: "Simpan pembayaran" }).click();
  await expect(page.locator(".detail-balance")).toContainText("60,00");
  await expect(page.locator(".history-list")).toContainText("First transfer");
  await page.getByRole("button", { name: "Catat pembayaran" }).click();
  await page.getByRole("button", { name: "Simpan pembayaran" }).click();
  await expect(page.getByRole("dialog")).toContainText("Lunas");
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.reload();
  await page.getByLabel("Tampilkan lunas").check();
  await expect(
    page.getByRole("button").filter({ hasText: "Test friend" }),
  ).toContainText("Lunas");
});
test("converter, countdown, subscription, randomizer and backup roundtrip", async ({
  page,
}) => {
  await nav(page, "Quick convert");
  await page.getByRole("button", { name: "Atur kurs manual" }).click();
  await page.getByLabel("1 CNY = berapa IDR?").fill("2200");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Jumlah konversi").fill("2");
  await expect(page.locator("output")).toHaveText("4.400");
  await page.getByRole("button", { name: "Simpan konversi" }).click();
  await expect(page.locator(".history-panel")).toContainText("4.400 IDR");
  await nav(page, "Countdown hub");
  await page.getByRole("button", { name: "Tambah countdown" }).click();
  await page.getByLabel("Nama event").fill("Semester break");
  await page.getByLabel("Tanggal", { exact: true }).fill("2026-12-31");
  await page.getByLabel("Pengulangan").selectOption("yearly");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".countdown-feature")).toContainText(
    "Semester break",
  );
  await nav(page, "Subscriptions");
  await page
    .getByRole("button", { name: "Tambah subscription", exact: true })
    .first()
    .click();
  await page.getByLabel("Nama layanan").fill("Test service");
  await page.getByLabel("Biaya per tagihan").fill("10");
  await page.getByLabel("Mata uang").selectOption("CNY");
  await page.getByLabel("Tanggal tagihan awal").fill("2026-01-31");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button").filter({ hasText: "Test service" }).click();
  await page.getByRole("button", { name: "Tandai dibayar" }).click();
  await page.getByRole("button", { name: "Konfirmasi pembayaran" }).click();
  await expect(page.locator(".detail-balance")).toContainText(
    "28 February 2026",
  );
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await nav(page, "Randomizer");
  await page.getByRole("button", { name: "Buat daftar pilihan" }).click();
  await page.getByLabel("Nama daftar").fill("Lunch");
  await page
    .getByLabel("Pilihan", { exact: true })
    .fill("Noodles\nDumplings\nRice");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Let it roll" }).click();
  await expect(page.getByRole("button", { name: "Let it roll" })).toBeEnabled({
    timeout: 5000,
  });
  expect(["Noodles", "Dumplings", "Rice"]).toContain(
    await page.locator(".rolling-window strong").textContent(),
  );
  await page
    .getByRole("button", { name: "Buka pengaturan", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const file = await download;
  const path = await file.path();
  expect(path).toBeTruthy();
  await page.getByLabel("File backup").setInputFiles(path!);
  await expect(page.locator(".import-preview")).toContainText("1 subscription");
  await expect(
    page.getByRole("button", { name: "Import dan ganti data" }),
  ).toBeDisabled();
  await page.getByLabel("Ganti semua data").check();
  await page.getByRole("button", { name: "Import dan ganti data" }).click();
  await expect(page.locator(".import-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.reload();
  await expect(page.locator(".random-toolbar")).toContainText("Lunch");
});
test("customize persists and offline reload keeps full app and map", async ({
  page,
  context,
}, info) => {
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByLabel("Debt tracker", { exact: true }).click();
  await expect(
    page.getByLabel("Debt tracker", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Ukuran Quick convert").selectOption("wide");
  await expect(page.getByLabel("Ukuran Quick convert")).toHaveValue("wide");
  await page
    .getByRole("button", { name: "Pindah Quick convert ke atas" })
    .click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator("[data-widget=debts]")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-widget=convert]")).toHaveClass(/wide/);
  // Service workers are tested in Chromium; WebKit emulates iPhone layout and IndexedDB separately.
  if (info.project.name === "desktop") {
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your everyday, in order." }),
    ).toBeVisible();
    await nav(page, "Timetable");
    await page.getByLabel("Lompat ke tanggal").fill("2026-10-12");
    await page
      .getByRole("button")
      .filter({ hasText: "初级汉语（1）" })
      .first()
      .click();
    await expect(page.locator(".map-canvas svg")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(
      "tersimpan · tersedia offline",
    );
    await context.setOffline(false);
  }
});
