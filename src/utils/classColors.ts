import type { ClassColor } from "../models";

const CLASS_COLORS: Record<string, ClassColor> = {
  "SP9 PRO": { bg: "bg-blue-600", text: "text-white" },
  "SP9 PRO-AM": { bg: "bg-blue-500", text: "text-white" },
  "SP9 AM": { bg: "bg-blue-400", text: "text-white" },
  CUP2: { bg: "bg-orange-500", text: "text-white" },
  CUP3: { bg: "bg-orange-400", text: "text-black" },
  "SP-X": { bg: "bg-emerald-500", text: "text-white" },
  SP10: { bg: "bg-cyan-500", text: "text-white" },
  "AT 1": { bg: "bg-red-500", text: "text-white" },
  "AT 2": { bg: "bg-red-400", text: "text-white" },
  "SP-PRO": { bg: "bg-purple-500", text: "text-white" },
  TCR: { bg: "bg-yellow-500", text: "text-black" },
  "BMW M240i": { bg: "bg-sky-400", text: "text-black" },
  "BMW M2": { bg: "bg-sky-500", text: "text-white" },
  SP3T: { bg: "bg-lime-500", text: "text-black" },
  SP4T: { bg: "bg-lime-600", text: "text-white" },
  SP4: { bg: "bg-lime-700", text: "text-white" },
  "BMW 325i": { bg: "bg-slate-400", text: "text-black" },
  V5: { bg: "bg-amber-600", text: "text-white" },
  V6: { bg: "bg-amber-500", text: "text-black" },
  "VT2-RWD": { bg: "bg-teal-500", text: "text-white" },
  "VT2-F+4WD": { bg: "bg-teal-600", text: "text-white" },
  SP7: { bg: "bg-indigo-500", text: "text-white" },
  SP8T: { bg: "bg-indigo-400", text: "text-white" },
  SP2T: { bg: "bg-pink-500", text: "text-white" },
  V3: { bg: "bg-rose-400", text: "text-white" },
};

const DEFAULT_COLOR: ClassColor = { bg: "bg-gray-500", text: "text-white" };

export function getClassColor(className: string): ClassColor {
  return CLASS_COLORS[className] || DEFAULT_COLOR;
}

export const CLASS_ORDER: string[] = [
  "SP9 PRO",
  "SP9 PRO-AM",
  "SP9 AM",
  "CUP2",
  "CUP3",
  "SP-X",
  "SP-PRO",
  "SP10",
  "AT 1",
  "AT 2",
  "TCR",
  "SP3T",
  "SP4T",
  "SP4",
  "SP7",
  "SP8T",
  "SP2T",
  "BMW M240i",
  "BMW M2",
  "BMW 325i",
  "V3",
  "V5",
  "V6",
  "VT2-RWD",
  "VT2-F+4WD",
];

export const STINT_COLORS: string[] = [
  "#2979ff",
  "#00c853",
  "#ff6d00",
  "#aa00ff",
  "#00bcd4",
  "#ffd600",
  "#ff1744",
  "#76ff03",
];
