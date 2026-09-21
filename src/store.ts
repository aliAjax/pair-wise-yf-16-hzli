import { useEffect, useReducer } from "react";
import { buildSeedState, STORAGE_KEY } from "./seed";
import type {
  EdgeAngle,
  LogEntry,
  Order,
  PersistState,
  WaxBatch,
} from "./types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

type Action =
  | { type: "RESET" }
  | { type: "REGISTER_REPAIR"; orderId: string; damageId: string; location: string }
  | { type: "CONFIRM_CURE"; orderId: string; damageId: string }
  | {
      type: "APPLY_WAX";
      orderId: string;
      batchId: string;
      amount: number;
    }
  | { type: "SAVE_EDGE"; orderId: string; edge: EdgeAngle }
  | { type: "SUBMIT_RECHECK"; orderId: string }
  | { type: "PASS_RECHECK"; orderId: string }
  | { type: "FAIL_RECHECK"; orderId: string; reason: string }
  | { type: "COMPLETE"; orderId: string };

let logSeq = 0;
export function nowStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function makeLog(message: string): LogEntry {
  logSeq += 1;
  return { id: `LOG-${Date.now()}-${logSeq}`, at: nowStamp(), message };
}

/** 返回占用某蜡类型的未完工工单（用于“同类蜡被其他工单冻结”判断） */
export function findFrozenHolder(
  state: PersistState,
  waxType: string,
  orderId: string
): Order | undefined {
  return state.orders.find(
    (o) =>
      o.status !== "done" &&
      o.id !== orderId &&
      o.wax !== null &&
      o.wax.waxType === waxType
  );
}

function appendLog(logs: LogEntry[], message: string): LogEntry[] {
  return [makeLog(message), ...logs].slice(0, 80);
}

/**
 * 打蜡前置校验。任何一条不通过都返回错误信息，
 * 调用方据此整单拒绝，不写入任何状态。
 */
export function validateWax(
  state: PersistState,
  order: Order,
  batchId: string,
  amount: number
): { ok: true; batch: WaxBatch } | { ok: false; message: string } {
  if (order.wax) {
    return { ok: false, message: "该工单已有打蜡记录，不能重复打蜡" };
  }
  if (order.status === "done") {
    return { ok: false, message: "工单已完工，不可再打蜡" };
  }

  const openDamage = order.damages.find((d) => !d.cured);
  if (openDamage) {
    if (!openDamage.repairLocation.trim()) {
      return {
        ok: false,
        message: `底板损伤「${openDamage.description}」尚未登记修补位置，不能抛光打蜡`,
      };
    }
    return {
      ok: false,
      message: `底板损伤「${openDamage.description}」修补后未确认固化，不能抛光打蜡`,
    };
  }

  const batch = state.batches.find((b) => b.id === batchId);
  if (!batch) {
    return { ok: false, message: "必须选择现有蜡批次" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "打蜡用量必须大于 0 克" };
  }
  if (batch.remaining < amount) {
    return {
      ok: false,
      message: `批次 ${batch.id}（${batch.waxName}）余量仅剩 ${batch.remaining}g，不足 ${amount}g，整单拒绝`,
    };
  }

  const holder = findFrozenHolder(state, batch.waxType, order.id);
  if (holder) {
    return {
      ok: false,
      message: `${batch.waxName} 所属蜡类型（${waxTypeLabel(
        batch.waxType
      )}）正被工单 ${holder.id}（${holder.customer}）冻结占用，整单拒绝`,
    };
  }

  return { ok: true, batch };
}

export function waxTypeLabel(t: string): string {
  switch (t) {
    case "low":
      return "低温蜡";
    case "mid":
      return "中温蜡";
    case "high":
      return "高温蜡";
    case "all":
      return "全温蜡";
    default:
      return t;
  }
}

