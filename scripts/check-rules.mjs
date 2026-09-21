import assert from "node:assert";
import { buildSeedState } from "../src/seed";
import { reducer, validateWax, findFrozenHolder } from "../src/store";

let state = buildSeedState();
let pass = 0;
function check(name, cond) {
  assert.ok(cond, name);
  pass += 1;
  console.log("✓", name);
}
const find = (id) => state.orders.find((o) => o.id === id);
const batch = (id) => state.batches.find((b) => b.id === id);
const dispatch = (a) => {
  state = reducer(state, a);
};

// 1. 未登记位置 → 拒绝；登记后未固化仍拒绝
{
  const before = JSON.stringify(state);
  let r = validateWax(state, find("ORD-112"), "WAX-M01", 30);
  check("未登记修补位置时打蜡被拒", r.ok === false && /尚未登记修补位置/.test(r.message));
  check("拒绝后状态原样", JSON.stringify(state) === before);
  dispatch({ type: "REGISTER_REPAIR", orderId: "ORD-112", damageId: "DMG-112-1", location: "底板居中 12cm 划痕槽" });
  r = validateWax(state, find("ORD-112"), "WAX-M01", 30);
  check("登记位置但未固化时打蜡被拒", r.ok === false && /未确认固化/.test(r.message));
  check("拒绝后批次余量不变", batch("WAX-M01").remaining === 180);
}

// 2. 固化后 → 余量不足拒绝；同类冻结拒绝（ORD-106 占低温蜡）
{
  dispatch({ type: "CONFIRM_CURE", orderId: "ORD-112", damageId: "DMG-112-1" });

  let r = validateWax(state, find("ORD-112"), "WAX-A01", 30);
  check("余量不足整单拒绝", r.ok === false && /余量仅剩 12g/.test(r.message));
  check("不足时余量未扣减", batch("WAX-A01").remaining === 12);

  r = validateWax(state, find("ORD-112"), "WAX-L02", 30);
  check("同类蜡（低温）被 ORD-106 冻结而拒绝", r.ok === false && /ORD-106/.test(r.message));
  const holder = findFrozenHolder(state, "low", "ORD-112");
  check("冻结持有方为 ORD-106", holder && holder.id === "ORD-106");
  check("WAX-L02 余量未动", batch("WAX-L02").remaining === 300);
  check("ORD-112 仍无打蜡记录", find("ORD-112").wax === null);
}

// 3. 换中温蜡成功，余量扣减且工单转已打蜡
{
  const mBefore = batch("WAX-M01").remaining;
  dispatch({ type: "APPLY_WAX", orderId: "ORD-112", batchId: "WAX-M01", amount: 40 });
  check("打蜡成功后余量扣减", batch("WAX-M01").remaining === mBefore - 40);
  check("工单转已打蜡", find("ORD-112").status === "waxed");
  check("工单记录批次与用量", find("ORD-112").wax.batchId === "WAX-M01" && find("ORD-112").wax.amount === 40);
}

// 4. 打蜡后改刃角 → 待复检，批次占用保留
{
  dispatch({ type: "SAVE_EDGE", orderId: "ORD-112", edge: { side: 88, base: 0.5 } });
  check("打蜡后改刃角转待复检", find("ORD-112").status === "recheck");
  check("待复检时蜡批次占用保留", find("ORD-112").wax.batchId === "WAX-M01" && batch("WAX-M01").remaining === 140);
  const holder = findFrozenHolder(state, "mid", "ORD-118");
  check("中温蜡现在被 ORD-112 冻结", holder && holder.id === "ORD-112");
}

// 5. 待复检不能完工
{
  const before = JSON.stringify(state);
  dispatch({ type: "COMPLETE", orderId: "ORD-112" });
  check("待复检状态不可完工", find("ORD-112").status === "recheck");
  check("完工被拒时状态原样", JSON.stringify(state) === before);
}

// 6. 复检不通过 → 重做，占用保留
{
  dispatch({ type: "FAIL_RECHECK", orderId: "ORD-112", reason: "刃角偏大" });
  check("复检不通过退回重做", find("ORD-112").status === "redo");
  check("重做中批次占用保留", find("ORD-112").wax !== null && batch("WAX-M01").remaining === 140);
}

// 7. 重做后重新送复检 → 通过 → 完工
{
  dispatch({ type: "SUBMIT_RECHECK", orderId: "ORD-112" });
  check("重做后重新送复检", find("ORD-112").status === "recheck");
  dispatch({ type: "PASS_RECHECK", orderId: "ORD-112" });
  check("复检通过转已打蜡", find("ORD-112").status === "waxed");
  dispatch({ type: "COMPLETE", orderId: "ORD-112" });
  check("完工", find("ORD-112").status === "done" && !!find("ORD-112").completedAt);
  check("完工后释放同类冻结（中温蜡可再用）", !findFrozenHolder(state, "mid", "ORD-118"));
}

// 8. 无损伤工单全流程，且不能重复打蜡
{
  dispatch({ type: "APPLY_WAX", orderId: "ORD-118", batchId: "WAX-M01", amount: 20 });
  check("无损伤工单打蜡成功", find("ORD-118").status === "waxed" && batch("WAX-M01").remaining === 120);
  const before = JSON.stringify(state);
  dispatch({ type: "APPLY_WAX", orderId: "ORD-118", batchId: "WAX-H01", amount: 10 });
  check("不可重复打蜡（拒绝且余量不变）", find("ORD-118").wax.batchId === "WAX-M01" && JSON.stringify(state) === before);
}

// 9. ORD-124 已登记未固化：固化阻断生效
{
  const dmg = find("ORD-124").damages[0];
  check("ORD-124 已登记位置", dmg.repairLocation === "前固定器下方底板" && dmg.cured === false);
  const r = validateWax(state, find("ORD-124"), "WAX-H01", 10);
  check("未确认固化阻断打蜡", r.ok === false && /未确认固化/.test(r.message));
}

// 10. ORD-106 已打蜡：改同样刃角不触发复检
{
  dispatch({ type: "SAVE_EDGE", orderId: "ORD-106", edge: { side: 88, base: 1 } });
  check("刃角无变化时保持已打蜡", find("ORD-106").status === "waxed");
}

console.log(`\n全部 ${pass} 条规则校验通过`);
