import { useMemo, useState } from "react";
import type { BoardType, Order, OrderStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

const STATUS_TABS: Array<OrderStatus | "全部"> = ["全部", "待维护", "待复检", "完工"];
const BOARD_TYPES: Array<BoardType | "全部"> = ["全部", "全地域", "公园板", "竞速板", "粉雪板"];

export interface Filters {
  status: OrderStatus | "全部";
  boardType: BoardType | "全部";
  keyword: string;
}

export function OrderList({
  orders,
  onOpen,
}: {
  orders: Order[];
  onOpen: (o: Order) => void;
}) {
  const [filters, setFilters] = useState<Filters>({ status: "全部", boardType: "全部", keyword: "" });

  const filtered = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    return orders.filter((o) => {
      if (filters.status !== "全部" && o.status !== filters.status) return false;
      if (filters.boardType !== "全部" && o.boardType !== filters.boardType) return false;
      if (kw) {
        const hay = `${o.id} ${o.customer} ${o.brand} ${o.boardType}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [orders, filters]);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>工作台</p>
          <h2>维护工单（{filtered.length}）</h2>
        </div>
      </div>

      <div className="filter-row">
        <div className="chips">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              className={filters.status === s ? "chip-on" : ""}
              onClick={() => setFilters((f) => ({ ...f, status: s }))}
            >
              {s === "全部" ? "全部状态" : s}
            </button>
          ))}
        </div>
        <div className="chips">
          {BOARD_TYPES.map((t) => (
            <button
              key={t}
              className={filters.boardType === t ? "chip-on" : ""}
              onClick={() => setFilters((f) => ({ ...f, boardType: t }))}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="搜索工单号 / 客户 / 品牌"
          value={filters.keyword}
          onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
        />
      </div>

      <div className="order-grid">
        {filtered.map((o) => {
          const uncured = o.damages.filter((d) => d.state !== "已固化").length;
          return (
            <button key={o.id} className="order-card" onClick={() => onOpen(o)}>
              <div className="order-card-head">
                <strong>{o.id}</strong>
                <StatusBadge status={o.status} />
              </div>
              <h3>
                {o.brand} {o.lengthCm}cm
              </h3>
              <p>
                {o.customer} · {o.boardType}
              </p>
              <div className="order-card-meta">
                <span>侧刃 {o.sideAngle}°/底刃 {o.baseAngle}°</span>
                <span className={o.wax ? "text-held" : "text-muted"}>
                  {o.wax ? `${o.wax.waxType} ${o.wax.grams}g` : "未打蜡"}
                </span>
              </div>
              <div className="order-card-flags">
                {o.damages.length > 0 && (
                  <span className={uncured ? "pill pill-danger" : "pill pill-ok"}>
                    损伤 {o.damages.length}（未固化 {uncured}）
                  </span>
                )}
                {o.polished && <span className="pill">已抛光</span>}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="hint">没有符合筛选条件的工单。</p>}
      </div>
    </section>
  );
}
