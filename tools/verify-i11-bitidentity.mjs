/* owner: core-engine | module: tools/verify-i11-bitidentity | contract: RFC_MODEL_INTERFACE_I11_APPROVED.md 移植附录（CHG-20261030-07） */
/* I-11 移植逐位一致性验证：对固定配置矩阵经 FL.registry.createRun 全管线输出
   run_hash 与 series/metrics 哈希快照（run_hash 由 registry 层计算，G0-DEC-07 契约面）。

   用法：
     node tools/verify-i11-bitidentity.mjs [输出文件]                # 快照模式（默认，向后兼容）
     node tools/verify-i11-bitidentity.mjs --baseline <基线快照.json> [--out <比对结果.json>]
                                                                     # 比对模式：逐位比对 3 字段

   快照模式：生成当前 12 配置快照（附代码版本元数据 code.commit_sha/branch/worktree_dirty、node、
             engine_version、generated_at）；给定输出文件则写入，否则打印到 stdout。
   比对模式：生成当前快照并与基线快照逐配置比对 run_hash / signals_sha256 / metrics_sha256
             （12 配置 × 3 字段 = 36）；打印匹配数 + 差异明细；--out 给定则写入比对 JSON。
             退出码 0 = 36/36 全等；1 = 存在差异 / 快照读取失败 / 参数错误。
   移植验收（RFC §4 兼容性契约，适配本基线）：移植前后快照逐字段一致 —— run_hash 逐位不变。 */
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { bootstrap } = require(path.join(ROOT, 'tests', 'core-load.js'));

const FL = bootstrap();
const core = FL.core;

/* 比对字段：G0-DEC-07 内容寻址面（run_hash 由 registry 计算；signals/metrics 哈希覆盖数据面）。 */
const FIELDS = ['run_hash', 'signals_sha256', 'metrics_sha256'];

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

/* --------------------------------------- 子进程输出捕获（无管道环境兼容）
   受限沙箱可能禁止 child_process 的管道 stdio（pipe 在 Windows 会 EPERM），导致无法用
   spawnSync(..., { encoding: 'utf8' }) 读取 git 输出。这里把子进程 stdout/stderr 重定向到
   继承的临时文件描述符，再读回文本 —— 语义等价、零第三方依赖，普通环境同样适用。 */
function capture(cmd, argsArr, cwd) {
  const file = path.join(os.tmpdir(), 'fl-i11-capture-' + process.pid + '-' + Date.now()
    + '-' + Math.random().toString(36).slice(2) + '.log');
  let fd = null;
  try {
    fd = fs.openSync(file, 'w');
    const res = spawnSync(cmd, argsArr, { cwd, stdio: ['ignore', fd, fd], windowsHide: true });
    const out = fs.readFileSync(file, 'utf8');
    return { status: res.status, stdout: out, error: res.error || null };
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (e) { /* 忽略 */ }
    }
    try { fs.unlinkSync(file); } catch (e) { /* 忽略 */ }
  }
}

function git(argsArr) {
  const res = capture('git', argsArr, ROOT);
  if (res.error || res.status !== 0) return null;
  return (res.stdout || '').trim();
}

/* 代码版本元数据（证据可追溯）：commit_sha / branch / worktree_dirty（仅跟踪文件）。 */
function codeInfo() {
  const status = git(['status', '--porcelain', '--untracked-files=no']);
  return {
    commit_sha: git(['rev-parse', 'HEAD']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    worktree_dirty: status === null ? null : status.length > 0
  };
}

function baseReport(purpose) {
  return {
    purpose,
    code: codeInfo(),
    node: process.version,
    engine_version: core.ENGINE_VERSION,
    generated_at: new Date().toISOString()
  };
}

/* 生成当前 12 配置快照（runs 键顺序与 MATRIX 一致，便于人工核对）。 */
function buildSnapshot() {
  const report = baseReport('I-11 plant 接口移植逐位一致性快照（CHG-20261030-07）');
  const runs = {};
  for (const item of MATRIX) {
    const cfg = core.createConfig(item.system, item.override);
    const run = FL.registry.createRun({
      config: cfg,
      runId: 'I11BIT-' + item.tag.replace(/[^A-Za-z0-9]+/g, '_'),
      createdAt: '2026-10-30T00:00:00.000Z'
    });
    runs[item.tag] = {
      run_hash: run.run_hash,
      signals_sha256: sha256(JSON.stringify(run.timeseries.signals)),
      metrics_sha256: sha256(JSON.stringify(run.metrics))
    };
  }
  report.runs = runs;
  return report;
}

/* --------------------------------------------------------------- 命令行 */
const USAGE = [
  '用法：',
  '  node tools/verify-i11-bitidentity.mjs [输出文件]',
  '  node tools/verify-i11-bitidentity.mjs --baseline <基线快照.json> [--out <比对结果.json>]'
].join('\n');

function parseArgs(argv) {
  const opts = { baseline: null, out: null };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--baseline' || arg === '--out') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        return { error: '参数 ' + arg + ' 缺少取值' };
      }
      opts[arg.slice(2)] = value;
      i += 1;
    } else if (arg.startsWith('-')) {
      return { error: '未知参数 ' + arg };
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 1) return { error: '多余参数：' + positional.slice(1).join(' ') };
  return { opts, out: opts.out || positional[0] || null };
}

