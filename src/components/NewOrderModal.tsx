import { useState } from "react";
import type { BoardType } from "../types";
import { createOrder } from "../store";

const TYPES: BoardType[] = ["全地域", "公园板", "竞速板", "粉雪板"];

export function NewOrderModal({ onClose }: { onClose: () => void }) {
  const [customer, setCustomer] = useState("");
  const [brand, setBrand] = useState("");
  const [length, setLength] = useState("156");
  const [type, setType] = useState<BoardType>("全地域");
  const [side, setSide] = useState("89");
  const [base, setBase] = useState("1");
  const [preference, setPreference] = useState("");
  const [err, setErr] = useState("");

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p>新工单</p>
            <h2>登记雪板维护</h2>
          </div>
          <button className="ghost" onClick={onClose}>
            关闭
          </button>
        </header>
        {err && <div className="flash flash-err">{err}</div>}
        <form
          className="new-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              createOrder({
                customer: customer.trim() || "散客",
                brand: brand.trim() || "未知品牌",
                lengthCm: Number(length),
                boardType: type,
                sideAngle: Number(side),
                baseAngle: Number(base),
                preference: preference.trim() || "无特殊偏好",
              });
              onClose();
            } catch (ex) {
              setErr((ex as Error).message);
            }
          }}
        >
          <label>
            <span>客户姓名</span>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="客户姓名" />
          </label>
          <label>
            <span>雪板品牌</span>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="如 Burton" />
          </label>
          <label>
            <span>长度（cm）</span>
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} />
          </label>
          <label>
            <span>板型</span>
            <select value={type} onChange={(e) => setType(e.target.value as BoardType)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span>侧刃角（°）</span>
            <input type="number" step="0.5" min="85" max="90" value={side} onChange={(e) => setSide(e.target.value)} />
          </label>
          <label>
            <span>底刃角（°）</span>
            <input type="number" step="0.25" min="0" max="3" value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
          <label className="full">
            <span>客户偏好</span>
            <input value={preference} onChange={(e) => setPreference(e.target.value)} placeholder="如：弱咬雪、粉雪优先" />
          </label>
          <button className="primary full" type="submit">
            创建工单
          </button>
        </form>
      </div>
    </div>
  );
}
