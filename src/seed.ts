import type { AppState } from "./types";

const now = Date.now();
const HOUR = 3600_000;

/**
 * 预置数据：底板损伤、刃角、打蜡状态联动。
 * 首次进入时写入 localStorage，之后仅由浏览器存储驱动。
 */
export function seedState(): AppState {
  return {
    batches: [
      { id: "WAX-L101", waxType: "低温蜡", brand: "Swix Cera-X", totalGrams: 200, heldGrams: {}, usedGrams: { "ORD-106:W-106-1": 25 } },
      { id: "WAX-M204", waxType: "中温蜡", brand: "Holmenkol Ultra", totalGrams: 160, heldGrams: { "ORD-121:W-121-1": 20 }, usedGrams: {} },
      { id: "WAX-H309", waxType: "高温蜡", brand: "TOKO Triblock", totalGrams: 120, heldGrams: {}, usedGrams: {} },
      { id: "WAX-L102", waxType: "低温蜡", brand: "Swix Cera-X（小批）", totalGrams: 30, heldGrams: {}, usedGrams: {} },
    ],
    orders: [
      {
        id: "ORD-106",
        customer: "林放",
        brand: "Burton",
        lengthCm: 156,
        boardType: "全地域",
        sideAngle: 88,
        baseAngle: 1,
        preference: "日常卡宾，喜欢稳定边刃",
        damages: [],
        wax: null,
        waxHistory: [
          {
            id: "W-106-1",
            batchId: "WAX-L101",
            waxType: "低温蜡",
            grams: 25,
            appliedAt: now - 26 * HOUR,
            state: "active",
            rejectedAt: null,
          },
        ],
        polished: true,
        status: "完工",
        createdAt: now - 48 * HOUR,
        events: [{ at: now - 24 * HOUR, text: "复检通过：刃角 88°/1°，低温蜡膜均匀，完工交付" }],
      },
      {
        id: "ORD-112",
        customer: "高岩",
        brand: "Fischer",
        lengthCm: 165,
        boardType: "竞速板",
        sideAngle: 87,
        baseAngle: 0.5,
        preference: "竞速刻滑，要最大咬雪",
        damages: [
          {
            id: "D-112-1",
            desc: "底板深划痕（伤及 P-Tex 层）",
            position: "",
            state: "未修",
            registeredAt: null,
            curedAt: null,
          },
        ],
        wax: null,
        waxHistory: [],
        polished: false,
        status: "待维护",
        createdAt: now - 8 * HOUR,
        events: [],
      },
      {
        id: "ORD-118",
        customer: "苏晓",
        brand: "Jones",
        lengthCm: 158,
        boardType: "粉雪板",
        sideAngle: 89,
        baseAngle: 1,
        preference: "弱咬雪，粉雪浮力优先",
        damages: [
          {
            id: "D-118-1",
            desc: "机头底板小面积灼烧",
            position: "机头居中偏左 3cm",
            state: "已固化",
            registeredAt: now - 20 * HOUR,
            curedAt: now - 6 * HOUR,
          },
        ],
        wax: null,
        waxHistory: [],
        polished: false,
        status: "待维护",
        createdAt: now - 22 * HOUR,
        events: [{ at: now - 6 * HOUR, text: "P-Tex 修补已确认固化，可抛光打蜡" }],
      },
      {
        id: "ORD-121",
        customer: "陈默",
        brand: "Nitro",
        lengthCm: 152,
        boardType: "公园板",
        sideAngle: 88.5,
        baseAngle: 1,
        preference: "道具为主，容错优先",
        damages: [],
        wax: {
          id: "W-121-1",
          batchId: "WAX-M204",
          waxType: "中温蜡",
          grams: 20,
          appliedAt: now - 5 * HOUR,
          state: "active",
          rejectedAt: null,
        },
        waxHistory: [],
        polished: true,
        status: "待复检",
        createdAt: now - 30 * HOUR,
        events: [
          { at: now - 5 * HOUR, text: "打蜡完成：中温蜡 20g（批次 WAX-M204）" },
          { at: now - 2 * HOUR, text: "打蜡后调整侧刃 89° → 88.5°，转待复检，批次占用保留" },
        ],
      },
    ],
  };
}
