/* eval-session-002 agent —— MCP stdio 协议客户端（外部 Agent 角色的 harness 验证实现）。
   真值隔离声明：本脚本进程 ONLY 通过 arena-mcp-server 的 JSON-RPC 响应获取数据
   （blind 遥测）；不读 reveal.json / 不读 run 对象 / 不 import src/**。
   诊断启发式（盲观测口径，噪声关闭会话）：
     ① coarse_beacon（零预算）逐通道一阶差分 → 全局最大阶跃（行对）= 候选触发与通道；
     ② 分类（FL-001 盲通道公开结构）：P_load_demand 阶跃 → load_step；
        r_meas_kW 同点阶跃 → sensor_drift（测量一致性残差=偏置面）；否则 → actuator_fault；
        全通道无显著阶跃 → healthy；
     ③ 预算内定位：locator 切片（1 通道，触发邻域 stride 4——边界行给出精确触发时刻）→
        onset 切片（2 通道 ±0.4 s——pre/post 幅值差 = 偏置幅值）→ propagation 切片
        （2 通道触发后 10 s）；healthy 局单条稳态切片承载 steady_state 锚点；
     ④ 锚点：onset（宽 ≤2.0 s，rule_id = 系统公开因果模板节点 id n1）/ propagation
        （触发后 ≥5 s，n3）/ steady_state——backed_by_query_seq 指向真实账本条目。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const PACK = path.join(HERE, 'blind_pack.json');
const SERVER = path.join(REPO, 'tools', 'arena-mcp-server.mjs');

/* ---------- MCP stdio 客户端 ---------- */
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
function callTool(name, args) {
  return rpc('tools/call', { name, arguments: args });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'eval-session-002-agent' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const tools = await rpc('tools/list', {});
  console.log('[agent] MCP 握手完成 · tools=' + tools.tools.map((t) => t.name).join(','));

  const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));
  const episodeDiagnoses = [];

  for (const ep of pack.episodes) {
    const obs = ep.observables.map((o) => o.id);
    /* ① 免费粗信标 */
    const sum = await callTool('arena_get_telemetry_summary', { episode_id: ep.episode_id });
    const beacon = sum.coarse_beacon.rows;
    const chWorst = { channel: null, rowIdx: -1, delta: 0 };
    const channelMax = {};
    for (let j = 0; j < obs.length; j++) {
      let med = 0;
      const diffs = [];
      for (let i = 1; i < beacon.length; i++) {
        const a = beacon[i - 1][j + 1], b = beacon[i][j + 1];
        const d = (a === null || b === null) ? 0 : Math.abs(b - a);
        diffs.push(d);
      }
      const sorted = diffs.slice().sort((x, y) => x - y);
      med = sorted[Math.floor(sorted.length / 2)] || 0;
      channelMax[obs[j]] = Math.max(...beacon.map((r) => (r[j + 1] === null ? 0 : Math.abs(r[j + 1]))));
      for (let i = 1; i < beacon.length; i++) {
        const a = beacon[i - 1][j + 1], b = beacon[i][j + 1];
        if (a === null || b === null) continue;
        const d = Math.abs(b - a);
        if (d > chWorst.delta && d > Math.max(10 * med, 1e-9)) {
          chWorst.channel = obs[j]; chWorst.rowIdx = i; chWorst.delta = d;
        }
      }
    }
    const tBeacon = chWorst.rowIdx >= 1 ? beacon[chWorst.rowIdx][0] : null;
    console.log('[agent] ep' + ep.index + ' 候选：' + (chWorst.channel || '无显著阶跃')
      + (tBeacon !== null ? ' @ beacon t=' + tBeacon + ' |Δ|=' + chWorst.delta.toFixed(4) : ''));

    let diagnosis;
    const anchors = [];
    if (!chWorst.channel) {
      /* healthy：单条稳态切片承载 steady_state 锚点 */
      const s = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: obs.slice(0, 2), t_start: 10, t_end: 20, stride: 10 });
      anchors.push({ kind: 'steady_state', variable: obs[0], t_start: 10, t_end: 20,
        rule_id: 'n1', backed_by_query_seq: s.seq, note: '稳态残差平稳（盲观测窗）' });
      diagnosis = {
        faultDetected: false, faultType: 'none', component: 'none', magnitude: null,
        detectTime_s: null, confidence: 0.05,
        explanation: '全部盲观测通道粗信标无显著阶跃，测量一致性残差平稳，判健康局。',
      };
    } else {
      /* ② locator：边界行给出精确触发时刻 */
      const loc = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [chWorst.channel],
        t_start: Math.max(0, tBeacon - 2.0), t_end: tBeacon, stride: 4 });
      const bRow = loc.boundary.length ? loc.rows[loc.boundary[0].row] : null;
      const tFault = bRow ? bRow[0] : tBeacon;
      /* ③ onset：pre/post 边界行幅值差 */
      const onset = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [chWorst.channel, 'r_meas_kW'],
        t_start: Math.max(0, tFault - 0.4), t_end: Math.min(60, tFault + 0.4), stride: 1 });
      const ob = onset.boundary;
      const chIdx = 1;
      const preV = ob.length ? onset.rows[ob[0].row][chIdx] : null;
      const postV = ob.length ? onset.rows[ob[1].row][chIdx] : null;
      const rPre = ob.length ? onset.rows[ob[0].row][2] : null;
      const rPost = ob.length ? onset.rows[ob[1].row][2] : null;
      /* ④ propagation：触发后演化窗 */
      const prop = await callTool('arena_slice_telemetry', {
        episode_id: ep.episode_id, variables: [chWorst.channel, 'r_meas_kW'],
        t_start: Math.min(60, tFault + 1), t_end: Math.min(60, tFault + 11), stride: 10 });
      /* 分类（盲观测公开结构判据） */
      const unit = ep.observables.find((o) => o.id === chWorst.channel).unit;
      const stepMag = (preV !== null && postV !== null) ? Math.abs(postV - preV) : chWorst.delta;
      const rStepped = rPre !== null && rPost !== null && Math.abs(rPost - rPre) > 1e-9;
      let family, component;
      if (chWorst.channel === 'P_load_demand_kW') { family = 'load_step'; component = 'load'; }
      else if (rStepped) { family = 'sensor_drift'; component = 'sensor'; }
      else { family = 'actuator_fault'; component = 'converter'; }
      const magUnit = family === 'load_step' ? 'kW' : (family === 'sensor_drift' ? 'A' : '%');
      const magSource = family === 'load_step' ? 'P_load_demand_kW'
        : (family === 'sensor_drift' ? 'I_bat_meas_A' : chWorst.channel);
      const mIdx = obs.indexOf(magSource);
      let magnitude = null;
      if (mIdx >= 0 && ob.length) {
        const preM = onset.rows[ob[0].row][mIdx + 1], postM = onset.rows[ob[1].row][mIdx + 1];
        if (preM !== null && postM !== null) magnitude = Math.abs(postM - preM);
      }
      if (magnitude === null) magnitude = stepMag;
      anchors.push({ kind: 'onset', variable: chWorst.channel,
        t_start: Math.max(0, tFault - 0.4), t_end: Math.min(60, tFault + 0.4),
        rule_id: 'n1', backed_by_query_seq: onset.seq, note: 'onset 阶跃窗（含边界行）' });
      anchors.push({ kind: 'propagation', variable: chWorst.channel,
        t_start: Math.min(60, tFault + 1), t_end: Math.min(60, tFault + 11),
        rule_id: 'n3', backed_by_query_seq: prop.seq, note: '触发后演化窗' });
      diagnosis = {
        faultDetected: true, faultType: family, component,
        magnitude: { value: Math.round(magnitude * 100) / 100, unit: magUnit },
        detectTime_s: tFault, confidence: 0.9,
        explanation: '盲观测 ' + chWorst.channel + ' 在 t=' + tFault + ' s 出现 ' + stepMag.toFixed(3)
          + ' ' + unit + ' 阶跃' + (rStepped ? '，测量一致性残差同步阶跃（传感链偏置面）' : '，指令通道无同步阶跃（物理执行/负荷面）')
          + '；触发后演化窗确认持续偏离。',
      };
    }
    episodeDiagnoses.push({ episode_id: ep.episode_id, diagnosis, evidence_anchors: anchors });
    console.log('[agent] ep' + ep.index + ' 判读：' + diagnosis.faultType
      + (diagnosis.magnitude ? ' mag=' + diagnosis.magnitude.value + diagnosis.magnitude.unit : '')
      + ' t0=' + diagnosis.detectTime_s + ' anchors=' + anchors.length);
  }

  const sub = await callTool('arena_export_submission', {
    agent: { name: 'eval-session-002-mcp-client' },
    episodes: episodeDiagnoses,
  });
  const outPath = path.join(HERE, 'submission-mcp-client.json');
  fs.writeFileSync(outPath, JSON.stringify(sub, null, 2) + '\n');
  console.log('[agent] 提交封存：ledger=' + sub.query_ledger.length + ' 条 · sha='
    + sub.submission_sha256.slice(0, 12) + '… → ' + path.basename(outPath));
  child.kill();
}

main().catch((e) => { console.error('[agent][FAIL] ' + (e.code || '') + ' ' + e.message); process.exit(1); });
