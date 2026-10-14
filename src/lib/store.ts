import Dexie, { liveQuery, type Table } from "dexie";
import { create } from "zustand";
import { appSchema, type AppData } from "./domain";
import { seed } from "../data/seed";
export class MyspaceDB extends Dexie {
  documents!: Table<{ id: string; data: AppData }>;
  constructor(name = "myspace-v1") {
    super(name);
    this.version(1).stores({ documents: "id" });
  }
}
export const db = new MyspaceDB();
type State = {
  data: AppData | null;
  error: string;
  ready: boolean;
  notice: string;
  setNotice: (message: string) => void;
};
export const useApp = create<State>((set) => ({
  data: null,
  error: "",
  ready: false,
  notice: "",
  setNotice: (notice) => set({ notice }),
}));
let started = false;
export async function initialize() {
  if (started) return;
  started = true;
  try {
    await db.transaction("rw", db.documents, async () => {
      if (!(await db.documents.get("main")))
        await db.documents.put({ id: "main", data: seed() });
    });
    liveQuery(() => db.documents.get("main")).subscribe({
      next: (record) => {
        if (record)
          useApp.setState({
            data: appSchema.parse(record.data),
            ready: true,
            error: "",
          });
      },
      error: (error) => useApp.setState({ error: String(error), ready: true }),
    });
  } catch (error) {
    useApp.setState({
      error: `Penyimpanan lokal tidak tersedia: ${String(error)}`,
      ready: true,
    });
  }
}
export async function change(edit: (draft: AppData) => void) {
  try {
    await db.transaction("rw", db.documents, async () => {
      const record = await db.documents.get("main");
      if (!record) throw new Error("Data belum siap.");
      // Apply additive defaults before editing older v1 documents; never reseed.
      const draft = appSchema.parse(record.data);
      edit(draft);
      const data = appSchema.parse(draft);
      await db.documents.put({ id: "main", data });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    useApp.getState().setNotice(message);
    throw error;
  }
}
export async function replaceData(data: AppData) {
  const validated = appSchema.parse(data);
  await db.transaction("rw", db.documents, () =>
    db.documents.put({ id: "main", data: validated }),
  );
}
export const announce = (message: string) =>
  useApp.getState().setNotice(message);
