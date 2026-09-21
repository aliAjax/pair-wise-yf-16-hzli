export type OrderStatus =
  | "pending" // 待维护
  | "waxed" // 已打蜡
  | "recheck" // 待复检
  | "redo" // 重做中
  | "done"; // 完工

export type BoardType = "all-mountain" | "park" | "race" | "powder";

export interface Damage {
  id: string;
  description: string;
  /** 修补位置，空串表示尚未登记 */
  repairLocation: string;
  /** 是否已确认固化 */
  cured: boolean;
}

export interface EdgeAngle {
  /** 侧刃角度（度） */
  side: number;
  /** 底刃角度（度） */
  base: number;
}

export interface WaxApplication {
  batchId: string;
  waxName: string;
  waxType: WaxType;
  /** 本次用量（克） */
  amount: number;
  appliedAt: string;
}

export interface Order {
  id: string;
  customer: string;
  brand: string;
  lengthCm: number;
  boardType: BoardType;
  edge: EdgeAngle;
  damages: Damage[];
  wax: WaxApplication | null;
  status: OrderStatus;
  preference: string;
  createdAt: string;
  completedAt: string | null;
}

export type WaxType = "low" | "mid" | "high" | "all";

export interface WaxBatch {
  id: string;
  waxName: string;
  waxType: WaxType;
  tempRange: string;
  /** 余量（克） */
  remaining: number;
}

export interface LogEntry {
  id: string;
  at: string;
  message: string;
}

export interface PersistState {
  orders: Order[];
  batches: WaxBatch[];
  logs: LogEntry[];
}
