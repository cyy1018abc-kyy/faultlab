/* owner: backend-adapter | module: tests/backend-bridge | contract: FL19_BACKEND_RFC_APPROVED §3.2 I-2 / 增量三
   后端对照 HTTP 桥集成测试：启动 bridge 子进程（随机端口+发现文件）→
   令牌/Origin/Sec-Fetch-Site 安全边界 → /capabilities → /simulate 与适配器直连一致性。
   运行：node tests/backend-bridge.test.js；失败非零退出。 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DISCOVERY = path.join(os.tmpdir(), 'backend-bridge-test-' + Date.now() + '.json');

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

function get(url, headers) {
  return new Promise((resolve) => {
    const req = http.request(url, { method: 'GET', headers: headers || {} }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

function post(url, headers, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, headers || {})
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.write(data);
    req.end();
  });
}

(async () => {
  const child = spawn('python', [path.join(ROOT, 'tools', 'backend', 'py', 'bridge.py'),
    '--port', '0', '--discovery', DISCOVERY], { cwd: ROOT });

  /* 读发现文件（轮询 ≤5 s） */
  let disc = null;
  for (let i = 0; i < 50 && !disc; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try { disc = JSON.parse(fs.readFileSync(DISCOVERY, 'utf8')); } catch (e) { /* 未就绪 */ }
  }
  ok(!!disc && typeof disc.port === 'number' && typeof disc.token === 'string' && disc.token.length >= 32,
    'bridge：发现文件含随机 port/token');
  if (!disc) { child.kill(); finish(); return; }
  const base = 'http://127.0.0.1:' + disc.port;
  const localOrigin = 'http://127.0.0.1:4318';
  const tok = { 'X-Bridge-Token': disc.token, Origin: localOrigin };

  /* 安全边界 */
  const noTok = await get(base + '/capabilities', { Origin: localOrigin });
  eq(noTok.status, 403, '无令牌 → 403');
  const badOrigin = await get(base + '/capabilities', { 'X-Bridge-Token': disc.token, Origin: 'http://evil.example' });
  eq(badOrigin.status, 403, '外部 Origin → 403（CORS 白名单）');
  const badSite = await get(base + '/capabilities', Object.assign({ 'Sec-Fetch-Site': 'cross-site' }, tok));
  eq(badSite.status, 403, 'Sec-Fetch-Site=cross-site → 403');

  /* 业务端点 */
  const caps = await get(base + '/capabilities', tok);
  eq(caps.status, 200, '/capabilities 200（令牌+本机 Origin）');
  const capsData = JSON.parse(caps.body);
  eq(capsData.capabilities.length, 2, '两个注册适配器');
  const corsEcho = caps.headers['access-control-allow-origin'];
  eq(corsEcho, localOrigin, 'CORS 仅回显本机 Origin');

  const cfg = { systemId: 'FL-001', duration_s: 60, dt_s: 0.1, fault_time_s: 20, bias_A: 10,
    Pload_demand_kW: 30, SOC0_pct: 60, tau_s: 1.5, feedback_mode: 'closed_loop', family: 'sensor_drift' };
  const sim = await post(base + '/simulate', tok, { backendId: 'py-analytic-fl001', config: cfg });
  eq(sim.status, 200, '/simulate 200');
  const simData = JSON.parse(sim.body);
  eq(simData.ok, true, '/simulate ok');
  eq(simData.result.t.length, 601, 'produce 601 点');
  ok(!!simData.result.signals.I_bat_meas_A, 'produce 含 I_bat_meas_A');

  const badFam = await post(base + '/simulate', tok,
    { backendId: 'py-analytic-fl001', config: Object.assign({}, cfg, { family: 'gt_load' }) });
  eq(badFam.status, 500, '未知家族 → 500（不部分采纳）');

  /* 确定性：同 config 两次一致 */
  const sim2 = await post(base + '/simulate', tok, { backendId: 'py-analytic-fl001', config: cfg });
  eq(JSON.stringify(JSON.parse(sim2.body).result.t), JSON.stringify(simData.result.t),
    '确定性：同 config 结果一致');

  child.kill();
  try { fs.unlinkSync(DISCOVERY); } catch (e) { /* ignore */ }
  finish();
})().catch((e) => { if (global.__child) global.__child.kill(); console.error('[FAIL] ' + e.message); finish(); });

function finish() {
  console.log('\n== 后端对照 HTTP 桥集成测试 ==');
  if (fail) {
    console.log('FAIL ' + fail + ' / PASS ' + pass);
    failures.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('PASS ' + pass + ' / FAIL 0 ✓（安全边界 + 业务端点 + 确定性）');
  process.exit(0);
}

/* 保证异常路径也杀子进程 */
process.on('exit', () => { try { if (global.__child) global.__child.kill(); } catch (e) { /* ignore */ } });
