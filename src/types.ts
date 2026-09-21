export type BoardType = "全地域" | "公园板" | "竞速板" | "粉雪板";

export type OrderStatus = "待维护" | "待复检" | "完工";

export type WaxType = "低温蜡" | "中温蜡" | "高温蜡";

export type DamageState = "未修" | "已固化";

export interface Damage {
  id: string;
  /** 底板划痕/损伤描述，如“底板划痕 12cm” */
  desc: string;
  /** 修补位置（机头 / 板中 / 板尾，可附坐标说明） */
  position: string;
  state: DamageState;
  /** P-Tex 修补登记时间 */
  registeredAt: number | null;
  /** 技师确认固化时间 */
  curedAt: number | null;
}

export type WaxState = "active" | "rejected";

export interface WaxRecord {
  id: string;
  batchId: string;
  waxType: WaxType;
  grams: number;
  appliedAt: number;
  /** 复检不通过后退回重做时标记，占用已释放，需重新打蜡 */
  state: WaxState;
  rejectedAt: number | null;
}

export interface OrderEvent {
  at: number;
  text: string;
}

export interface Order {
  id: string;
  customer: string;
  brand: string;
  lengthCm: number;
  boardType: BoardType;
  sideAngle: number;
  baseAngle: number;
  preference: string;
  damages: Damage[];
  /** 当前仍在占用批次余量/冻结同类蜡的打蜡记录（复检通过完工后清除占用，记录移入历史） */
  wax: WaxRecord | null;
  /** 历次打蜡留痕（被复检退回的蜡也保留） */
  waxHistory: WaxRecord[];
  polished: boolean;
  status: OrderStatus;
  createdAt: number;
  events: OrderEvent[];
}

export interface WaxBatch {
  id: string;
  waxType: WaxType;
  brand: string;
  totalGrams: number;
  /** 未完工工单当前占用的克重，key: 工单号:打蜡记录号 */
  heldGrams: Record<string, number>;
  /** 完工复检通过后实际消耗的克重，key: 工单号:打蜡记录号 */
  usedGrams: Record<string, number>;
}

export interface AppState {
  orders: Order[];
  batches: WaxBatch[];
}
