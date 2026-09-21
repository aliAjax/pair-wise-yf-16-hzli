/*
 * 纯逻辑联动测试（node 运行）
 *   npx esbuild src/store.ts --bundle --format=cjs --platform=node \
 *     --outfile=scripts/store-bundle.cjs --external:react \
 *   && node scripts/logic-test.cjs
 */
const assert = require("node:assert");

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, v),
  removeItem: (k) => mem.delete(k),
};

const store = require("./store-bundle.cjs");
let passed = 0;
const ok = (name, fn) => {
  fn();
  passed++;
  console.log("PASS:", name);
};

const find = (id) => store.getStateForTest().orders.find((o) => o.id === id);
const batch = (id) => store.getStateForTest().batches.find((b) => b.id === id);

store.resetDemo();

ok("预置：ORD-112 底板损伤未登记位置/未固化，工单待维护", () => {
  const o = find("ORD-112");
  assert.equal(o.damages[0].state, "未修");
  assert.equal(o.damages[0].position, "");
  assert.equal(o.status, "待维护");
  assert.equal(batch("WAX-M204").heldGrams["ORD-121:W-121-1"], 20); // 待复检单占用保留
});

ok("规则1：存在未固化损伤时打蜡被拒", () => {
  assert.throws(() => store.applyWax("ORD-112", "WAX-H309", 10), /未登记\/未固化/);
});

ok("规则2：不选现有蜡批次被拒", () => {
  assert.throws(() => store.applyWax("ORD-118", "", 10), /现有蜡批次/);
});

ok("损伤登记必须带修补位置；未固化前仍禁止打蜡", () => {
  assert.throws(() => store.addDamage("ORD-112", "板尾浅划痕", ""), /修补位置/);
  store.addDamage("ORD-112", "板尾浅划痕", "板尾居中");
  assert.throws(() => store.applyWax("ORD-112", "WAX-H309", 10), /未固化/);
});

ok("固化前必须先登记修补位置（种子原始损伤 D-112-1）", () => {
  assert.throws(() => store.confirmCure("ORD-112", "D-112-1"), /先登记修补位置/);
  store.registerPosition("ORD-112", "D-112-1", "板尾居中偏右 2cm");
  find("ORD-112").damages.forEach((d) => store.confirmCure("ORD-112", d.id));
  assert.ok(find("ORD-112").damages.every((d) => d.state === "已固化"));
});

ok("规则3：批次余量不足整单拒绝，状态零改动", () => {
  store.applyWax("ORD-112", "WAX-L102", 25); // 总量 30g，仅剩 5g
  const snap = JSON.stringify(store.getStateForTest());
  assert.throws(() => store.applyWax("ORD-118", "WAX-L102", 10), /整单拒绝/);
  assert.equal(JSON.stringify(store.getStateForTest()), snap);
});

ok("规则4：同类蜡被其他工单冻结时整单拒绝，状态零改动", () => {
  const snap = JSON.stringify(store.getStateForTest());
  assert.throws(() => store.applyWax("ORD-118", "WAX-L101", 10), /冻结/);
  assert.equal(JSON.stringify(store.getStateForTest()), snap);
});

ok("规则5：校验通过后打蜡占用余量、冻结同类蜡并转待复检", () => {
  const o = find("ORD-112");
  assert.equal(o.status, "待复检");
  assert.equal(o.wax.grams, 25);
  assert.equal(o.polished, true);
  assert.equal(batch("WAX-L102").heldGrams[`ORD-112:${o.wax.id}`], 25);
});

ok("规则6：打蜡后改刃角保持待复检且批次占用保留", () => {
  store.adjustAngles("ORD-112", 87.5, 0.5);
  const o = find("ORD-112");
  assert.equal(o.sideAngle, 87.5);
  assert.equal(o.status, "待复检");
  assert.ok(batch("WAX-L102").heldGrams[`ORD-112:${o.wax.id}`]);
  assert.throws(() => store.adjustAngles("ORD-118", 88, 1), /没有生效的打蜡/);
});

ok("规则7a：复检不通过退回重做——释放占用、解除冻结、清除抛光", () => {
  store.reinspect("ORD-112", false, "蜡膜不均");
  const o = find("ORD-112");
  assert.equal(o.status, "待维护");
  assert.equal(o.wax, null);
  assert.equal(o.polished, false);
  assert.equal(o.waxHistory[0].state, "rejected");
  assert.deepEqual(batch("WAX-L102").heldGrams, {});
});

ok("规则7b：冻结解除后同类蜡可再打；复检通过则完工且占用转已耗", () => {
  store.applyWax("ORD-118", "WAX-L101", 15);
  const w = find("ORD-118").wax;
  assert.equal(find("ORD-118").status, "待复检");
  store.reinspect("ORD-118", true);
  assert.equal(find("ORD-118").status, "完工");
  assert.equal(batch("WAX-L101").usedGrams[`ORD-118:${w.id}`], 15);
  assert.equal(batch("WAX-L101").heldGrams[`ORD-118:${w.id}`], undefined);
});

ok("规则8：完工单不能再打蜡", () => {
  assert.throws(() => store.applyWax("ORD-118", "WAX-M204", 5), /已完工/);
});

console.log(`\n全部 ${passed} 组联动规则断言通过`);
