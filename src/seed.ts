import type { PersistState } from "./types";

/**
 * 预置工作台数据：
 * - ORD-106 已打蜡（占用低温蜡批次）
 * - ORD-112 有未修底板划痕，演示“登记位置+固化”门禁
 * - ORD-118 无损伤可直接打蜡
 * - ORD-124 已登记位置但未确认固化
 * - ORD-131 完工（张雪历史第二条）
 * - 批次 WAX-L02 演示“同类蜡被其他工单冻结”
 */
export const STORAGE_KEY = "snowboard-workbench-v1";

export function buildSeedState(): PersistState {
  return {
    batches: [
      { id: "WAX-L01", waxName: "极地低温蜡", waxType: "low", tempRange: "-20℃ ~ -8℃", remaining: 240 },
      { id: "WAX-L02", waxName: "北风低温蜡", waxType: "low", tempRange: "-15℃ ~ -5℃", remaining: 300 },
      { id: "WAX-M01", waxName: "四季通用蜡", waxType: "mid", tempRange: "-6℃ ~ 4℃", remaining: 180 },
      { id: "WAX-H01", waxName: "竞速高温蜡", waxType: "high", tempRange: "0℃ ~ 10℃", remaining: 90 },
      { id: "WAX-A01", waxName: "全温滑行蜡", waxType: "all", tempRange: "-10℃ ~ 8℃", remaining: 12 },
    ],
    orders: [
      {
        id: "ORD-106",
        customer: "张雪",
        brand: "Burton Custom",
        lengthCm: 156,
        boardType: "all-mountain",
        edge: { side: 88, base: 1 },
        damages: [
          { id: "DMG-106-1", description: "板尾浅划痕 3cm", repairLocation: "板尾靠右刃 3cm 处", cured: true },
        ],
        wax: {
          batchId: "WAX-L01",
          waxName: "极地低温蜡",
          waxType: "low",
          amount: 35,
          appliedAt: "2026-09-18 10:20",
        },
        status: "waxed",
        preference: "偏好高速滑行",
        createdAt: "2026-09-18 09:00",
        completedAt: null,
      },
      {
        id: "ORD-112",
        customer: "李速",
        brand: "Volkl Racetiger",
        lengthCm: 165,
        boardType: "race",
        edge: { side: 87, base: 0.5 },
        damages: [
          { id: "DMG-112-1", description: "底板纵深划痕 12cm", repairLocation: "", cured: false },
        ],
        wax: null,
        status: "pending",
        preference: "弱咬雪，刃不要过利",
        createdAt: "2026-09-19 14:10",
        completedAt: null,
      },
      {
        id: "ORD-118",
        customer: "王野",
        brand: "Jones Hovercraft",
        lengthCm: 158,
        boardType: "powder",
        edge: { side: 89, base: 1 },
        damages: [],
        wax: null,
        status: "pending",
        preference: "粉雪浮力优先",
        createdAt: "2026-09-19 16:30",
        completedAt: null,
      },
      {
        id: "ORD-124",
        customer: "陈峰",
        brand: "DC PBJ",
        lengthCm: 152,
        boardType: "park",
        edge: { side: 88, base: 1 },
        damages: [
          { id: "DMG-124-1", description: "固定器下方 P-Tex 剥落", repairLocation: "前固定器下方底板", cured: false },
        ],
        wax: null,
        status: "pending",
        preference: "公园道具为主",
        createdAt: "2026-09-20 11:05",
        completedAt: null,
      },
      {
        id: "ORD-131",
        customer: "张雪",
        brand: "Burton Process",
        lengthCm: 154,
        boardType: "park",
        edge: { side: 88, base: 1 },
        damages: [
          { id: "DMG-131-1", description: "板头轻微烧底", repairLocation: "板头居中", cured: true },
        ],
        wax: {
          batchId: "WAX-M01",
          waxName: "四季通用蜡",
          waxType: "mid",
          amount: 30,
          appliedAt: "2026-08-30 15:00",
        },
        status: "done",
        preference: "偏好高速滑行",
        createdAt: "2026-08-30 13:40",
        completedAt: "2026-08-30 17:20",
      },
    ],
    logs: [
      { id: "LOG-SEED-1", at: "2026-09-18 10:20", message: "ORD-106 使用 WAX-L01 极地低温蜡 35g 完成打蜡" },
      { id: "LOG-SEED-2", at: "2026-08-30 17:20", message: "ORD-131 复检通过，工单完工" },
    ],
  };
}
