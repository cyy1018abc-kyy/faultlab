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

/* FC-E2E 段（V1111）需要 core 面（adapter）——bootstrap 引入（零副作用加载） */
const { bootstrap } = require('./core-load');
const FL = bootstrap();

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

/* V312 §10 钉值（重钉 CHG-20261127-01——D-12 linux64；历史 5f60ca78…）——与 fmu_runner.FC_FMU_SHA256_PINNED 同值 */
const FC_FMU_PIN = '259e2cc1c46e239da74bacabc075a40fc0b151bc3ed0b05b6e371a219da71ef6';

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


  /* ------------------------------------------------------------------
   * FC-001 L1-FMU HTTP 面端到端（FCFMU-G2b-04 / V1111 CHG-20261118-05）：
   * 64 位解释器起桥实调 —— /capability 能力面 + /simulate-fc001-fmu 委托
   * + adapter probeBridge/bridgeRun 注入式实跑 + 桥服务 C Run ≡ golden 全等
   * （R-G9-02 parity 0.0 的 HTTP 面复证）。无 64 位解释器环境 ⇒ skip（§9⑥）。
   * ------------------------------------------------------------------ */
  /* 64 位解释器定位：FAULTLAB_PY64 → win32 `where python3.14` / 其余平台 `command -v python3`
     （D-12 linux64 CHG-20261127-01：原 `where` 仅 Windows 可用，Linux 下本段恒 SKIP）+ 位宽自检 */
  const py64 = process.env.FAULTLAB_PY64
    || (function () {
      const cp = require('child_process');
      let p = null;
      try {
        p = cp.execSync(process.platform === 'win32' ? 'where python3.14' : 'command -v python3',
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split(/\r?\n/)[0].trim();
      } catch (e) { return null; }
      if (!p) return null;
      try {
        const bits = cp.execFileSync(p, ['-I', '-c', 'import struct;print(struct.calcsize("P")*8)'],
          { encoding: 'utf8' }).trim();
        return bits === '64' ? p : null;
      } catch (e) { return null; }
    })();
  if (!py64) {
    ok(true, 'FC-E2E SKIP：64 位解释器缺位（V312 §9⑥——SKIP 语义，不 fail）');
  } else {
    const discFmu = DISCOVERY + '.fmu';
    const childFmu = spawn(py64, [path.join(ROOT, 'tools', 'backend', 'py', 'bridge.py'),
      '--port', '0', '--discovery', discFmu], { cwd: ROOT });
    global.__childFmu = childFmu;
    let disc2 = null;
    for (let i = 0; i < 50 && !disc2; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try { disc2 = JSON.parse(fs.readFileSync(discFmu, 'utf8')); } catch (e) { /* 未就绪 */ }
    }
    ok(!!disc2, 'FC-E2E：64 位 bridge 实例就绪（discovery）');
    if (disc2) {
      const baseFmu = 'http://127.0.0.1:' + disc2.port;
      const tokFmu = { 'X-Bridge-Token': disc2.token, Origin: localOrigin };
      /* ① 能力面 */
      const cap = await get(baseFmu + '/capability', tokFmu);
      eq(cap.status, 200, 'FC-E2E: /capability 200');
      const capData = JSON.parse(cap.body);
      eq(capData.capability.model_id, 'fc.pem.fmu_l1', 'FC-E2E: capability model_id');
      eq(capData.capability.ready, true, 'FC-E2E: capability ready=true（64 位 + 产物在位）');
      eq(capData.capability.fmu_sha256, FC_FMU_PIN,
        'FC-E2E: capability fmu_sha256 = V312 钉值');
      /* 无令牌拒绝（安全边界同构） */
      const noTok2 = await get(baseFmu + '/capability', { Origin: localOrigin });
      eq(noTok2.status, 403, 'FC-E2E: /capability 无令牌 403（安全边界同构）');
      /* ② 委托实调 */
      const key = 'sensor_p_ca_closed_loop';
      const simF = await post(baseFmu + '/simulate-fc001-fmu', tokFmu, { runKey: key });
      eq(simF.status, 200, 'FC-E2E: /simulate-fc001-fmu 200');
      const simFData = JSON.parse(simF.body);
      eq(simFData.ok, true, 'FC-E2E: ok=true');
      eq(simFData.result.fmu_sha256, FC_FMU_PIN,
        'FC-E2E: 结果携带 V312 钉 hash');
      /* ③ 桥服务 C Run ≡ golden 全等（21 列逐位——R-G9-02 HTTP 面复证） */
      const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'golden', 'fc001_fmu_v1.json'), 'utf8'));
      const gRun = golden.runs[key];
      const cSeries = simFData.result.run.series;
      let allEq = true;
      let badSig = '';
      for (const sid of Object.keys(gRun.series)) {
        if (JSON.stringify(gRun.series[sid]) !== JSON.stringify(cSeries[sid])) {
          allEq = false; badSig = sid; break;
        }
      }
      ok(allEq, 'FC-E2E: 桥服务 C Run 序列 ≡ fc001_fmu_v1 golden（21 列逐位全等）', allEq ? '' : '首差异列 ' + badSig);
      /* ④ adapter 注入式实跑（probeBridge/bridgeRun） */
      const plants = FL.core.plants;
      const adapter = plants.createFc001FmuAdapter({ bridge: { url: baseFmu, token: disc2.token } });
      /* 浏览器 fetch 契约形状适配（ok/status/json——GET/POST 双路由，bridgeRun 需 POST） */
      const fetchImpl = function (url, opts) {
        opts = opts || {};
        const h = Object.assign({}, opts.headers || {});
        const p = (opts.method === 'POST')
          ? post(url, h, opts.body ? JSON.parse(opts.body) : {})
          : get(url, h);
        return p.then(function (res) {
          return { ok: res.status >= 200 && res.status < 300, status: res.status,
            json: function () { return Promise.resolve(JSON.parse(res.body)); } };
        });
      };
      const probed = await adapter.probeBridge(fetchImpl);
      ok(probed === true && adapter.mode === 'bridge', 'FC-E2E: adapter probeBridge = bridge 模式');
      const runViaAdapter = await adapter.bridgeRun(fetchImpl, key);
      eq(JSON.stringify(runViaAdapter.run.series.t), JSON.stringify(gRun.series.t),
        'FC-E2E: adapter bridgeRun 序列 = golden（t 列锚）');
      eq(runViaAdapter.fmu_sha256, FC_FMU_PIN,
        'FC-E2E: adapter bridgeRun 携带 V312 钉 hash');
    }
    childFmu.kill();
    try { fs.unlinkSync(discFmu); } catch (e) { /* ignore */ }
  }

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
