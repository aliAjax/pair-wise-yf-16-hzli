import { useSyncExternalStore } from "react";
import type {
  AppState,
  BoardType,
  Damage,
  Order,
  OrderEvent,
  OrderStatus,
  WaxRecord,
  WaxType,
} from "./types";
import { seedState } from "./seed";

const STORAGE_KEY = "ski-bench-state-v1";

/* ----------------------------- 持久化加载 ----------------------------- */

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.orders && parsed.batches) {
        parsed.orders.forEach((o) => {
          o.waxHistory ??= [];
          o.events ??= [];
        });
        parsed.batches.forEach((b) => {
          b.heldGrams ??= {};
          b.usedGrams ??= {};
        });
        return parsed;
      }
    }
  } catch {
    /* 数据损坏则回退种子 */
  }
  return seedState();
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 存储空间不足时忽略，内存仍可用 */
  }
}

function emit(next: AppState) {
  state = next;
  persist();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return state;
}

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function resetDemo() {
  emit(seedState());
}

/** 仅供逻辑测试读取当前快照 */
export function getStateForTest(): AppState {
  return state;
}

/* ------------------------------- 工具 -------------------------------- */

const now = () => Date.now();

function addEvent(order: Order, text: string, at = now()): Order {
  const event: OrderEvent = { at, text };
  return { ...order, events: [event, ...order.events] };
}

export function batchRemaining(b: AppState["batches"][number]): number {
  const held = Object.values(b.heldGrams).reduce((s, g) => s + g, 0);
  const used = Object.values(b.usedGrams).reduce((s, g) => s + g, 0);
  return b.totalGrams - held - used;
}

/** 当前占用某类蜡（即冻结同类蜡）的其他工单，完工/退回后自动解冻 */
export function freezingOrders(s: AppState, type: WaxType, exceptOrderId?: string): Order[] {
  return s.orders.filter(
    (o) => o.id !== exceptOrderId && o.wax && o.wax.state === "active" && o.wax.waxType === type,
  );
}

function fail(msg: string): never {
  throw new Error(msg);
}

/* ------------------------------ 业务动作 ------------------------------ */

export interface NewOrderInput {
  customer: string;
  brand: string;
  lengthCm: number;
  boardType: BoardType;
  sideAngle: number;
  baseAngle: number;
  preference: string;
}

export function createOrder(input: NewOrderInput) {
  const seq = 122 + state.orders.filter((o) => o.id.startsWith("ORD-N")).length;
  const id = `ORD-N${String(seq).padStart(3, "0")}`;
  const order: Order = {
    id,
    ...input,
    damages: [],
    wax: null,
    waxHistory: [],
    polished: false,
    status: "待维护",
    createdAt: now(),
    events: [{ at: now(), text: `新建工单：${input.brand} ${input.lengthCm}cm ${input.boardType}` }],
  };
  emit({ ...state, orders: [order, ...state.orders] });
}

/** 底板损伤登记：描述 + 修补位置必填，登记后仍为“未修” */
export function addDamage(orderId: string, desc: string, position: string) {
  if (!desc.trim()) fail("请填写底板损伤描述");
  if (!position.trim()) fail("未修损伤必须登记修补位置");
  emit({
    ...state,
    orders: state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const damage: Damage = {
        id: `D-${Date.now()}`,
        desc: desc.trim(),
        position: position.trim(),
        state: "未修",
        registeredAt: now(),
        curedAt: null,
      };
      return addEvent(
        { ...o, damages: [...o.damages, damage] },
        `登记底板损伤：${damage.desc}；修补位置：${damage.position}（P-Tex 待固化）`,
      );
    }),
  });
}

/** 为已发现但尚未登记位置的损伤补登修补位置（如接板时先记录的划痕） */
export function registerPosition(orderId: string, damageId: string, position: string) {
  if (!position.trim()) fail("修补位置不能为空");
  emit({
    ...state,
    orders: state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const target = o.damages.find((d) => d.id === damageId);
      if (!target || target.state !== "未修") return o;
      return addEvent(
        {
          ...o,
          damages: o.damages.map((d) =>
            d.id === damageId
              ? { ...d, position: position.trim(), registeredAt: d.registeredAt ?? now() }
              : d,
          ),
        },
        `登记修补位置：${target.desc} → ${position.trim()}（P-Tex 待固化）`,
      );
    }),
  });
}

/** 确认 P-Tex 固化：只有已登记位置的未修损伤可确认 */
export function confirmCure(orderId: string, damageId: string) {
  const order = state.orders.find((o) => o.id === orderId);
  const damage = order?.damages.find((d) => d.id === damageId);
  if (damage && damage.state === "未修" && !damage.position.trim()) {
    fail("必须先登记修补位置，才能确认固化");
  }
  emit({
    ...state,
    orders: state.orders.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        damages: o.damages.map((d) =>
          d.id === damageId && d.state === "未修"
            ? { ...d, state: "已固化", curedAt: now() }
            : d,
        ),
        events: [
          { at: now(), text: "P-Tex 修补已确认固化，可以抛光打蜡" },
          ...o.events,
        ],
      };
    }),
  });
}

/**
 * 抛光打蜡（一次完成抛光+打蜡，符合店内“抛光后打蜡”工序）。
 * 前置：① 完工单不可再操作；② 不存在未固化损伤；③ 必须选现有批次；
 *      ④ 批次余量充足；⑤ 同类蜡未被其他工单冻结。
 * 任一不满足则整单拒绝：工单、批次、损伤记录全部保持原样。
 */
