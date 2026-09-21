import type { OrderStatus } from "../types";

const LABELS: Record<OrderStatus, string> = {
  待维护: "待维护",
  待复检: "待复检",
  完工: "完工",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
