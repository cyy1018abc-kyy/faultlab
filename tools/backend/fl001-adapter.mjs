/* owner: backend-adapter | module: tools/backend/fl001-adapter | contract: FL19_BACKEND_RFC_APPROVED §3 / V312 准入清单
   FL-001 后端适配器（首批 B-1/B-5，Node 侧 stdio 子进程形态——RFC I-1：stdio 仅限 Node 工具链路径，
   浏览器回环 HTTP 桥属增补二）。适配器只产数值（produce），契约组装权在页面侧（assembleRun/createFromParts，
   增补二交付）。作用域纪律（RFC §1 受控扩展）：凡经本适配器的 Run，scope 强制 extension_preview——
   该强制点在增补二的组装层落地；本增量先冻结适配器面与 golden 校验路径。 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PY = {
  b1: path.join(HERE, 'py', 'fl001_analytic.py'),
  b5: path.join(HERE, 'py', 'fl001_ode_rk4.py')
};

export const ADAPTERS = {
  'py-analytic-fl001': { script: PY.b1, admitted: true },
  'py-rk4-fl001': { script: PY.b5, admitted: true }
};

function runPy(script, args) {
  const res = spawnSync('python', [script, ...args], { encoding: 'utf8', timeout: 60000 });
  if (res.status !== 0) {
    throw new Error('[BK-E04] 后端进程失败（exit ' + res.status + '）：' +
      (res.stderr || '').split('\n').slice(-3).join(' / '));
  }
  return JSON.parse(res.stdout);
}

export function list() {
  return Object.entries(ADAPTERS).map(([id, a]) => runPy(a.script, []));
}

export function capabilities(backendId) {
  const a = ADAPTERS[backendId];
  if (!a) throw Object.assign(new Error('[BK-E02] 未知适配器：' + backendId), { code: 'BK-E02' });
  return runPy(a.script, []).capabilities;
}

export function produce(backendId, config) {
  const a = ADAPTERS[backendId];
  if (!a) throw Object.assign(new Error('[BK-E02] 未知适配器：' + backendId), { code: 'BK-E02' });
  const out = runPy(a.script, ['--config-json', JSON.stringify(config)]);
  if (!out || out.systemId !== 'FL-001' || !out.t || !out.signals || !out.metrics) {
    throw Object.assign(new Error('[BK-E02] 后端输出未通过形状校验（不部分采纳）'), { code: 'BK-E02' });
  }
  if (Math.round(out.config.duration_s / out.config.dt_s) + 1 !== out.t.length) {
    throw Object.assign(new Error('[BK-E02] 点数与 duration/dt 派生不符'), { code: 'BK-E02' });
  }
  return out;
}

export function selfCheck(backendId) {
  const a = ADAPTERS[backendId];
  const res = spawnSync('python', [a.script, '--self-check'], { encoding: 'utf8', timeout: 60000 });
  return { backendId, ok: res.status === 0, stderr: (res.stderr || '').trim() };
}

export function sourceFiles() {
  return Object.values(PY);
}

if (process.argv[1] && process.argv[1].endsWith('fl001-adapter.mjs')) {
  const cmd = process.argv[2] || 'list';
  if (cmd === 'list') {
    console.log(JSON.stringify(list(), null, 2));
  } else if (cmd === 'produce') {
    const cfg = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
    console.log(JSON.stringify(produce(process.argv[4] || 'py-analytic-fl001', cfg), null, 2));
  }
}
