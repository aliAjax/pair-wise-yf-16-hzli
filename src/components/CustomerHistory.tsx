import { useMemo, useState } from "react";
import type { Order } from "../types";
import { StatusBadge, fmtTime } from "./StatusBadge";

export function CustomerHistory({
  orders,
  onOpen,
}: {
  orders: Order[];
  onOpen: (o: Order) => void;
}) {
  const customers = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const list = map.get(o.customer) ?? [];
      list.push(o);
      map.set(o.customer, list);
    }
    return [...map.entries()]
      .map(([name, list]) => ({
        name,
        list: [...list].sort((a, b) => b.createdAt - a.createdAt),
      }))
      .sort((a, b) => b.list.length - a.list.length || b.list[0].createdAt - a.list[0].createdAt);
  }, [orders]);

  const [active, setActive] = useState(customers[0]?.name ?? "");
  const current = customers.find((c) => c.name === active) ?? customers[0];

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>浏览器存储同步</p>
          <h2>客户历史维护记录</h2>
        </div>
      </div>
      <div className="history-wrap">
        <div className="customer-col">
          {customers.map((c) => (
            <button
              key={c.name}
              className={current?.name === c.name ? "customer-on" : ""}
              onClick={() => setActive(c.name)}
            >
              <strong>{c.name}</strong>
              <span>{c.list.length} 单</span>
            </button>
          ))}
        </div>
        <div className="history-col">
          {current?.list.map((o) => (
            <button key={o.id} className="history-row" onClick={() => onOpen(o)}>
              <div>
                <strong>{o.id}</strong>
                <StatusBadge status={o.status} />
              </div>
              <p>
                {o.brand} {o.lengthCm}cm · {o.boardType} · 侧刃 {o.sideAngle}°/底刃 {o.baseAngle}°
              </p>
              <small>
                {fmtTime(o.createdAt)}
                {o.wax ? ` · ${o.wax.waxType}` : o.waxHistory[0] ? ` · ${o.waxHistory[0].waxType}` : ""}
                {o.damages.length > 0 ? ` · 损伤 ${o.damages.length} 处` : ""}
              </small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
