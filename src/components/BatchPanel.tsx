import { useStore, batchRemaining, freezingOrders } from "../store";
import type { WaxBatch } from "../types";

function BatchRow({ batch }: { batch: WaxBatch }) {
  const state = useStore();
  const remaining = batchRemaining(batch);
  const held = Object.values(batch.heldGrams).reduce((s, g) => s + g, 0);
  const used = Object.values(batch.usedGrams).reduce((s, g) => s + g, 0);
  const pct = Math.round(((held + used) / batch.totalGrams) * 100);
  const freezers = freezingOrders(state, batch.waxType).map((o) => o.id);
  const low = remaining < 30;

  return (
    <div className="batch-row">
      <div className="batch-head">
        <div>
          <strong>{batch.id}</strong>
          <span className="batch-type">{batch.waxType}</span>
        </div>
        <b className={low ? "text-danger" : undefined}>余 {remaining}g</b>
      </div>
      <div className="batch-brand">{batch.brand}</div>
      <div className="bar">
        <div className="bar-used" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="batch-meta">
        <span>总 {batch.totalGrams}g</span>
        <span className="text-held">占用 {held}g</span>
        <span>已耗 {used}g</span>
      </div>
      {freezers.length > 0 && (
        <div className="freeze-note">同类蜡冻结中：{freezers.join("、")}</div>
      )}
    </div>
  );
}

export function BatchPanel() {
  const state = useStore();
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>库存同步</p>
          <h2>蜡批次余量</h2>
        </div>
      </div>
      <div className="batch-list">
        {state.batches.map((b) => (
          <BatchRow key={b.id} batch={b} />
        ))}
      </div>
      <p className="hint">
        打蜡通过全部校验后才占用余量并冻结同类蜡；复检不通过退回重做时立即释放；完工后占用转为已耗。
      </p>
    </section>
  );
}
