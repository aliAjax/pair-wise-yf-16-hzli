import { useState } from "react";
import type { Order } from "../types";
import {
  addDamage,
  adjustAngles,
  applyWax,
  batchRemaining,
  confirmCure,
  freezingOrders,
  registerPosition,
  reinspect,
  useStore,
} from "../store";
import { StatusBadge, fmtTime } from "./StatusBadge";

export function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const run = (fn: () => void, okText: string) => {
    try {
      fn();
      setFlash({ kind: "ok", text: okText });
    } catch (e) {
      setFlash({ kind: "err", text: (e as Error).message });
    }
  };

  const uncured = order.damages.filter((d) => d.state !== "已固化");

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>
              {order.id} <StatusBadge status={order.status} />
            </h2>
            <p>
              {order.customer} · {order.brand} {order.lengthCm}cm · {order.boardType}
            </p>
          </div>
          <button className="ghost" onClick={onClose}>
            关闭
          </button>
        </header>

        {flash && <div className={`flash flash-${flash.kind}`}>{flash.text}</div>}

        <section className="detail-block">
          <h3>刃角参数</h3>
          <div className="angle-line">
            当前：侧刃 <b>{order.sideAngle}°</b> ／ 底刃 <b>{order.baseAngle}°</b>
            <span className="tag">偏好：{order.preference}</span>
          </div>
          <AngleForm
            key={`${order.sideAngle}-${order.baseAngle}`}
            order={order}
            disabled={!order.wax || order.wax.state !== "active"}
            onSubmit={(s, b) =>
              run(() => adjustAngles(order.id, s, b), "刃角已更新，工单保持待复检且批次占用保留")
            }
          />
          {(!order.wax || order.wax.state !== "active") && (
            <p className="hint">仅在打蜡后可改动刃角；改动后转待复检，批次占用保留。</p>
          )}
        </section>

        <section className="detail-block">
          <h3>
            底板损伤
            {uncured.length > 0 && <span className="pill pill-danger">{uncured.length} 处未固化</span>}
          </h3>
          {order.damages.length === 0 && <p className="hint">暂无损伤记录，可直接抛光打蜡。</p>}
          <div className="damage-list">
            {order.damages.map((d) => (
              <div key={d.id} className={`damage-item damage-${d.state}`}>
                <div className="damage-main">
                  <strong>{d.desc}</strong>
                  <span>修补位置：{d.position || <em className="text-danger">未登记，固化前必填</em>}</span>
                  <small>
                    登记：{d.registeredAt ? fmtTime(d.registeredAt) : "—"} ｜ 固化：
                    {d.curedAt ? fmtTime(d.curedAt) : "未确认"}
                  </small>
                </div>
                {d.state === "未修" &&
                  (d.position ? (
                    <button
                      className="warn"
                      onClick={() => run(() => confirmCure(order.id, d.id), "已确认 P-Tex 固化")}
                    >
                      确认固化
                    </button>
                  ) : (
                    <PositionForm
                      onSubmit={(pos) =>
                        run(() => registerPosition(order.id, d.id, pos), "修补位置已登记，待固化")
                      }
                    />
                  ))}
                {d.state === "已固化" && <span className="pill pill-ok">已固化</span>}
              </div>
            ))}
          </div>
          {order.status !== "完工" && (
            <DamageForm
              onSubmit={(desc, pos) =>
                run(() => addDamage(order.id, desc, pos), "损伤已登记，待 P-Tex 固化")
              }
            />
          )}
        </section>

        <section className="detail-block">
          <h3>抛光打蜡</h3>
          <WaxForm
            order={order}
            onSubmit={(batchId, grams) =>
              run(() => applyWax(order.id, batchId, grams), "抛光打蜡完成：余量已占用，同类蜡已冻结")
            }
          />
          {order.wax && (
            <div className="wax-current">
              当前打蜡：{order.wax.waxType} {order.wax.grams}g · 批次 {order.wax.batchId}
              <span className="pill">冻结同类蜡中</span>
            </div>
          )}
          {order.waxHistory.length > 0 && (
            <details className="wax-history">
              <summary>打蜡历史（{order.waxHistory.length}）</summary>
              {order.waxHistory.map((w) => (
                <div key={w.id} className="wax-hist-row">
                  {fmtTime(w.appliedAt)} · {w.waxType} {w.grams}g · {w.batchId}
                  {w.state === "rejected" && <span className="pill pill-danger">复检退回</span>}
                </div>
              ))}
            </details>
          )}
        </section>

        {order.status === "待复检" && order.wax && (
          <section className="detail-block">
            <h3>复检结论</h3>
            <ReinspectForm
              onSubmit={(pass, note) =>
                run(
                  () => reinspect(order.id, pass, note),
                  pass ? "复检通过，工单完工，蜡耗入账" : "复检不通过，已退回重做，占用释放",
                )
              }
            />
          </section>
        )}

        <section className="detail-block">
          <h3>工单流水</h3>
          <ol className="timeline">
            {order.events.map((e, i) => (
              <li key={i}>
                <time>{fmtTime(e.at)}</time>
                <span>{e.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------ 子表单 ------------------------------ */

function PositionForm({ onSubmit }: { onSubmit: (pos: string) => void }) {
  const [pos, setPos] = useState("");
  return (
    <form
      className="pos-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(pos);
        setPos("");
      }}
    >
      <input placeholder="登记修补位置" value={pos} onChange={(e) => setPos(e.target.value)} />
      <button type="submit" className="warn">
        登记位置
      </button>
    </form>
  );
}

function DamageForm({ onSubmit }: { onSubmit: (desc: string, pos: string) => void }) {
  const [desc, setDesc] = useState("");
  const [pos, setPos] = useState("");
  return (
    <form
      className="sub-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(desc, pos);
        setDesc("");
        setPos("");
      }}
    >
      <input
        placeholder="损伤描述，如：底板划痕 12cm"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <input
        placeholder="修补位置（必填），如：板尾居中偏右 2cm"
        value={pos}
        onChange={(e) => setPos(e.target.value)}
      />
      <button type="submit">登记损伤</button>
    </form>
  );
}

