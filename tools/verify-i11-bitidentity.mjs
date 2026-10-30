/* owner: core-engine | module: tools/verify-i11-bitidentity | contract: RFC_MODEL_INTERFACE_I11.md 移植附录（CHG-20261030-07） */
/* I-11 移植逐位一致性验证：对固定配置矩阵经 FL.registry.createRun 全管线输出
   run_hash 与 series/metrics 哈希快照（run_hash 由 registry 层计算，G0-DEC-07 契约面）。
   用法：node tools/verify-i11-bitidentity.mjs [输出文件]
   移植验收（RFC §4 兼容性契约，适配本基线）：移植前后快照逐字段一致 —— run_hash 逐位不变。 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { bootstrap } = require(path.join(ROOT, 'tests', 'core-load.js'));

const FL = bootstrap();
const core = FL.core;

/* 配置矩阵：plant 接管家族（none / sensor_drift）+ 暂缓家族（actuator / load_step）+ 对照（GT-001）。
   暂缓家族与对照走未改动路径，快照恒等是平凡要求；plant 家族是本验证的主体。 */
const MATRIX = [
  { tag: 'FL-001/none/closed_loop', system: 'FL-001', override: { fault: { family: 'none' } } },
  { tag: 'FL-001/none/monitor', system: 'FL-001', override: { fault: { family: 'none' }, feedback_mode: 'monitor' } },
  { tag: 'FL-001/sensor_drift/closed_loop', system: 'FL-001', override: { fault: { family: 'sensor_drift' } } },
  { tag: 'FL-001/sensor_drift/monitor', system: 'FL-001', override: { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' } },
  { tag: 'FL-001/actuator_fault/closed_loop', system: 'FL-001', override: { fault: { family: 'actuator_fault' } } },
  { tag: 'FC-001/none/closed_loop', system: 'FC-001', override: { fault: { family: 'none' } } },
  { tag: 'FC-001/none/monitor', system: 'FC-001', override: { fault: { family: 'none' }, feedback_mode: 'monitor' } },
  { tag: 'FC-001/sensor_drift/closed_loop', system: 'FC-001', override: { fault: { family: 'sensor_drift' } } },
  { tag: 'FC-001/sensor_drift/monitor', system: 'FC-001', override: { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' } },
  { tag: 'FC-001/load_step/closed_loop', system: 'FC-001', override: { fault: { family: 'load_step' } } },
  { tag: 'FC-001/actuator_fault/closed_loop', system: 'FC-001', override: { fault: { family: 'actuator_fault' } } },
  { tag: 'GT-001/sensor_drift/closed_loop', system: 'GT-001', override: { fault: { family: 'sensor_drift' } } }
];

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

const report = {
  purpose: 'I-11 plant 接口移植逐位一致性快照（CHG-20261030-07）',
  engine_version: core.ENGINE_VERSION,
  generated_at: new Date().toISOString(),
  runs: {}
};

for (const item of MATRIX) {
  const cfg = core.createConfig(item.system, item.override);
  const run = FL.registry.createRun({
    config: cfg,
    runId: 'I11BIT-' + item.tag.replace(/[^A-Za-z0-9]+/g, '_'),
    createdAt: '2026-10-30T00:00:00.000Z'
  });
  report.runs[item.tag] = {
    run_hash: run.run_hash,
    signals_sha256: sha256(JSON.stringify(run.timeseries.signals)),
    metrics_sha256: sha256(JSON.stringify(run.metrics))
  };
}

const out = process.argv[2];
const text = JSON.stringify(report, null, 2) + '\n';
if (out) {
  fs.writeFileSync(out, text);
  console.log('快照已写入 ' + out);
} else {
  process.stdout.write(text);
}
console.log('共 ' + Object.keys(report.runs).length + ' 个配置快照完成（engine_version=' + core.ENGINE_VERSION + '）');
