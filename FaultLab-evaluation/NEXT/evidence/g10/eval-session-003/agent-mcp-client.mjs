/* eval-session-003 agent —— GT-001 L2 MCP stdio 协议客户端（盲判读——GT 热力链适配面）。
   真值隔离：本脚本进程 ONLY 通过 arena-mcp-server JSON-RPC 响应获取数据（blind 遥测）。
   GT 热力链分类启发式（11 通道盲观测面）：
     ① beacon 变点 → 候选触发
     ② 分类：P_load_demand 阶跃 → load_step；f_channel_diff 阶跃 → sensor_drift
        （f_channel_diff = n_meas/60 − f_meas——传感偏置面）；否则 actuator_fault
        （valve_meas = magnitude 钳位面——P_gen_cap + valve_meas 面）
     ③ 幅值 = 通道阶跃差；时刻 = locator 边界行精确触发 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const PACK = path.join(HERE, 'blind_pack.json');
const SERVER = path.join(REPO, 'tools', 'arena-mcp-server.mjs');

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
function callTool(name, args) { return rpc('tools/call', { name, arguments: args }); }

async function main() {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'eval-session-003-gt' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const tools = await rpc('tools/list', {});
  console.log('[agent] MCP 握手完成 · tools=' + tools.tools.map(t => t.name).join(','));

  const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));
  const episodeDiagnoses = [];

  for (const ep of pack.episodes) {
    const obs = ep.observables.map(o => o.id);
    const sum = await callTool('arena_get_telemetry_summary', { episode_id: ep.episode_id });
    const beacon = sum.coarse_beacon.rows;
    let best = { channel: null, rowIdx: -1, delta: 0 };
    for (let j = 0; j < obs.length; j++) {
      const diffs = [];
      for (let i = 1; i < beacon.length; i++) {
        const a = beacon[i - 1][j + 1], b = beacon[i][j + 1];
        diffs.push((a === null || b === null) ? 0 : Math.abs(b - a));
      }
      const sorted = diffs.slice().sort((x, y) => x - y);
      const med = sorted[Math.floor(sorted.length / 2)] || 0;
      for (let i = 1; i < beacon.length; i++) {
        const a = beacon[i - 1][j + 1], b = beacon[i][j + 1];
        if (a === null || b === null) continue;
        const d = Math.abs(b - a);
        if (d > best.delta && d > Math.max(10 * med, 1e-9)) {
          best = { channel: obs[j], rowIdx: i, delta: d };
        }
      }
    }
    const tBeacon = best.rowIdx >= 1 ? beacon[best.rowIdx][0] : null;
    console.log('[agent] ep' + ep.index + ' 候选：' + (best.channel || '无') + ' @t=' + tBeacon + ' |Δ|=' + best.delta.toFixed(4));

    let diagnosis;
    const anchors = [];
    if (!best.channel) {
      const s = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: obs.slice(0, 2), t_start: 10, t_end: 20, stride: 10 });
      anchors.push({ kind: 'steady_state', variable: obs[0], t_start: 10, t_end: 20,
        rule_id: 'n1', backed_by_query_seq: s.seq, note: '稳态平稳' });
      diagnosis = {
        faultDetected: false, faultType: 'none', component: 'none', magnitude: null,
        detectTime_s: null, confidence: 0.05,
        explanation: '全部盲观测通道粗信标无显著阶跃，判健康局。' };
    } else {
      const loc = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [best.channel],
        t_start: Math.max(0, tBeacon - 2.0), t_end: tBeacon, stride: 4 });
      const bRow = loc.boundary.length ? loc.rows[loc.boundary[0].row] : null;
      const tFault = bRow ? bRow[0] : tBeacon;
      const onset = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [best.channel, 'f_channel_diff_Hz'],
        t_start: Math.max(0, tFault - 0.4), t_end: Math.min(60, tFault + 0.4), stride: 1 });
      const ob = onset.boundary;
      const chIdx = 1, fdIdx = 2;
      const preV = ob.length ? onset.rows[ob[0].row][chIdx] : null;
      const postV = ob.length ? onset.rows[ob[1].row][chIdx] : null;
      const preFd = ob.length ? onset.rows[ob[0].row][fdIdx] : null;
      const postFd = ob.length ? onset.rows[ob[1].row][fdIdx] : null;
      const prop = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [best.channel, 'f_channel_diff_Hz'],
        t_start: Math.min(60, tFault + 1), t_end: Math.min(60, tFault + 11), stride: 10 });
      const unit = ep.observables.find(o => o.id === best.channel).unit;
      const stepMag = (preV !== null && postV !== null) ? Math.abs(postV - preV) : best.delta;
      const fdStepped = preFd !== null && postFd !== null && Math.abs(postFd - preFd) > 1e-9;
      let family, component, magUnit, magSrc;
      if (best.channel === 'P_load_demand_kW') { family = 'load_step'; component = 'load'; magUnit = 'kW'; magSrc = 'P_load_demand_kW'; }
      else if (fdStepped) { family = 'sensor_drift'; component = 'speed_sensor'; magUnit = 'Hz'; magSrc = 'f_meas_Hz'; }
      else { family = 'actuator_fault'; component = 'fuel_valve'; magUnit = '%'; magSrc = 'valve_meas_pct'; }
      const mIdx = obs.indexOf(magSrc);
      let magnitude = null;
      if (mIdx >= 0 && ob.length) {
        const preM = onset.rows[ob[0].row][mIdx + 1], postM = onset.rows[ob[1].row][mIdx + 1];
        if (preM !== null && postM !== null) magnitude = Math.abs(postM - preM);
      }
      if (magnitude === null) magnitude = stepMag;
      anchors.push({ kind: 'onset', variable: best.channel,
        t_start: Math.max(0, tFault - 0.4), t_end: Math.min(60, tFault + 0.4),
        rule_id: 'n1', backed_by_query_seq: onset.seq, note: 'onset 阶跃窗' });
      anchors.push({ kind: 'propagation', variable: best.channel,
        t_start: Math.min(60, tFault + 1), t_end: Math.min(60, tFault + 11),
        rule_id: 'n3', backed_by_query_seq: prop.seq, note: '传播窗' });
      diagnosis = {
        faultDetected: true, faultType: family, component,
        magnitude: { value: Math.round(magnitude * 100) / 100, unit: magUnit },
        detectTime_s: tFault, confidence: 0.9,
        explanation: '盲观测 ' + best.channel + ' 在 t=' + tFault + ' s 出现 ' + stepMag.toFixed(3)
          + ' ' + unit + ' 阶跃（' + (fdStepped ? '传感链偏置面' : '物理执行面') + '）。',
      };
    }
    episodeDiagnoses.push({ episode_id: ep.episode_id, diagnosis, evidence_anchors: anchors });
    console.log('[agent] ep' + ep.index + ' 判读：' + diagnosis.faultType
      + (diagnosis.magnitude ? ' mag=' + diagnosis.magnitude.value + diagnosis.magnitude.unit : '')
      + ' t0=' + diagnosis.detectTime_s);
  }

  const sub = await callTool('arena_export_submission', {
    agent: { name: 'eval-session-003-gt' },
    episodes: episodeDiagnoses,
  });
  fs.writeFileSync(path.join(HERE, 'submission-mcp-client.json'), JSON.stringify(sub, null, 2) + '\n');
  console.log('[agent] 提交封存：ledger=' + sub.query_ledger.length + ' 条 · sha=' + sub.submission_sha256.slice(0, 12) + '…');
  child.kill();
}

main().catch(e => { console.error('[agent][FAIL] ' + (e.code || '') + ' ' + e.message); process.exit(1); });
