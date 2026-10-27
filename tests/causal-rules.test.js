/* owner: causal-compare | module: tests/causal-rules | contract: UI_COPY_GUARDRAILS §3/§4 / G0-DEC-13
   G4 因果规则与证据链（I-08 完整版 / P0b-03）：
   - rule_id/rule_version/EvidenceLink 字段完备且绑定一致；
   - ⑤→⑥ 边不存在（TXT-06），⑥ 从测量通道分支接入；
   - ⑥ 文本含代数恒等分解式与"不是能量损失"（TXT-05）；
   - 因果/对比文案无禁止词（与 copy-guard 互补的程序化断言）。
   运行：node tests/causal-rules.test.js；失败非零退出。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

const run = core.simulate(core.createConfig('FL-001', {}), { runId: 'CAUSAL-TEST' });
const causal = run.causal;
const sysSignals = FL.systems._raw.get('FL-001').signals.map((s) => s.id);

/* 1. 规则版本与 rule_id（D-06：规则模板版本化 + 证据绑定） */
eq(causal.rule_version, 'cr.fl001.v1', 'causal.rule_version 存在');
ok(causal.nodes.length === 6, '闭环故障因果链六节点');
causal.nodes.forEach((node) => {
  ok(typeof node.rule_id === 'string' && node.rule_id.indexOf('CR-FL001-') === 0,
    '节点 ' + node.id + ' rule_id 版本化（' + node.rule_id + '）');
  ok(Array.isArray(node.evidence) && node.evidence.length > 0, '节点 ' + node.id + ' 有证据');
  node.evidence.forEach((ev) => {
    eq(ev.run_id, run.runId, '证据 run_id 绑定（' + node.id + '）');
    eq(ev.rule_id, node.rule_id, '证据与节点共享 rule_id（' + node.id + '）');
    ok(typeof ev.signal_id === 'string' && sysSignals.indexOf(ev.signal_id) !== -1, '证据 signal_id 存在（' + node.id + '）');
    ok(Array.isArray(ev.time_window_s) && ev.time_window_s.length === 2 &&
      ev.time_window_s[0] <= ev.time_window_s[1] && ev.time_window_s[1] <= 60,
      '证据 time_window_s 有效（' + node.id + '）');
    ok(['CONFIG_FACT', 'MODEL_MECHANISM', 'OBSERVED_NUMERIC'].indexOf(ev.layer) !== -1,
      '证据 layer 三层枚举（' + node.id + '）');
  });
});

/* 2. ⑤→⑥ 边不存在；⑥ 从 ② 测量通道分支接入（TXT-06 / §3.3） */
const edges = causal.edges.map((e) => e.from + '->' + e.to);
ok(edges.indexOf('n5->n6') === -1, '⑤→⑥ 边已删除（G0-DEC-13）', JSON.stringify(edges));
ok(edges.indexOf('n4->n5') !== -1, '④→⑤ 边保留');
ok(edges.indexOf('n2->n6') !== -1, '⑥ 从 ② 测量通道分支接入');
const n2n6 = causal.edges.filter((e) => e.from === 'n2' && e.to === 'n6')[0];
ok(n2n6 && n2n6.label.indexOf('测量通道误差的功率当量') !== -1, '②→⑥ 边标注"测量通道误差的功率当量"');
ok(n2n6.dashed === true, '②→⑥ 为虚线分支');

/* 3. ⑥ 节点：代数恒等分解 + 边界文案（TXT-05） */
const n6 = causal.nodes.filter((n) => n.id === 'n6')[0];
ok(n6.detail.indexOf('r_meas = (P_gen + P_bat,true − P_load) + (P_bat,meas − P_bat,true) = 0 + 0.4·b') !== -1,
  '⑥ 含完整恒等分解式', n6.detail.slice(0, 120));
ok(n6.detail.indexOf('不是能量损失') !== -1, '⑥ 含"不是能量损失"');
ok(n6.detail.indexOf('不是 ⑤ 的结果') !== -1, '⑥ 明确"不是 ⑤ 的结果"');
ok(n6.epistemic === '代数恒等' && n6.kind === 'algebraic_identity', '⑥ 携带代数恒等认识论标签');
ok(causal.mechanismSummary.indexOf('不是能量损失') !== -1 && causal.mechanismSummary.indexOf('不是发电机补偿的结果') !== -1,
  '机制摘要含双重边界（不是能量损失 / 不是发电机补偿的结果）');

/* 4. 三层认识论标签齐备（U-10） */
const layers = causal.nodes.map((n) => n.layer);
ok(layers.indexOf('config') !== -1 && layers.indexOf('mechanism') !== -1 && layers.indexOf('observation') !== -1,
  'config/mechanism/observation 三层各≥1');

/* 5. monitor 链路：r_meas 节点同样从测量通道分支（无发电机节点） */
const mon = core.simulate(core.createConfig('FL-001', { feedback_mode: 'monitor' }), { runId: 'CAUSAL-MON' });
const monEdges = mon.causal.edges.map((e) => e.from + '->' + e.to);
ok(monEdges.indexOf('m2->m4') !== -1 && monEdges.every((e) => e !== 'm3->m4' && e !== 'm5->m4'),
  'monitor 链 r_meas（m4）从测量分支接入');
ok(mon.causal.nodes.some((n) => n.detail.indexOf('不是能量损失') !== -1 || n.detail.indexOf('不是能量损失') !== -1),
  'monitor 链含测量偏差边界文案');

/* 6. 措辞护栏（程序化断言，与 copy-guard 互补）：因果链文本无"因为发电机补偿所以残差" */
ok(n6.detail.indexOf('因为发电机补偿所以') === -1, '⑥ 不把残差归因于发电机补偿');
ok(causal.nodes.every((n) => n.detail.indexOf('多发') === -1), '因果链无"多发"表述');
ok(causal.nodes.every((n) => n.detail.indexOf('诊断') === -1), '因果链无诊断类表述');

/* 7. 因果页横幅与教学卡文案在源码中逐字落地（TXT-04/TXT-07 的源级断言；
    DOM 级断言由 tools/e2e.mjs 扩展覆盖） */
const causalSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'pages', 'causal.js'), 'utf8');
ok(causalSrc.indexOf('本次故障是运行前注入的配置事实；本页不做检测/定位/诊断，无检出率与延迟指标。') !== -1,
  '§3.1 锁定横幅逐字存在');
ok(causalSrc.indexOf('data-testid\': \'causal-banner') !== -1, '横幅携带 data-testid=causal-banner');
ok(causalSrc.indexOf('card-residual-energy') !== -1, '教学卡携带 data-testid=card-residual-energy');
ok(causalSrc.indexOf('0.04444') !== -1 && causalSrc.indexOf('0.04278') !== -1 && causalSrc.indexOf('0.00167') !== -1
  && causalSrc.indexOf('代数恒等') !== -1, '教学卡三量并列 + 代数恒等（TXT-07）');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('因果规则与证据链测试全部通过（G0-DEC-13 / TXT-05/06/07 源级）。');
