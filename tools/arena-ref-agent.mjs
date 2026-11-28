/* owner: arena-protocol | module: tools/arena-ref-agent | contract: NEXT/V1200_WAVE_DESIGN.md R1-5 / §2 B1-4（ROADMAP C-6）
   arena-ref-agent — 内部参考 Agent（L2 MCP stdio 客户端；GT-001 热力链 11 通道盲判读）。

   **性质**：内部参考实现，**非第三方 Agent**——用于验证 L2 基础设施与给出可复现基线分；评分不代表任何真实诊断能力。
   真值隔离：本进程只通过 tools/arena-mcp-server.mjs 的 JSON-RPC 响应获取盲遥测；不读 reveal、不 import 生成器。

   相对 eval-session-003 归档脚本的改动（依据 = session-003 已公开的失效模式，见其 README / reveal）：
     ① 触发候选改为**无量纲排序**：通道跳变 / 该通道中位跳变（原按绝对跳变排序 ⇒ n_meas_rpm 的 rpm 量级
        压过 7 kW 负载阶跃，load_step 被误判）；
     ② 分类改为**逐族正证据**（onset 切片同时取 4 个判别通道）：P_load_demand 阶跃 ⇒ load_step；
        f_channel_diff 阶跃 ⇒ sensor_drift；valve_meas ≠ valve_cmd ⇒ actuator_fault；
        无正证据 ⇒ 低置信度（原为「否则 actuator」兜底）；
     ③ 幅值取自**切片内正确列**（原以全观测表下标索引 3 列切片 ⇒ NaN）。

   用法：node tools/arena-ref-agent.mjs --pack <blind_pack.json> --out <submission-*.json> [--name <agent 名>]
   退出码：0 = 提交封存；1 = 失败。零第三方依赖。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function opt(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const PACK = path.resolve(opt('pack', ''));
const OUT = path.resolve(opt('out', 'submission-arena-ref-agent.json'));
const NAME = opt('name', 'arena-ref-agent');
if (!PACK || !fs.existsSync(PACK)) {
  console.error('[agent][FAIL] --pack <blind_pack.json> 缺失或不存在');
  process.exit(1);
}

const SERVER = path.join(ROOT, 'tools', 'arena-mcp-server.mjs');
const child = spawn(process.execPath, [SERVER, '--pack', PACK], { stdio: ['pipe', 'pipe', 'inherit'] });
const pending = new Map();
let buf = '';
let nextId = 1;
child.stdout.setEncoding('utf8');
child.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(Object.assign(new Error(msg.error.message), { code: msg.error.data && msg.error.data.code }));
      else if (msg.result && msg.result.content && msg.result.content[0]) resolve(JSON.parse(msg.result.content[0].text));
      else resolve(msg.result);
    }
  }
});
function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
function callTool(name, a) { return rpc('tools/call', { name, arguments: a }); }

/* 判别通道（GT-001 热力链盲观测面中带族语义的 4 个） */
const CH_LOAD = 'P_load_demand_kW';
const CH_FD = 'f_channel_diff_Hz';
const CH_VCMD = 'valve_cmd_pct';
const CH_VMEAS = 'valve_meas_pct';

/* ① 无量纲触发候选：每通道相邻跳变 / 该通道中位跳变；取比值最大者（同比值取更早行） */
function onsetCandidate(beacon, obs) {
  let best = { channel: null, rowIdx: -1, ratio: 0, delta: 0 };
  for (let j = 0; j < obs.length; j++) {
    const diffs = [];
    for (let i = 1; i < beacon.length; i++) {
      const a = beacon[i - 1][j + 1], b = beacon[i][j + 1];
      diffs.push((a === null || b === null) ? 0 : Math.abs(b - a));
    }
    const sorted = diffs.slice().sort((x, y) => x - y);
    const med = sorted[Math.floor(sorted.length / 2)] || 0;
    for (let i = 1; i < beacon.length; i++) {
      const d = diffs[i - 1];
      const scale = Math.max(1e-9, Math.abs(beacon[i - 1][j + 1] || 0) * 1e-6);
      if (d <= Math.max(10 * med, scale)) continue;
      const ratio = d / Math.max(med, scale);
      if (ratio > best.ratio || (ratio === best.ratio && i < best.rowIdx)) {
        best = { channel: obs[j], rowIdx: i, ratio, delta: d };
      }
    }
  }
  return best;
}

