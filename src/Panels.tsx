import { waxTypeLabel } from "./store";
import { STATUS_LABEL, WAX_TYPE_LABEL } from "./labels";
import type { Order, OrderStatus, PersistState, WaxBatch } from "./types";

/* ---------------- 蜡批次余量 ---------------- */

export function BatchPanel({ state }: { state: PersistState }) {
  const activeOrders = state.orders.filter((o) => o.status !== "done");

  function holderOf(batch: WaxBatch): Order | undefined {
    // 同类蜡（不限具体批次）被哪张未完工工单占用
    return activeOrders.find((o) => o.wax?.waxType === batch.waxType);
  }

  return (
    <section className="panel side-panel">
      <div className="heading">
        <div>
          <p className="eyebrow">库存联动</p>
          <h2>蜡批次余量</h2>
        </div>
      </div>
      <div className="batch-list">
        {state.batches.map((b) => {
          const holder = holderOf(b);
          return (
            <article key={b.id} className={`batch ${holder ? "is-frozen" : ""}`}>
              <div className="batch-top">
                <b>
                  {b.id} · {b.waxName}
                </b>
                <span className="batch-type">{waxTypeLabel(b.waxType)}</span>
              </div>
              <p className="muted">
                {WAX_TYPE_LABEL[b.waxType]} · 适用 {b.tempRange}
              </p>
              <div className="batch-bar">
                <span style={{ width: `${Math.min(100, (b.remaining / 320) * 100)}%` }} />
              </div>
              <div className="batch-foot">
                <strong>{b.remaining}g</strong>
                {holder ? (
                  <span className="frozen-tag">
                    同类冻结 · {holder.id}
                    {holder.wax
                      ? ` 占 ${holder.wax.batchId} ${holder.wax.amount}g`
                      : ""}
                    （{STATUS_LABEL[holder.status]}）
                  </span>
                ) : (
                  <span className="muted">可选用</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- 客户历史 ---------------- */

export function CustomerHistory({
  state,
  customer,
  onPick,
}: {
  state: PersistState;
  customer: string | "all";
  onPick: (c: string | "all") => void;
}) {
  const customers = Array.from(new Set(state.orders.map((o) => o.customer))).sort();
  const shown =
    customer === "all"
      ? state.orders
      : state.orders.filter((o) => o.customer === customer);
  const doneCount = shown.filter((o) => o.status === "done").length;

  return (
    <section className="panel side-panel">
      <div className="heading">
        <div>
          <p className="eyebrow">浏览器存储同步</p>
          <h2>客户历史维护记录</h2>
        </div>
      </div>
      <div className="chips">
        <button
          className={customer === "all" ? "chip-on" : ""}
          onClick={() => onPick("all")}
        >
          全部客户
        </button>
        {customers.map((c) => (
          <button key={c} className={customer === c ? "chip-on" : ""} onClick={() => onPick(c)}>
            {c}
          </button>
        ))}
      </div>
      <p className="muted summary-line">
        {customer === "all" ? "全部客户合计" : customer}：{shown.length} 张工单 · 完工 {doneCount} 张
      </p>
      <div className="history-list">
        {shown
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .map((o) => (
            <article key={o.id} className="history-item">
              <div>
                <b>
                  {o.id} <span className={`badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
                </b>
                <p>
                  {o.brand} {o.lengthCm}cm · 刃角 {o.edge.side}°/{o.edge.base}°
                </p>
                <p className="muted">
                  {o.wax
                    ? `打蜡：${o.wax.waxName} ${o.wax.amount}g（${o.wax.batchId}）`
                    : "未打蜡"}
                  {" · "}
                  底板损伤 {o.damages.length} 处
                </p>
                {o.completedAt && <p className="muted">完工时间：{o.completedAt}</p>}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

/* ---------------- 操作日志 ---------------- */

export function LogPanel({ state }: { state: PersistState }) {
  return (
    <section className="panel side-panel">
      <div className="heading">
        <div>
          <p className="eyebrow">联动轨迹</p>
          <h2>操作日志</h2>
        </div>
      </div>
      <ul className="log-list">
        {state.logs.map((l) => (
          <li key={l.id}>
            <time>{l.at}</time>
            <span>{l.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- 完工筛选 + 工单列表 ---------------- */

export function OrderList({
  state,
  statusFilter,
  doneOnly,
  query,
  selectedId,
  onSelect,
}: {
  state: PersistState;
  statusFilter: OrderStatus | "all";
  doneOnly: boolean;
  query: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const q = query.trim();
  const list = state.orders.filter((o) => {
    if (doneOnly && o.status !== "done") return false;
    if (!doneOnly && statusFilter !== "all" && o.status !== statusFilter) return false;
    if (q) {
      const hay = `${o.id} ${o.customer} ${o.brand}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="order-list">
      {list.length === 0 && <p className="muted empty">没有符合筛选条件的工单。</p>}
      {list.map((o) => {
        const openDamage = o.damages.filter((d) => !d.cured).length;
        return (
          <button
            key={o.id}
            className={`order-card ${o.id === selectedId ? "selected" : ""}`}
            onClick={() => onSelect(o.id)}
          >
            <div className="order-card-top">
              <b>{o.id}</b>
              <span className={`badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
            </div>
            <p>
              {o.customer} · {o.brand} {o.lengthCm}cm
            </p>
            <p className="muted">
              刃角 {o.edge.side}°/{o.edge.base}° ·{" "}
              {o.wax ? `已蜡 ${o.wax.batchId}` : "未打蜡"}
              {openDamage > 0 && <span className="warn"> · {openDamage} 处损伤未固化</span>}
            </p>
          </button>
        );
      })}
    </div>
  );
}
