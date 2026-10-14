import "fake-indexeddb/auto";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  createCommands,
  searchCommands,
  captureCommandIds,
} from "../../src/lib/commands";
import { capturePoint, snapCapture } from "../../src/lib/capture-position";
import { appSchema, parseBackup } from "../../src/lib/domain";
import { seed } from "../../src/data/seed";
import { change, db } from "../../src/lib/store";

const navigate = vi.fn(),
  openEditor = vi.fn();
const commands = createCommands({ navigate, openEditor });
describe("shared bilingual command registry", () => {
  it.each([
    ["JADWAL", "go-timetable"],
    ["kel", "go-timetable"],
    ["scheDUL", "go-timetable"],
    ["hutang", "go-debts"],
    ["debt", "go-debts"],
    ["kurs", "go-convert"],
    ["uang", "go-convert"],
    ["convert currency", "go-convert"],
    ["convert uang", "go-convert"],
    ["tanggal", "go-countdown"],
    ["event", "go-countdown"],
    ["billing", "go-subscriptions"],
    ["langganan", "go-subscriptions"],
    ["acak", "go-randomizer"],
    ["pilih", "go-randomizer"],
    ["  ADD   DEBT ", "add-debt"],
    ["tambah ut", "add-debt"],
    ["buat countdown", "add-countdown"],
    ["add countdown", "add-countdown"],
    ["tambah subscription", "add-subscription"],
    ["catatan", "quick-note"],
  ])("matches %s", (query, id) =>
    expect(searchCommands(commands, query)[0].id).toBe(id),
  );
  it("returns immediate defaults, empty results and unique commands", () => {
    expect(searchCommands(commands, " ")).toEqual(commands);
    expect(searchCommands(commands, "xyz-no-match")).toEqual([]);
    expect(new Set(commands.map((c) => c.id)).size).toBe(commands.length);
    expect(
      captureCommandIds.every((id) => commands.some((c) => c.id === id)),
    ).toBe(true);
  });
  it("runs navigation and creation through one registry", () => {
    commands.find((c) => c.id === "go-timetable")!.action();
    expect(navigate).toHaveBeenCalledWith("timetable");
    commands.find((c) => c.id === "add-debt")!.action();
    expect(openEditor).toHaveBeenCalledWith("debt");
  });
});
describe("capture position", () => {
  const bounds = { left: 12, top: 12, right: 378, bottom: 832 };
  it("snaps nearest edge and clamps vertical position", () => {
    expect(snapCapture({ x: 30, y: -100 }, bounds)).toEqual({
      side: "left",
      y: 0,
    });
    expect(snapCapture({ x: 350, y: 900 }, bounds)).toEqual({
      side: "right",
      y: 1,
    });
    expect(capturePoint({ side: "right", y: 1 }, bounds)).toEqual({
      x: 330,
      y: 784,
    });
  });
  it("keeps a proportional position when resized and handles tiny viewports", () => {
    expect(
      capturePoint({ side: "left", y: 0.5 }, { ...bounds, bottom: 400 }),
    ).toEqual({ x: 12, y: 182 });
    expect(
      snapCapture({ x: 0, y: 0 }, { left: 0, top: 0, right: 40, bottom: 40 }).y,
    ).toBe(0);
  });
});
describe("additive v1 data compatibility", () => {
  afterAll(async () => {
    await db.delete();
  });
  it("reads old backups without rewriting the input or changing existing records", () => {
    const original = seed();
    const legacy = JSON.parse(JSON.stringify(original));
    delete legacy.quickNotes;
    delete legacy.settings.capturePosition;
    const parsed = parseBackup(JSON.stringify(legacy));
    expect(parsed).toEqual(original);
    expect(legacy.quickNotes).toBeUndefined();
    expect(parsed.classes).toEqual(original.classes);
  });
  it("writes new fields into an old database and retains every old field", async () => {
    const legacy = JSON.parse(JSON.stringify(seed()));
    delete legacy.quickNotes;
    delete legacy.settings.capturePosition;
    await db.documents.put({ id: "main", data: legacy });
    const note = {
      id: "note-1",
      body: "Remember this",
      createdAt: "2026-10-14T04:00:00Z",
    };
    await change((draft) => {
      draft.quickNotes.push(note);
      draft.settings.capturePosition = { side: "left", y: 0.3 };
    });
    db.close();
    await db.open();
    const saved = (await db.documents.get("main"))!.data;
    expect(saved.classes).toEqual(legacy.classes);
    expect(saved.quickNotes).toEqual([note]);
    expect(saved.settings.capturePosition).toEqual({ side: "left", y: 0.3 });
    expect(parseBackup(JSON.stringify(saved))).toEqual(saved);
    const { capturePosition, ...oldSettings } = saved.settings;
    expect(oldSettings).toEqual(legacy.settings);
  });
  it("rejects invalid notes and position before writing", async () => {
    const saved = (await db.documents.get("main"))!.data;
    expect(
      appSchema.safeParse({
        ...saved,
        quickNotes: [{ ...saved.quickNotes[0], body: " " }],
      }).success,
    ).toBe(false);
    expect(
      appSchema.safeParse({
        ...saved,
        quickNotes: [saved.quickNotes[0], saved.quickNotes[0]],
      }).success,
    ).toBe(false);
    await expect(
      change((draft) => {
        draft.settings.capturePosition.y = 2;
      }),
    ).rejects.toThrow();
    expect((await db.documents.get("main"))!.data).toEqual(saved);
  });
});
