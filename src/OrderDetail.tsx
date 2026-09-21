import { useEffect, useMemo, useState } from "react";
import { validateWax, waxTypeLabel } from "./store";
import { BOARD_TYPE_LABEL, STATUS_LABEL, WAX_TYPE_LABEL } from "./labels";
import type { Order, PersistState } from "./types";

interface Props {
  state: PersistState;
  order: Order;
  dispatch: React.Dispatch<any>;
  onResult: (result: { ok: boolean; message: string }) => void;
}

export default function OrderDetail({ state, order, dispatch, onResult }: Props) {
  const locked = order.status === "done";
  const hasWax = order.wax !== null;

  // 打蜡表单：必须选现有批次
  const [batchId, setBatchId] = useState(state.batches[0]?.id ?? "");
  const [amount, setAmount] = useState<number>(30);

  // 刃角编辑
  const [side, setSide] = useState(order.edge.side);
  const [base, setBase] = useState(order.edge.base);

  // 复检不通过原因
  const [failReason, setFailReason] = useState("");

  // 每个损伤的修补位置草稿（未点击登记前不写入记录）
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({});

  // 切换工单时重置本组件局部表单
  useEffect(() => {
    setBatchId(state.batches[0]?.id ?? "");
    setAmount(30);
    setSide(order.edge.side);
    setBase(order.edge.base);
    setFailReason("");
    setLocationDrafts({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const preview = useMemo(() => {
    if (hasWax || locked) return null;
    return validateWax(state, order, batchId, Number(amount));
  }, [state, order, batchId, amount, hasWax, locked]);

  const openDamages = order.damages.filter((d) => !d.cured);
  const canWax = !hasWax && !locked && openDamages.length === 0;
  const edgeDirty = side !== order.edge.side || base !== order.edge.base;

  function submitWax() {
    const result = validateWax(state, order, batchId, Number(amount));
    if (!result.ok) {
      // 整单拒绝：不 dispatch，工单/批次/损伤记录原样保留
      onResult({ ok: false, message: result.message });
      return;
    }
    dispatch({ type: "APPLY_WAX", orderId: order.id, batchId, amount: Number(amount) });
    onResult({
      ok: true,
      message: `${order.id} 打蜡完成，批次 ${result.batch.id} 余量已扣减至 ${
        result.batch.remaining - Number(amount)
      }g`,
    });
  }

  function saveEdge() {
    if (locked) return;
    if (!edgeDirty) {
      onResult({ ok: false, message: "刃角未发生变化" });
      return;
    }
    const next = { side: Number(side), base: Number(base) };
    dispatch({ type: "SAVE_EDGE", orderId: order.id, edge: next });
    if (hasWax) {
      onResult({
        ok: true,
        message: "刃角已保存：该工单已打蜡，结果转待复检，蜡批次占用保留",
      });
    } else {
      onResult({ ok: true, message: "刃角已保存（打蜡前调整，无需复检）" });
    }
  }

  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <p className="eyebrow">联动工单</p>
          <h2>
            {order.id}
            <span className={`badge ${order.status}`}>{STATUS_LABEL[order.status]}</span>
          </h2>
          <p className="sub">
            {order.customer} · {order.brand} {order.lengthCm}cm ·{" "}
            {BOARD_TYPE_LABEL[order.boardType]}
          </p>
          <p className="sub">客户偏好：{order.preference || "无"}</p>
        </div>
      </div>

      {/* 底板损伤 */}
      <section className="block">
        <h3>
          底板损伤
          {openDamages.length > 0 && <em className="warn">（{openDamages.length} 处未固化，阻断打蜡）</em>}
        </h3>
        {order.damages.length === 0 && <p className="muted">底板无损伤记录，可直接抛光打蜡。</p>}
        <div className="damage-list">
          {order.damages.map((d) => (
            <article key={d.id} className={`damage ${d.cured ? "is-cured" : ""}`}>
              <div className="damage-main">
                <b>{d.description}</b>
                <p>
                  修补位置：
                  {d.repairLocation ? (
                    <span>{d.repairLocation}</span>
                  ) : (
                    <span className="warn">未登记</span>
                  )}
                </p>
                <p>
                  固化状态：
                  {d.cured ? <span className="ok">已确认固化</span> : <span className="warn">未固化</span>}
                </p>
              </div>
              {!d.cured && !locked && (
                <div className="damage-actions">
                  {!d.repairLocation ? (
                    <>
                      <input
                        value={locationDrafts[d.id] ?? ""}
                        placeholder="登记修补位置，如：板头居中靠左刃 2cm"
                        onChange={(e) =>
                          setLocationDrafts((m) => ({ ...m, [d.id]: e.target.value }))
                        }
                      />
                      <button
                        disabled={!(locationDrafts[d.id] ?? "").trim()}
                        onClick={() => {
                          const loc = (locationDrafts[d.id] ?? "").trim();
                          dispatch({
                            type: "REGISTER_REPAIR",
                            orderId: order.id,
                            damageId: d.id,
                            location: loc,
                          });
                          onResult({ ok: true, message: `已登记修补位置：${loc}` });
                        }}
                      >
                        登记位置
                      </button>
                    </>
                  ) : (
                    <button
                      className="primary"
                      onClick={() => {
                        dispatch({ type: "CONFIRM_CURE", orderId: order.id, damageId: d.id });
                        onResult({ ok: true, message: "已确认固化，解除打蜡阻断" });
                      }}
                    >
                      确认固化
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 刃角 */}
      <section className="block">
        <h3>刃角参数</h3>
        <div className="edge-row">
          <label>
            <span>侧刃角度（°）</span>
            <input
              type="number"
              step={0.5}
              min={85}
              max={90}
              value={side}
              disabled={locked}
              onChange={(e) => setSide(Number(e.target.value))}
            />
          </label>
          <label>
            <span>底刃角度（°）</span>
            <input
              type="number"
              step={0.1}
              min={0}
              max={3}
              value={base}
              disabled={locked}
              onChange={(e) => setBase(Number(e.target.value))}
            />
          </label>
          <button className="primary" disabled={locked || !edgeDirty} onClick={saveEdge}>
            保存刃角
          </button>
        </div>
        {hasWax && !locked && (
          <p className="hint">
            已打蜡后改动刃角，保存即转<strong>待复检</strong>；复检通过前不能完工，蜡批次占用保留。
          </p>
        )}
      </section>

      {/* 打蜡 */}
      <section className="block">
        <h3>抛光打蜡</h3>
        {order.wax ? (
          <div className="wax-card">
            <div>
              <b>
                {order.wax.waxName}（{WAX_TYPE_LABEL[order.wax.waxType]}） · {order.wax.amount}g
              </b>
              <p>
                批次 {order.wax.batchId} · 打蜡时间 {order.wax.appliedAt}
              </p>
            </div>
            <span className="tag">批次占用中</span>
          </div>
        ) : locked ? (
          <p className="muted">工单已锁定。</p>
        ) : (
          <>
            {openDamages.length > 0 && (
              <p className="hint warn-bg">
                存在未固化损伤：必须先登记修补位置并确认固化，才能抛光打蜡。
              </p>
            )}
            <div className="edge-row">
              <label className="grow">
                <span>现有蜡批次（必选）</span>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  disabled={!canWax}
                >
                  {state.batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} · {b.waxName}（{waxTypeLabel(b.waxType)} {b.tempRange}）余量 {b.remaining}g
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>用量（克）</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  disabled={!canWax}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <button className="primary" disabled={!canWax} onClick={submitWax}>
                抛光打蜡
              </button>
            </div>
            {canWax && preview && !preview.ok && (
              <p className="hint warn-bg">提交将被整单拒绝：{preview.message}</p>
            )}
          </>
        )}
      </section>

      {/* 流程操作 */}
      <section className="block">
        <h3>流程流转</h3>
        <div className="flow-actions">
          {order.status === "waxed" && (
            <button
              className="primary"
              onClick={() => {
                dispatch({ type: "COMPLETE", orderId: order.id });
                onResult({ ok: true, message: `${order.id} 已完工，筛选与客户历史同步更新` });
              }}
            >
              复检通过 · 完工交付
            </button>
          )}
          {order.status === "redo" && (
            <button
              className="primary"
              onClick={() => {
                dispatch({ type: "SUBMIT_RECHECK", orderId: order.id });
                onResult({ ok: true, message: "已重新送交复检" });
              }}
            >
              重做完成 · 重新送复检
            </button>
          )}
          {order.status === "recheck" && (
            <>
              <button
                className="primary"
                onClick={() => {
                  dispatch({ type: "PASS_RECHECK", orderId: order.id });
                  onResult({ ok: true, message: "复检通过，可完工交付" });
                }}
              >
                复检通过
              </button>
              <input
                className="grow"
                placeholder="复检不通过原因（可选），如：刃角偏大需重新打磨"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
              />
              <button
                className="danger"
                onClick={() => {
                  dispatch({
                    type: "FAIL_RECHECK",
                    orderId: order.id,
                    reason: failReason,
                  });
                  onResult({ ok: false, message: "复检不通过，工单退回重做，批次占用保留" });
                  setFailReason("");
                }}
              >
                复检不通过 · 退回重做
              </button>
            </>
          )}
          {order.status === "pending" && <p className="muted">完成损伤处理与打蜡后，进入复检流转。</p>}
          {order.status === "done" && (
            <p className="muted">
              已于 {order.completedAt} 完工交付，客户历史已同步。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
