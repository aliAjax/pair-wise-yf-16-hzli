import type { BoardType, OrderStatus, WaxType } from "./types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待维护",
  waxed: "已打蜡",
  recheck: "待复检",
  redo: "重做中",
  done: "完工",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "badge-pending",
  waxed: "badge-waxed",
  recheck: "badge-recheck",
  redo: "badge-redo",
  done: "badge-done",
};

export const BOARD_TYPE_LABEL: Record<BoardType, string> = {
  "all-mountain": "全地域",
  park: "公园板",
  race: "竞速板",
  powder: "粉雪板",
};

export const WAX_TYPE_LABEL: Record<WaxType, string> = {
  low: "低温蜡",
  mid: "中温蜡",
  high: "高温蜡",
  all: "全温蜡",
};

export const STATUS_FILTERS: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all", label: "全部工单" },
  { key: "pending", label: "待维护" },
  { key: "waxed", label: "已打蜡" },
  { key: "recheck", label: "待复检" },
  { key: "redo", label: "重做中" },
  { key: "done", label: "完工" },
];
