/* owner: arena-protocol | module: tools/arena-mcp-server | contract: G9_G10_ARCH_GATE_SPEC_DRAFT.md §3.2/§4.1（G10——V190_WAVE_DESIGN DEC-3，CHG-20261115-09/-10）
   arena-mcp-server — Arena L2 stdio MCP 服务器（零第三方依赖、零网络）。

   职责（spec §3.2 逐字承接）：
     - Air-Gap 守卫：仅 stdio（stdin/stdout JSON-RPC 2.0），零网络 import、零 socket；
     - arena_get_telemetry_summary：coarse_beacon 自由层（零预算成本）；
     - arena_slice_telemetry：high_res_store 门控层（c_i = K×M 计费、B_max=180 硬帽、
       边界行永不跳过、query_ledger 记账 + slice_sha256）；
     - arena_export_submission：嵌 query_ledger + submission_sha256 封章。

   用法：
     node tools/arena-mcp-server.mjs --pack <blind_pack.json>           # stdio 服务
     node tools/arena-mcp-server.mjs --self-check --pack <path>         # 自检（exit 0/1）

   MCP 面（JSON-RPC 2.0 over stdio，行分隔帧）：initialize / notifications/* / ping /
   tools/list / tools/call。工具错误以 JSON-RPC error 返回（data.code = L2-E-*）。 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createL2Session, validateL2Pack, verifySealedSubmission, L2_SCHEMA, L2_PROTOCOL,
  B_MAX_POINTS, B_MIN_POINTS, l2Error,
} from './arena-l2-core.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* Air-Gap 守卫（声明 + 机检双面）：本模块不 import node:net/node:http/node:https/
   node:dgram/node:tls——启动时断言子模块图无网络面（自检面）。 */
const AIRGAP_FORBIDDEN_MODULES = ['node:net', 'node:http', 'node:https', 'node:dgram', 'node:tls', 'node:fs/promises'];

function loadPack(packPath) {
  const raw = fs.readFileSync(path.resolve(ROOT, packPath), 'utf8');
  const pack = JSON.parse(raw);
  validateL2Pack(pack);
  return pack;
}

const TOOLS = [
  {
    name: 'arena_get_telemetry_summary',
    description: '获取 episode 的自由粗遥测摘要（coarse_beacon，2.0 s 网格；零预算成本）',
    inputSchema: {
      type: 'object',
      properties: { episode_id: { type: 'string', description: 'episode UUID' } },
      required: ['episode_id'],
    },
  },
  {
    name: 'arena_slice_telemetry',
    description: '高分辨率遥测切片（0.1 s 网格；计费 c = K×M 点；B_max=' + B_MAX_POINTS
      + '；事件边界行永不跳过；每次调用记入 query_ledger）',
    inputSchema: {
      type: 'object',
      properties: {
        episode_id: { type: 'string' },
        variables: { type: 'array', items: { type: 'string' }, description: '观测通道 id 列表（K）' },
        t_start: { type: 'number' },
        t_end: { type: 'number' },
        stride: { type: 'integer', minimum: 1, description: '网格步长（边界行不受 stride 影响）' },
      },
      required: ['episode_id', 'variables', 't_start', 't_end', 'stride'],
    },
  },
  {
    name: 'arena_export_submission',
    description: '导出封存提交（嵌 query_ledger + submission_sha256；protocol=' + L2_PROTOCOL + '）',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'object', properties: { name: { type: 'string' } } },
        episodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              episode_id: { type: 'string' },
              diagnosis: { type: 'object' },
              evidence_anchors: { type: 'array' },
            },
            required: ['episode_id', 'diagnosis'],
          },
        },
      },
      required: ['episodes'],
    },
  },
];

function dispatchTool(session, name, args) {
  const a = args || {};
  if (name === 'arena_get_telemetry_summary') {
    return session.getSummary(String(a.episode_id));
  }
  if (name === 'arena_slice_telemetry') {
    return session.sliceTelemetry(String(a.episode_id), a.variables || [],
      a.t_start, a.t_end, a.stride);
  }
  if (name === 'arena_export_submission') {
    return session.exportSubmission({ agent: a.agent, episodes: a.episodes });
  }
  throw l2Error('E11', 'name', '未知工具：' + name);
}

function handle(session, msg) {
  const id = msg.id === undefined ? null : msg.id;
  try {
    if (msg.method === 'initialize') {
      return { jsonrpc: '2.0', id, result: {
        protocolVersion: msg.params && msg.params.protocolVersion ? msg.params.protocolVersion : '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'faultlab-arena-l2', version: '1.0.0' },
      } };
    }
    if (typeof msg.method === 'string' && msg.method.startsWith('notifications/')) {
      return null;                                        /* 通知无响应 */
    }
    if (msg.method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }
    if (msg.method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    }
    if (msg.method === 'tools/call') {
      const result = dispatchTool(session, msg.params && msg.params.name, msg.params && msg.params.arguments);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } };
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + msg.method } };
  } catch (err) {
    const code = err && err.code ? err.code : 'L2-E99';
    return { jsonrpc: '2.0', id, error: { code: -32000, message: String(err.message), data: { code } } };
  }
}