export function applyWax(orderId: string, batchId: string, grams: number) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) fail("工单不存在");
  if (order.status === "完工") fail("工单已完工，不能再打蜡");

  const uncured = order.damages.filter((d) => d.state !== "已固化");
  if (uncured.length > 0) {
    fail(`还有 ${uncured.length} 处底板损伤未登记/未固化，必须确认固化后才能抛光打蜡`);
  }
  if (!grams || grams <= 0) fail("请填写有效的打蜡克重");
  if (!batchId) fail("新增打蜡必须选择现有蜡批次");

  const batch = state.batches.find((b) => b.id === batchId);
  if (!batch) fail("所选蜡批次不存在");

  const remaining = batchRemaining(batch);
  if (remaining < grams) {
    fail(`整单拒绝：批次 ${batch.id}（${batch.waxType}）余量仅 ${remaining}g，不足 ${grams}g，工单与批次保持原样`);
  }

  const blocked = freezingOrders(state, batch.waxType, orderId);
  if (blocked.length > 0) {
    fail(
      `整单拒绝：同类${batch.waxType}已被工单 ${blocked.map((o) => o.id).join("、")} 冻结，工单与批次保持原样`,
    );
  }

  // 全部校验通过，原子写入：占用批次余量并冻结同类蜡
  const waxId = `W-${Date.now()}`;
  const wax: WaxRecord = {
    id: waxId,
    batchId: batch.id,
    waxType: batch.waxType,
    grams,
    appliedAt: now(),
    state: "active",
    rejectedAt: null,
  };

  emit({
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? addEvent(
            {
              ...o,
              wax,
              waxHistory: [wax, ...o.waxHistory],
              polished: true,
              // 打蜡后进入待复检；若再改刃角仍停留待复检且占用保留
              status: "待复检" as OrderStatus,
            },
            `抛光并打蜡：${batch.waxType} ${grams}g，批次 ${batch.id}；占用余量并冻结同类蜡，转待复检`,
          )
        : o,
    ),
    batches: state.batches.map((b) =>
      b.id === batch.id
        ? { ...b, heldGrams: { ...b.heldGrams, [`${orderId}:${waxId}`]: grams } }
        : b,
    ),
  });
}

/**
 * 打蜡后调整刃角：必须已有生效打蜡；结果转/保持待复检，批次占用保留。
 */
export function adjustAngles(orderId: string, sideAngle: number, baseAngle: number) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) fail("工单不存在");
  if (!order.wax || order.wax.state !== "active") {
    fail("只有打蜡后才能改动刃角；当前没有生效的打蜡记录");
  }
  const prevSide = order.sideAngle;
  const prevBase = order.baseAngle;
  if (prevSide === sideAngle && prevBase === baseAngle) fail("刃角未发生变化");

  emit({
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? addEvent(
            { ...o, sideAngle, baseAngle, status: "待复检" },
            `打蜡后改动刃角：侧刃 ${prevSide}° → ${sideAngle}°，底刃 ${prevBase}° → ${baseAngle}°；转待复检，批次 ${o.wax!.batchId} 占用保留`,
          )
        : o,
    ),
  });
}

/**
 * 复检。不通过：退回重做——状态回待维护、占用释放、同类蜡解冻、
 * 抛光标记清除、原打蜡记录标记 rejected 并保留留痕。
 */
export function reinspect(orderId: string, pass: boolean, note?: string) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) fail("工单不存在");
  if (order.status !== "待复检") fail("只有待复检工单可以提交复检结论");
  if (!order.wax) fail("缺少打蜡记录，无法复检");

  const wax = order.wax;
  const holdKey = `${orderId}:${wax.id}`;

  if (pass) {
    // 通过：占用转实际消耗，冻结解除（无生效打蜡自然不再冻结），工单完工
    emit({
      ...state,
      orders: state.orders.map((o) =>
        o.id === orderId
          ? addEvent(
              { ...o, wax: null, status: "完工" },
              `复检通过${note ? `：${note}` : ""}，打蜡消耗 ${wax.grams}g 入账，完工交付`,
            )
          : o,
      ),
      batches: state.batches.map((b) => {
        if (b.id !== wax.batchId) return b;
        const held = { ...b.heldGrams };
        delete held[holdKey];
        return { ...b, heldGrams: held, usedGrams: { ...b.usedGrams, [holdKey]: wax.grams } };
      }),
    });
  } else {
    emit({
      ...state,
      orders: state.orders.map((o) =>
        o.id === orderId
          ? addEvent(
              {
                ...o,
                status: "待维护",
                polished: false,
                wax: null,
                waxHistory: o.waxHistory.map((w) =>
                  w.id === wax.id ? { ...w, state: "rejected" as const, rejectedAt: now() } : w,
                ),
              },
              `复检不通过${note ? `：${note}` : ""}，退回重做；释放批次 ${wax.batchId} 占用 ${wax.grams}g 并解除同类蜡冻结`,
            )
          : o,
      ),
      batches: state.batches.map((b) => {
        if (b.id !== wax.batchId) return b;
        const held = { ...b.heldGrams };
        delete held[holdKey];
        return { ...b, heldGrams: held };
      }),
    });
  }
}