function AngleForm({
  order,
  disabled,
  onSubmit,
}: {
  order: Order;
  disabled: boolean;
  onSubmit: (side: number, base: number) => void;
}) {
  const [side, setSide] = useState(String(order.sideAngle));
  const [base, setBase] = useState(String(order.baseAngle));
  return (
    <form
      className="sub-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(Number(side), Number(base));
      }}
    >
      <label className="inline">
        侧刃°
        <input type="number" step="0.5" min="85" max="90" value={side} onChange={(e) => setSide(e.target.value)} />
      </label>
      <label className="inline">
        底刃°
        <input type="number" step="0.25" min="0" max="3" value={base} onChange={(e) => setBase(e.target.value)} />
      </label>
      <button type="submit" disabled={disabled}>
        改动刃角
      </button>
    </form>
  );
}

function WaxForm({ order, onSubmit }: { order: Order; onSubmit: (batchId: string, grams: number) => void }) {
  const state = useStore();
  const [batchId, setBatchId] = useState("");
  const [grams, setGrams] = useState("20");
  const done = order.status === "完工";
  const blocked = order.damages.some((d) => d.state !== "已固化");
  const disabled = done;

  const selected = state.batches.find((b) => b.id === batchId);
  let hint = "";
  if (done) hint = "工单已完工。";
  else if (blocked) hint = "存在未固化损伤，必须登记修补位置并确认固化后才能抛光打蜡。";
  else if (order.wax) hint = "当前已有生效打蜡；若复检退回需重新打蜡。";

  return (
    <form
      className="sub-form wax-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(batchId, Number(grams));
      }}
    >
      <select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={disabled}>
        <option value="">选择现有蜡批次…</option>
        {state.batches.map((b) => {
          const rem = batchRemaining(b);
          const frozen = freezingOrders(state, b.waxType, order.id).length > 0;
          return (
            <option key={b.id} value={b.id}>
              {b.id} · {b.waxType} · 余 {rem}g{frozen ? " · 同类被冻结" : ""}
            </option>
          );
        })}
      </select>
      <label className="inline">
        克重
        <input type="number" min="1" step="1" value={grams} onChange={(e) => setGrams(e.target.value)} disabled={disabled} />
      </label>
      <button type="submit" className="primary" disabled={disabled}>
        抛光并打蜡
      </button>
      {hint && <p className="hint">{hint}</p>}
      {selected && (
        <p className="hint">
          {selected.brand}，余量 {batchRemaining(selected)}g；同类{selected.waxType}
          {freezingOrders(state, selected.waxType, order.id).length > 0
            ? "正被其他工单冻结，将整单拒绝"
            : "当前可冻结"}
        </p>
      )}
    </form>
  );
}

function ReinspectForm({ onSubmit }: { onSubmit: (pass: boolean, note?: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="sub-form">
      <input placeholder="复检备注（可选），如：蜡膜不均、刃线有毛刺" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="btn-row">
        <button className="primary" onClick={() => onSubmit(true, note || undefined)}>
          复检通过 · 完工
        </button>
        <button className="danger" onClick={() => onSubmit(false, note || undefined)}>
          不通过 · 退回重做
        </button>
      </div>
    </div>
  );
}
