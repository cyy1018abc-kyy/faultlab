/* owner: lead-export | module: tests/report | contract: BACKLOG P1-02 / UI_COPY_GUARDRAILS §1.5/§6
   HTML 报告正式验收（P1-02）：自包含、转义、失败态不写成功、§1.5 证据页脚、不可用不填 0。
   运行：node tests/report.test.js；失败非零退出。 */
'use strict';

const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;

/* export.js 为 UI 层经典脚本（IIFE 无 DOM 顶层依赖），在 Node 中手动加载以测 htmlReport */
const fs = require('fs');
const path = require('path');
(0, eval)(fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'export.js'), 'utf8'));

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }
function contains(html, token, name) {
  ok(typeof html === 'string' && html.indexOf(token) !== -1, name, '缺少：' + token);
}

ok(typeof FL.exporter === 'object' && typeof FL.exporter.htmlReport === 'function', 'export.js 在 Node 中可加载');

const baseline = core.simulate(core.createConfig('FL-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }), { runId: 'RPT-BASE' });
const trial = core.simulate(core.createConfig('FL-001', {}), { runId: 'RPT-TRIAL' });
const comp = core.compareRuns(baseline, trial);
const system = FL.systems.get('FL-001');
const html = FL.exporter.htmlReport({ baseline, trial, comparison: comp, system });

/* 1. 自包含：无外部 http(s) 资源、无外链 script/link */
ok(!/https?:\/\//.test(html), '报告无外部网络引用（自包含）', (html.match(/https?:\/\/[^"'\s]+/) || []).slice(0, 3).join(','));
ok(!/<script\s+src=/i.test(html), '无外链 script');
ok(!/<link\s+rel="stylesheet"/i.test(html), '无外链 stylesheet（样式内联）');

/* 2. 结构完整性：标题/指标/检查/事件/假设均在 */
contains(html, 'FaultLab', '报告品牌在场');
contains(html, 'E_bat_true_60s', '契约指标 ID 进入报告');
contains(html, 'conservation-true', '质量检查表在场');
contains(html, 'EV-001', '事件表在场');
contains(html, 'A-ideal-bus', '模型假设在场');
contains(html, '定义自洽', 'PHY-01 口径措辞（W-05）');

/* 3. §1.5 固定证据页脚（TXT-03） */
contains(html, 'data-testid="export-footer"', '页脚 testid=export-footer');
contains(html, 'model_provenance=analytical_demo', '页脚：model_provenance');
contains(html, 'data=synthetic', '页脚：data=synthetic');
contains(html, 'verification.model_validation=not_performed', '页脚：model_validation');
contains(html, 'verification.hardware_verification=not_performed', '页脚：hardware_verification');
contains(html, 'hash=content_integrity_only(not_a_signature)', '页脚：hash 语义');
contains(html, 'rounding=round-half-up', '页脚：rounding');
contains(html, '内容校验和：不代表签名/来源/第三方认证', '页脚：哈希免责串');
contains(html, 'integrity.run_hash=sha256:', '页脚：run_hash 字段');

/* 4. 成功态措辞边界：不得出现"验证通过"；允许"内部一致性检查通过" */
contains(html, '内部一致性检查通过（演示级）', '成功态使用批准措辞');
ok(html.indexOf('验证通过') === -1, '报告无"验证通过"字样');
ok(html.indexOf('模型验证通过') === -1 && html.indexOf('物理守恒验证通过') === -1, '无物理/模型验证宣称');

/* 5. 注入转义：label/detail 中的 HTML 必须被转义 */
const evil = cloneWith(trial, (r) => {
  r.label = '<script>alert(1)</script> & "quotes"';
  r.causal.headline = '<img src=x onerror=alert(2)>';
});
const evilHtml = FL.exporter.htmlReport({ baseline, trial: evil, comparison: comp, system });
ok(evilHtml.indexOf('<script>alert(1)') === -1, '注入脚本未以原始形式出现');
contains(evilHtml, '&lt;script&gt;alert(1)&lt;/script&gt;', '注入被转义为文本实体');
contains(evilHtml, '&quot;quotes&quot;', '引号被转义');
ok(evilHtml.indexOf('<img src=x onerror') === -1, 'img onerror 注入被转义');

/* 6. 失败态：不写成功、带 FAIL 与下一步动作 */
const failedRun = cloneWith(trial, (r) => {
  r.quality = r.quality.map((q) => q.check_id === 'conservation-true'
    ? Object.assign({}, q, { status: 'fail', reason: '模拟失败：定义自洽超差' })
    : q);
});
const failedComp = core.compareRuns(baseline, failedRun);
const failedHtml = FL.exporter.htmlReport({ baseline, trial: failedRun, comparison: failedComp, system });
contains(failedHtml, '内部一致性检查未通过（FAIL · 仅排障用途）', '失败态标题使用 ST-06 措辞');
contains(failedHtml, 'FAIL · 内部一致性检查未通过 | model_provenance=analytical_demo', '失败页脚带 FAIL 前缀（§1.5）');
ok(failedHtml.indexOf('内部一致性检查通过（演示级）') === -1, '失败态不出现成功徽标文案');
ok(failedHtml.indexOf('FAIL') !== -1, '失败态含 FAIL 标签');

/* 7. 不可用不填 0：健康试验组的 focal 指标为 null → 显示"不可用" */
const healthyHtml = FL.exporter.htmlReport({ baseline, trial: baseline, comparison: core.compareRuns(baseline, baseline), system });
contains(healthyHtml, '不可用', '缺失指标显示"不可用"');

/* 8. 对比不可比提示（ST-07 措辞）：healthy ↔ monitor 双差异 → incomparable */
const incompHtml = FL.exporter.htmlReport({
  baseline, trial: core.simulate(core.createConfig('FL-001', { feedback_mode: 'monitor' }), { runId: 'RPT-MON' }),
  comparison: core.compareRuns(baseline, core.simulate(core.createConfig('FL-001', { feedback_mode: 'monitor' }), { runId: 'RPT-MON' })),
  system
});
contains(incompHtml, '本对比不可比（incomparable）', '不可比提示（ST-07）在场');

function cloneWith(run, mutate) {
  const copy = JSON.parse(JSON.stringify(run));
  mutate(copy);
  return copy;
}

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('HTML 报告验收测试全部通过（P1-02）。');