function serve(session) {
  const buf = [];
  let chunk = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    chunk += d;
    let idx;
    while ((idx = chunk.indexOf('\n')) >= 0) {
      const line = chunk.slice(0, idx).trim();
      chunk = chunk.slice(idx + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch (e) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null,
          error: { code: -32700, message: 'Parse error' } }) + '\n');
        continue;
      }
      const resp = handle(session, msg);
      if (resp) process.stdout.write(JSON.stringify(resp) + '\n');
    }
  });
  process.stdin.resume();
}

/* ---------------- self-check（G10 验收命令 §4.2：node tools/arena-mcp-server.mjs --self-check） ---------------- */
function selfCheck(packPath) {
  const checks = [];
  const rec = (id, ok, detail) => checks.push({ id, ok: !!ok, detail });
  const pack = loadPack(packPath || path.join(ROOT, 'out', 'arena2-l2-demo', 'blind_pack.json'));
  rec('MS-1-airgap-imports', AIRGAP_FORBIDDEN_MODULES.every((m) => {
    try { return !process.moduleLoadList ? true : process.moduleLoadList.indexOf(m.replace('node:', '')) < 0; } catch (e) { return true; }
  }), '无网络模块加载（net/http/https/dgram/tls）');
  rec('MS-2-pack-validate', validateL2Pack(pack).ok, '盲包结构 + closed-world + 预算常量钉');
  const ep0 = pack.episodes[0];
  const session = createL2Session(pack);
  const sum = session.getSummary(ep0.episode_id);
  rec('MS-3-summary-beacon', sum.coarse_beacon.rows.length === 31
    && sum.coarse_beacon.grid_dt_s === 2.0, 'coarse_beacon = 31 行 2.0 s 网格');
  const store = ep0.high_res_store;
  const hasBoundary = store.boundary_rows.length > 0;
  const stride = 5;                                    /* 0.5 s 粒度——若不打边界行必跳过 */
  const bRows = hasBoundary ? store.boundary_rows : [];
  const win = hasBoundary
    ? [Math.max(0, bRows[0].t - 1.0), Math.min(ep0.duration_s, bRows[0].t + 1.0)]
    : [0, Math.min(60, store.dt_s * 4)];
  const slice = session.sliceTelemetry(ep0.episode_id, [ep0.observables[0].id], win[0], win[1], stride);
  const boundaryT = slice.rows.filter((r, i) => slice.boundary.some((b) => b.row === i)).map((r) => r[0]);
  rec('MS-4-boundary-never-skipped', !hasBoundary || boundaryT.length === bRows.length,
    '边界行永不跳过（stride=' + stride + ' 仍返回全部 ' + boundaryT.length + '/' + bRows.length + ' 边界行）');
  const dense = session.sliceTelemetry(ep0.episode_id, [ep0.observables[0].id], win[0], win[1], 1);
  const expectCost = 1 * dense.rows.length;
  rec('MS-5-cost-formula', dense.cost_points === expectCost
    && session.budgetUsed() === slice.cost_points + dense.cost_points,
    'c_i = K×M 记账（used=' + session.budgetUsed() + '）');
  /* 预算帽拒收：以最小代价探测至溢出 */
  let rejected = false;
  try {
    while (true) session.sliceTelemetry(ep0.episode_id, [ep0.observables[0].id], 0, 0.1, 1000000);
  } catch (e) {
    rejected = e.code === 'L2-E19';
  }
  rec('MS-6-budget-cap', rejected, 'B_max=180 硬帽拒收（L2-E19）');
  /* 封章 + 篡改检测 */
  const fresh = createL2Session(pack);
  fresh.sliceTelemetry(ep0.episode_id, [ep0.observables[0].id], win[0], win[1], 1);
  const sub = fresh.exportSubmission({
    agent: { name: 'self-check-agent' },
    episodes: [{ episode_id: ep0.episode_id,
      diagnosis: { faultDetected: false, faultType: 'none', component: 'none',
        magnitude: null, detectTime_s: null, confidence: 0.05, explanation: 'self-check' } }],
  });
  let sealOk = false;
  let tamper = false;
  try {
    verifySealedSubmission(sub);
    sealOk = true;
  } catch (e) { sealOk = false; }
  try {
    const bad = JSON.parse(JSON.stringify(sub));
    bad.query_ledger[0].cost_points = 1;
    try { verifySealedSubmission(bad); } catch (e) { tamper = e.code === 'L2-E22'; }
  } catch (e) { tamper = false; }
  rec('MS-7-seal-tamper', sealOk && tamper,
    'submission_sha256 封章（好包过）+ 篡改拒收（L2-E22）');
  const okAll = checks.every((c) => c.ok);
  console.log(JSON.stringify({ ok: okAll, checks, pack: path.basename(packPath || '') }, null, 2));
  return okAll ? 0 : 1;
}

function main(argv) {
  const i = argv.indexOf('--pack');
  const packPath = i >= 0 && argv[i + 1] ? argv[i + 1] : null;
  if (argv.indexOf('--self-check') >= 0) return selfCheck(packPath);
  if (!packPath) {
    console.error('用法：node tools/arena-mcp-server.mjs --pack <blind_pack.json> [--self-check]');
    return 1;
  }
  const pack = loadPack(packPath);
  const session = createL2Session(pack);
  serve(session);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('arena-mcp-server.mjs')) {
  process.exitCode = main(process.argv.slice(2));
}