export function reducer(state: PersistState, action: Action): PersistState {
  switch (action.type) {
    case "RESET":
      return buildSeedState();

    case "REGISTER_REPAIR": {
      const location = action.location.trim();
      if (!location) return state;
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id !== action.orderId
            ? o
            : {
                ...o,
                damages: o.damages.map((d) =>
                  d.id === action.damageId ? { ...d, repairLocation: location } : d
                ),
              }
        ),
        logs: appendLog(
          state.logs,
          `${action.orderId} 登记损伤修补位置：${location}`
        ),
      };
    }

    case "CONFIRM_CURE": {
      const order = state.orders.find((o) => o.id === action.orderId);
      const damage = order?.damages.find((d) => d.id === action.damageId);
      if (!order || !damage || !damage.repairLocation.trim() || damage.cured) {
        return state;
      }
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id !== action.orderId
            ? o
            : {
                ...o,
                damages: o.damages.map((d) =>
                  d.id === action.damageId ? { ...d, cured: true } : d
                ),
              }
        ),
        logs: appendLog(
          state.logs,
          `${order.id}「${damage.description}」修补已确认固化，可抛光打蜡`
        ),
      };
    }

    case "APPLY_WAX": {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order) return state;
      const result = validateWax(state, order, action.batchId, action.amount);
      if (!result.ok) return state; // 整单拒绝：工单、批次、损伤记录保持原样
      const batch = result.batch;

      const wax = {
        batchId: batch.id,
        waxName: batch.waxName,
        waxType: batch.waxType,
        amount: action.amount,
        appliedAt: nowStamp(),
      };

      return {
        ...state,
        batches: state.batches.map((b) =>
          b.id === batch.id ? { ...b, remaining: b.remaining - action.amount } : b
        ),
        orders: state.orders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                wax,
                status: o.status === "redo" ? "redo" : "waxed",
              }
            : o
        ),
        logs: appendLog(
          state.logs,
          `${order.id} 使用 ${batch.id} ${batch.waxName} ${action.amount}g 完成打蜡，批次余量同步扣减`
        ),
      };
    }

    case "SAVE_EDGE": {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order) return state;
      const { side, base } = action.edge;
      if (!Number.isFinite(side) || !Number.isFinite(base)) return state;

      const unchanged = order.edge.side === side && order.edge.base === base;
      // 已打蜡（含重做中）之后改动刃角 → 待复检，批次占用保留
      const becomesRecheck =
        !unchanged && order.wax !== null && order.status !== "done";
      const nextStatus = becomesRecheck
        ? "recheck"
        : order.status === "redo" && unchanged
        ? "redo"
        : order.status;

      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === order.id ? { ...o, edge: { side, base }, status: nextStatus } : o
        ),
        logs: becomesRecheck
          ? appendLog(
              state.logs,
              `${order.id} 打蜡后刃角改为侧刃 ${side}° / 底刃 ${base}°，转待复检，蜡批次占用保留`
            )
          : state.logs,
      };
    }

    case "SUBMIT_RECHECK": {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order || !order.wax || (order.status !== "redo" && order.status !== "waxed")) {
        return state;
      }
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === order.id ? { ...o, status: "recheck" } : o
        ),
        logs: appendLog(state.logs, `${order.id} 已送交复检`),
      };
    }

    case "PASS_RECHECK": {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order || order.status !== "recheck") return state;
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === order.id ? { ...o, status: "waxed" } : o
        ),
        logs: appendLog(state.logs, `${order.id} 复检通过`),
      };
    }

    case "FAIL_RECHECK": {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order || order.status !== "recheck") return state;
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === order.id ? { ...o, status: "redo" } : o
        ),
        logs: appendLog(
          state.logs,
          `${order.id} 复检不通过${
            action.reason.trim() ? `（${action.reason.trim()}）` : ""
          }，退回重做，批次占用保留`
        ),
      };
    }

    case "COMPLETE": {
      const order = state.orders.find((o) => o.id === action.orderId);
      // 只有“已打蜡且复检通过”的工单可以完工：待维护/待复检/重做中均不行
      if (!order || !order.wax || order.status !== "waxed") {
        return state;
      }
      const openDamage = order.damages.find((d) => !d.cured);
      if (openDamage) return state;
      const now = nowStamp();
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === order.id
            ? { ...o, status: "done", completedAt: now }
            : o
        ),
        logs: appendLog(
          state.logs,
          `${order.id} 抛光交付完成，工单转入完工，已同步客户历史`
        ),
      };
    }

    default:
      return state;
  }
}

function loadInitialState(): PersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistState;
      if (Array.isArray(parsed.orders) && Array.isArray(parsed.batches)) {
        return parsed;
      }
    }
  } catch {
    // 存储损坏时回退到预置数据
  }
  return buildSeedState();
}

export function useWorkbench() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储空间不足等情况下静默，不影响当前操作
    }
  }, [state]);

  return { state, dispatch };
}
