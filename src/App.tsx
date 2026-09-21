import { useState } from "react";
import { resetDemo, useStore } from "./store";
import { OrderList } from "./components/OrderList";
import { OrderDetail } from "./components/OrderDetail";
import { NewOrderModal } from "./components/NewOrderModal";
import { BatchPanel } from "./components/BatchPanel";
import { CustomerHistory } from "./components/CustomerHistory";
import type { Order } from "./types";

function Metrics() {
  const state = useStore();
  const pending = state.orders.filter((o) => o.status === "待维护").length;
  const reinspect = state.orders.filter((o) => o.status === "待复检").length;
  const done = state.orders.filter((o) => o.status === "完工").length;
  const repairs = state.orders.reduce(
    (s, o) => s + o.damages.filter((d) => d.state === "已固化").length,
    0,
  );
  const items: Array<[string, number, string?]> = [
    ["待维护", pending],
    ["待复检", reinspect],
    ["完工工单", done],
    ["底板已修补", repairs],
  ];
  return (
    <section className="metrics">
      {items.map(([label, value]) => (
        <article key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function App() {
  const state = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const openOrder: Order | undefined = openId
    ? state.orders.find((o) => o.id === openId)
    : undefined;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62004 · 雪板维护联动台 · Port 62004</p>
        <h1>滑雪板调校维护</h1>
        <span>
          底板损伤 → 修补位置登记与 P-Tex 固化 → 抛光打蜡（选现有蜡批次，余量不足或同类蜡被冻结则整单拒绝）→
          刃角联动 → 复检。全部数据仅保存在本浏览器 localStorage。
        </span>
      </section>

      <Metrics />

      <div className="toolbar">
        <button className="primary" onClick={() => setCreating(true)}>
          ＋ 新建维护工单
        </button>
        <button
          className="ghost"
          onClick={() => {
            if (confirm("重置为预置演示数据？当前浏览器内的改动将丢失。")) {
              resetDemo();
              setOpenId(null);
            }
          }}
        >
          重置演示数据
        </button>
      </div>

      <div className="layout">
        <div className="layout-main">
          <OrderList orders={state.orders} onOpen={(o) => setOpenId(o.id)} />
          <CustomerHistory orders={state.orders} onOpen={(o) => setOpenId(o.id)} />
        </div>
        <div className="layout-side">
          <BatchPanel />
        </div>
      </div>

      <footer className="foot">
        联动规则：未固化损伤禁止打蜡 · 打蜡原子占用批次并冻结同类蜡 · 打蜡后改刃角转待复检且占用保留 ·
        复检不过退回重做并释放占用 · 完工占用转已耗
      </footer>

      {openOrder && <OrderDetail order={openOrder} onClose={() => setOpenId(null)} />}
      {creating && <NewOrderModal onClose={() => setCreating(false)} />}
    </main>
  );
}

export default App;