async function main() {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: NAME } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const tools = await rpc('tools/list', {});
  console.log('[agent] MCP 握手完成 · tools=' + tools.tools.map((t) => t.name).join(','));

  const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));
  const episodeDiagnoses = [];

  for (const ep of pack.episodes) {
    const obs = ep.observables.map((o) => o.id);
    const sum = await callTool('arena_get_telemetry_summary', { episode_id: ep.episode_id });
    const beacon = sum.coarse_beacon.rows;
    const best = onsetCandidate(beacon, obs);
    const tBeacon = best.rowIdx >= 1 ? beacon[best.rowIdx][0] : null;
    console.log('[agent] ep' + ep.index + ' 候选：' + (best.channel || '无') + ' @t=' + tBeacon
      + (best.channel ? ' ratio=' + best.ratio.toExponential(2) : ''));

    let diagnosis;
    const anchors = [];
    if (!best.channel) {
      const s = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [obs[0]], t_start: 10, t_end: 20, stride: 10 });
      anchors.push({ kind: 'steady_state', variable: obs[0], t_start: 10, t_end: 20,
        rule_id: 'n1', backed_by_query_seq: s.seq, note: '稳态平稳' });
      diagnosis = {
        faultDetected: false, faultType: 'none', component: 'none', magnitude: null,
        detectTime_s: null, confidence: 0.05,
        explanation: '全部盲观测通道粗信标无显著（无量纲）跳变，判健康局。' };
    } else {
      /* 精定位：候选通道在信标前 2 s 窗内的边界行 */
      const loc = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [best.channel],
        t_start: Math.max(0, tBeacon - 2.0), t_end: tBeacon, stride: 4 });
      const bRow = loc.boundary.length ? loc.rows[loc.boundary[0].row] : null;
      const tFault = bRow ? bRow[0] : tBeacon;
      /* ② onset 切片：4 个判别通道（存在于观测面者）同取 */
      const disc = [CH_LOAD, CH_FD, CH_VCMD, CH_VMEAS].filter((c) => obs.indexOf(c) >= 0);
      const onset = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: disc,
        t_start: Math.max(0, tFault - 0.2), t_end: Math.min(60, tFault + 0.2), stride: 1 });
      const ob = onset.boundary;
      const col = (c) => 1 + disc.indexOf(c);            /* ③ 切片内列号（第 0 列 = t） */
      const at = (rowSel, c) => {
        if (!ob.length || disc.indexOf(c) < 0) return null;
        const v = onset.rows[ob[rowSel].row][col(c)];
        return v === undefined ? null : v;
      };
      const step = (c) => {
        const a = at(0, c), b = at(1, c);
        return (a === null || b === null) ? null : b - a;
      };
      const dLoad = step(CH_LOAD);
      const dFd = step(CH_FD);
      const vCmdPost = at(1, CH_VCMD);
      const vMeasPost = at(1, CH_VMEAS);
      let family, component, magUnit, magValue, confidence, basis;
      if (dLoad !== null && Math.abs(dLoad) > 1e-6) {
        family = 'load_step'; component = 'load'; magUnit = 'kW'; magValue = Math.abs(dLoad);
        confidence = 0.9; basis = 'P_load_demand 阶跃 ' + dLoad.toFixed(3) + ' kW';
      } else if (dFd !== null && Math.abs(dFd) > 1e-9) {
        family = 'sensor_drift'; component = 'speed_sensor'; magUnit = 'Hz'; magValue = Math.abs(dFd);
        confidence = 0.9; basis = 'f_channel_diff 阶跃 ' + dFd.toFixed(4) + ' Hz（传感链偏置面）';
      } else if (vCmdPost !== null && vMeasPost !== null && Math.abs(vMeasPost - vCmdPost) > 1e-6) {
        family = 'actuator_fault'; component = 'fuel_valve'; magUnit = '%'; magValue = vMeasPost;
        confidence = 0.85; basis = 'valve_meas ' + vMeasPost.toFixed(2) + '% ≠ valve_cmd ' + vCmdPost.toFixed(2) + '%（执行面钳位）';
      } else {
        family = 'actuator_fault'; component = 'fuel_valve'; magUnit = '%'; magValue = 0;
        confidence = 0.3; basis = '判别通道无正证据（低置信度兜底）';
      }
      const prop = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [best.channel],
        t_start: Math.min(60, tFault + 1), t_end: Math.min(60, tFault + 11), stride: 10 });
      anchors.push({ kind: 'onset', variable: disc[0] || best.channel,
        t_start: Math.max(0, tFault - 0.2), t_end: Math.min(60, tFault + 0.2),
        rule_id: 'n1', backed_by_query_seq: onset.seq, note: 'onset 判别窗' });
      anchors.push({ kind: 'propagation', variable: best.channel,
        t_start: Math.min(60, tFault + 1), t_end: Math.min(60, tFault + 11),
        rule_id: 'n3', backed_by_query_seq: prop.seq, note: '传播窗' });
      diagnosis = {
        faultDetected: true, faultType: family, component,
        magnitude: { value: Math.round(magValue * 100) / 100, unit: magUnit },
        detectTime_s: tFault, confidence,
        explanation: '盲观测在 t=' + tFault + ' s 出现跳变；判别依据：' + basis + '。',
      };
    }
    episodeDiagnoses.push({ episode_id: ep.episode_id, diagnosis, evidence_anchors: anchors });
    console.log('[agent] ep' + ep.index + ' 判读：' + diagnosis.faultType
      + (diagnosis.magnitude ? ' mag=' + diagnosis.magnitude.value + diagnosis.magnitude.unit : '')
      + ' t0=' + diagnosis.detectTime_s + ' conf=' + diagnosis.confidence);
  }

  const sub = await callTool('arena_export_submission', { agent: { name: NAME }, episodes: episodeDiagnoses });
  fs.writeFileSync(OUT, JSON.stringify(sub, null, 2) + '\n');
  console.log('[agent] 提交封存：ledger=' + sub.query_ledger.length + ' 条 · sha=' + sub.submission_sha256.slice(0, 12) + '… → ' + OUT);
  child.kill();
}

main().catch((e) => { console.error('[agent][FAIL] ' + (e.code || '') + ' ' + e.message); child.kill(); process.exit(1); });
