import { useMemo, useState } from "react";
import "./styles.css";
import OrderDetail from "./OrderDetail";
import { BatchPanel, CustomerHistory, LogPanel, OrderList } from "./Panels";
import { useWorkbench } from "./store";
import { STATUS_FILTERS, STATUS_LABEL } from "./labels";
import type { OrderStatus } from "./types";

interface Toast {
  ok: boolean;
  message: string;
  key: number;
}

function App() {
  const { state, dispatch } = useWorkbench();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [doneOnly, setDoneOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(state.orders[0]?.id ?? "");
  const [historyCustomer, setHistoryCustomer] = useState<string | "all">("all");
  const [toast, setToast] = useState<Toast | null>(null);

  const selected = state.orders.find((o) => o.id === selectedId) ?? state.orders[0];

  const metrics = useMemo(() => {
    const pending = state.orders.filter((o) => o.status === "pending").length;
    const done = state.orders.filter((o) => o.status === "done").length;
    const avgSide =
      state.orders.length === 0
        ? 0
        : state.orders.reduce((s, o) => s + o.edge.side, 0) / state.orders.length;
    const repair = state.orders.reduce(
      (n, o) => n + o.damages.filter((d) => d.cured).length,
      0
    );
    return [
      { label: "待维护", value: pending },
      { label: "完工工单", value: done },
      { label: "平均侧刃", value: `${avgSide.toFixed(1)}°` },
      { label: "底板已修补", value: repair },
    ];
  }, [state.orders]);

  function showResult(result: { ok: boolean; message: string }) {
    setToast({ ...result, key: Date.now() });
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p>hxyfront-62004 · 雪板维护联动台</p>
          <h1>滑雪板调校维护工作台</h1>
          <span>
            底板损伤登记修补位置并确认固化后才能抛光打蜡；打蜡必须选用现有蜡批次，余量不足或同类蜡被其他工单冻结时整单拒绝；
            打蜡后改动刃角转待复检且批次占用保留，复检不通过退回重做。所有数据仅保存在浏览器本地。
          </span>
        </div>
        <div className="hero-tools">
          <button
            onClick={() => {
              if (confirm("确定恢复为预置演示数据？当前浏览器内的改动将被清除。")) {
                dispatch({ type: "RESET" });
                setSelectedId("ORD-106");
                showResult({ ok: true, message: "已恢复预置工单、损伤与蜡批次数据" });
              }
            }}
          >
            恢复预置数据
          </button>
        </div>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      {toast && (
        <div key={toast.key} className={`toast ${toast.ok ? "ok" : "err"}`}>
          <span>{toast.ok ? "✓ " : "✕ "}{toast.message}</span>
          <button onClick={() => setToast(null)}>关闭</button>
        </div>
      )}

      <section className="workspace">
        <aside className="panel left-panel">
          <div className="heading">
            <div>
              <p className="eyebrow">完工状态筛选</p>
              <h2>维护工单</h2>
            </div>
          </div>

          <label className="done-switch">
            <input
              type="checkbox"
              checked={doneOnly}
              onChange={(e) => setDoneOnly(e.target.checked)}
            />
            <span>只看完工工单</span>
          </label>

          {!doneOnly && (
            <div className="chips filter-chips">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={statusFilter === f.key ? "chip-on" : ""}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.key === "all" ? "全部" : STATUS_LABEL[f.key as OrderStatus]}
                </button>
              ))}
            </div>
          )}

          <input
            className="search"
            placeholder="搜索工单号 / 客户 / 品牌"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <OrderList
            state={state}
            statusFilter={statusFilter}
            doneOnly={doneOnly}
            query={query}
            selectedId={selected?.id ?? ""}
            onSelect={setSelectedId}
          />
        </aside>

        <section className="panel detail-panel">
          {selected ? (
            <OrderDetail
              key={selected.id}
              state={state}
              order={selected}
              dispatch={dispatch}
              onResult={showResult}
            />
          ) : (
            <p className="muted">暂无工单。</p>
          )}
        </section>

        <aside className="right-rail">
          <BatchPanel state={state} />
          <CustomerHistory
            state={state}
            customer={historyCustomer}
            onPick={setHistoryCustomer}
          />
          <LogPanel state={state} />
        </aside>
      </section>
    </main>
  );
}

export default App;
