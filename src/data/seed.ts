import master from "./master-timetable.json";
import type { AppData } from "../lib/domain";
export { master };
const pinyin: Record<string, string> = {
  中国概况: "Zhōngguó gàikuàng",
  计算思维与人工智能: "Jìsuàn sīwéi yǔ réngōng zhìnéng",
  "微积分E（1）": "Wēijīfēn E (1)",
  经济学原理: "Jīngjìxué yuánlǐ",
  "初级汉语（1）": "Chūjí Hànyǔ (1)",
  管理学基础: "Guǎnlǐxué jīchǔ",
};
export const courseEnglish: Record<string, string> = {
  中国概况: "An introduction to China",
  计算思维与人工智能: "Computational thinking & AI",
  "微积分E（1）": "Calculus E (1)",
  经济学原理: "Principles of economics",
  "初级汉语（1）": "Elementary Chinese (1)",
  管理学基础: "Foundations of management",
};
export function seed(): AppData {
  return {
    schema: "myspace.backup.v1",
    settings: {
      theme: "dark",
      name: "",
      rate: null,
      rateAt: null,
      widgets: [
        { id: "timetable", visible: true, size: "wide" },
        { id: "countdown", visible: true, size: "normal" },
        { id: "debts", visible: true, size: "normal" },
        { id: "convert", visible: true, size: "normal" },
        { id: "subscriptions", visible: true, size: "normal" },
        { id: "randomizer", visible: true, size: "wide" },
      ],
    },
    classes: master.classes.flatMap((c, index) =>
      c.dates.map((date) => ({
        id: `master-${index}-${date}`,
        seriesId: `master-${index}`,
        course: c.course,
        pinyin: pinyin[c.course] || "",
        instructor: c.instructor,
        building: c.building,
        room: c.room,
        date,
        start: c.time.start,
        end: c.time.end,
        source: c.source_text,
        verified: false,
        notes: "",
      })),
    ),
    debts: [],
    events: [],
    subscriptions: [],
    randomizers: [],
    conversions: [],
  };
}