function fail(message) {
  console.error('[FAIL] ' + message);
  return 1;
}

/* 快照模式（默认，向后兼容：node tools/... [输出文件]）。 */
function runSnapshot(outPath) {
  const report = buildSnapshot();
  const text = JSON.stringify(report, null, 2) + '\n';
  if (outPath) {
    try {
      fs.writeFileSync(outPath, text);
    } catch (e) {
      return fail('快照写入失败 ' + outPath + '：' + e.message);
    }
    console.log('快照已写入 ' + outPath);
  } else {
    process.stdout.write(text);
  }
  console.log('共 ' + Object.keys(report.runs).length + ' 个配置快照完成（engine_version='
    + core.ENGINE_VERSION + '）');
  console.log('代码版本 ' + (report.code.commit_sha || '未知') + ' @ ' + (report.code.branch || '未知')
    + '（worktree_dirty=' + String(report.code.worktree_dirty) + '）');
  return 0;
}

function readBaseline(baselinePath) {
  let text;
  try {
    text = fs.readFileSync(baselinePath, 'utf8');
  } catch (e) {
    throw new Error('无法读取基线快照 ' + baselinePath + '：' + e.message);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('基线快照 JSON 解析失败 ' + baselinePath + '：' + e.message);
  }
  if (!data || typeof data !== 'object' || !data.runs || typeof data.runs !== 'object') {
    throw new Error('基线快照缺少 runs 对象：' + baselinePath);
  }
  return data;
}

function shortSha(meta) {
  return meta && meta.code && meta.code.commit_sha ? meta.code.commit_sha.slice(0, 7) : '未知';
}

/* 比对模式：12 配置 × 3 字段 = 36 项逐位比对；任一项不等或结构漂移即失败。 */
function runComparison(baselinePath, outPath) {
  const baseline = readBaseline(baselinePath);
  const current = buildSnapshot();
  const diffs = [];
  const missing = [];
  const extra = [];
  const matchedConfigs = [];
  let fieldsMatched = 0;

  for (const item of MATRIX) {
    const hasBase = Object.prototype.hasOwnProperty.call(baseline.runs, item.tag);
    const base = hasBase ? baseline.runs[item.tag] : null;
    if (!hasBase) missing.push(item.tag);
    let configOk = Boolean(hasBase);
    for (const field of FIELDS) {
      const baseValue = hasBase && base[field] !== undefined ? base[field] : null;
      const currentValue = current.runs[item.tag][field];
      if (hasBase && baseValue === currentValue) {
        fieldsMatched += 1;
      } else {
        configOk = false;
        diffs.push({ config: item.tag, field, baseline: baseValue, current: currentValue });
      }
    }
    if (configOk) matchedConfigs.push(item.tag);
  }
  for (const tag of Object.keys(baseline.runs)) {
    if (!MATRIX.some((item) => item.tag === tag)) extra.push(tag);
  }

  const fieldsCompared = MATRIX.length * FIELDS.length;
  const match = fieldsMatched === fieldsCompared && missing.length === 0 && extra.length === 0;
  const report = {
    purpose: 'I-11 plant 接口移植逐位一致性比对（CHG-20261030-07）',
    generated_at: current.generated_at,
    baseline_path: baselinePath,
    baseline: {
      code: baseline.code || null,
      engine_version: baseline.engine_version || null,
      node: baseline.node || null
    },
    current: {
      code: current.code,
      engine_version: current.engine_version,
      node: current.node
    },
    fields: FIELDS,
    configs_total: MATRIX.length,
    configs_matched: matchedConfigs.length,
    fields_compared: fieldsCompared,
    fields_matched: fieldsMatched,
    missing_in_baseline: missing,
    extra_in_baseline: extra,
    match,
    diffs
  };

  if (outPath) {
    try {
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    } catch (e) {
      return fail('比对结果写入失败 ' + outPath + '：' + e.message);
    }
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }

  const log = match ? console.log : console.error;
  log((match ? '[OK] ' : '[FAIL] ') + '逐位一致性比对：' + matchedConfigs.length + '/' + MATRIX.length
    + ' 配置 · ' + fieldsMatched + '/' + fieldsCompared + ' 字段匹配（基线 ' + shortSha(baseline)
    + ' → 当前 ' + shortSha(current) + '）');
  if (outPath) log('比对结果已写入 ' + outPath);
  if (missing.length) log('基线缺少配置：' + missing.join('、'));
  if (extra.length) log('基线多余配置：' + extra.join('、'));
  if (diffs.length) {
    log('差异明细（' + diffs.length + '）：');
    for (const diff of diffs) {
      log(' - ' + diff.config + ' · ' + diff.field + '：基线=' + String(diff.baseline)
        + ' 当前=' + String(diff.current));
    }
  }
  return match ? 0 : 1;
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error('[FAIL] ' + parsed.error);
    console.error(USAGE);
    return 1;
  }
  const { opts, out } = parsed;
  if (opts.baseline) return runComparison(opts.baseline, out);
  return runSnapshot(out);
}

try {
  process.exitCode = main();
} catch (e) {
  console.error('[FAIL] ' + (e && e.message ? e.message : String(e)));
  process.exitCode = 1;
}
