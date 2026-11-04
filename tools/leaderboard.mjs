/* owner: eval-track | module: tools/leaderboard | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md §7 C-4 行
           + FaultLab-evaluation/NEXT/V070_WAVE_DESIGN.md DEC-6（CHG-20261104-10）
   leaderboard — 本地排行榜 CLI（C-4 最小形态，DEC-6）。聚合归档场次目录中的 score-report-*.json，
   按参与者/Agent id 聚合（场次数、轮次数、avg_score 均值、单轮最佳/最差），排序后输出
   leaderboard.json + leaderboard.md。纯本地文件（I-1）、零第三方依赖；本阶段只做 CLI 与聚合，
   只读 UI 视图归后续接线轮（V070_WAVE_DESIGN 阶段二）。

   单源纪律：只聚合已落章成绩单，**不复算评分**——评分单源在 src/core/arena-protocol.js
   scoreV2（经 tools/arena2-verify.mjs 落章），第三方复核走 EVAL_TRACK_GUIDE §6.4 verify 命令。

   用法：
     node tools/leaderboard.mjs                       # 缺省扫 FaultLab-evaluation/NEXT/evidence 下 eval-session-* 目录（递归）
     node tools/leaderboard.mjs --sessions dir1,dir2  # 显式场次目录列表（一目录 = 一场次；session-XX 多场目录请逐个显式传入）
     node tools/leaderboard.mjs --glob '<pattern>'    # 相对仓库根的 glob（* / ? 段内通配，** 跨段且含零段）
     node tools/leaderboard.mjs --out <dir>           # 输出目录（缺省 out/）

   成绩单字段事实源：tools/arena2-verify.mjs → src/core/arena-protocol.js scoreV2
   （schema="faultlab.arena.score.v2"、rounds[].round_score 十进制串、avg_score 数值、score_hash）。

   参与者 id 解析（依序，成绩单本体不含参与者字段——id 在配对提交，arena2-session.mjs:95-97）：
     ① 成绩单内嵌 agent.name / agent.id / participant / participant_id（向前兼容）；
     ② 同目录配对提交 submission-<同名后缀>.json 或 submission-<后缀>-*.json
       （EVAL_TRACK_GUIDE §6.6 同名对应；eval-session-001 为序号前缀式）取 agent.name；
     ③ 均不可得 → 该文件按 missing_participant 跳过并计数；配对候选 agent 名不一致 →
       ambiguous_participant 跳过（不猜）。

   聚合口径：坏 JSON / 缺字段（schema 不符、rounds 缺失、round_score/avg_score 不可解析）/
   参与者不可解析的文件逐个跳过并按原因计数登记；同一参与者多场次取 avg_score 均值；
   排序 avg_score 降序 → 并列按场次数（多者优先）→ 参与者 id 字典序（确定性）。
   退出码：0 = 产出排行表；1 = 无任何有效输入（含场次目录不存在/为空、全部文件被跳过，均带说明）。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_EVIDENCE = 'FaultLab-evaluation/NEXT/evidence';
const SESSION_DIR_RE = /^eval-session-/;
const REPORT_RE = /^score-report-.+\.json$/;
const WALK_SKIP_DIRS = new Set(['node_modules', '.git', 'slprj', '__pycache__']);

export const SCHEMA_SCORE = 'faultlab.arena.score.v2';
export const SCHEMA_LEADERBOARD = 'faultlab.leaderboard.v1';
/* 固定措辞（任务/DEC-6 指定；与成绩单 notice「合成故障评测游戏，非真实诊断性能」同族，I-5 辖区） */
export const NOTICE = '合成场景评测游戏，非真实诊断性能';
export const SKIP_REASONS = ['bad_json', 'missing_field', 'missing_participant', 'ambiguous_participant'];

/* ---- 工具（round 与 src/core/arena-protocol.js:31 同实现，保证舍入口径一致） ---- */
function isNum(v) { return typeof v === 'number' && isFinite(v); }
function round(v, d) {
  if (!isNum(v)) return v;
  var p = Math.pow(10, d == null ? 2 : d);
  return Math.round(v * p) / p;
}
function isPlainObj(v) { return !!v && typeof v === 'object' && !isNum(v) && !Array.isArray(v); }
/* 数值或十进制串（round_score 为 "84.9" 形态）→ 数值；不可解析 → null */
function toScoreNum(v) {
  if (isNum(v)) return v;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  return null;
}
function relPosix(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }
function mdCell(s) { return String(s).replace(/\r*\n/g, ' ').replace(/\|/g, '\\|'); }

/* ---- glob（零依赖最小实现：* / ? 段内，** 跨段且含零段） ---- */
export function globToRegExp(pattern) {
  const segs = String(pattern).split('/');
  let re = '';
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg === '**') { re += (i === segs.length - 1) ? '.*' : '(?:[^/]+/)*'; continue; }
    let s = '';
    for (const ch of seg) {
      if (ch === '*') s += '[^/]*';
      else if (ch === '?') s += '[^/]';
      else s += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    re += s;
    if (i < segs.length - 1) re += '/';
  }
  return new RegExp('^' + re + '$');
}

/* ---- 场次目录发现：返回 {mode, sessions:[绝对路径]}；无输入抛 Error(no_input) ---- */
function walkSessionDirs(base, out) {
  let names;
  try { names = fs.readdirSync(base, { withFileTypes: true }); } catch (e) { return; }
  names.forEach((ent) => {
    if (!ent.isDirectory() || ent.name.startsWith('.') || WALK_SKIP_DIRS.has(ent.name)) return;
    const full = path.join(base, ent.name);
    if (SESSION_DIR_RE.test(ent.name)) out.push(full); /* 命中即收，不再下钻 */
    else walkSessionDirs(full, out);
  });
}

export function discoverSessions(opts) {
  if (opts.sessions) {
    const list = opts.sessions.split(',').map((s) => s.trim()).filter(Boolean);
    if (!list.length) throw noInput('--sessions 为空（用法：--sessions dir1,dir2）');
    const seen = new Map();
    for (const raw of list) {
      const p = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
      let st;
      try { st = fs.statSync(p); } catch (e) {
        throw noInput('场次目录不存在：' + raw + '（解析为 ' + p + '）');
      }
      if (!st.isDirectory()) throw noInput('场次路径不是目录：' + raw);
      seen.set(path.resolve(p), p);
    }
    return { mode: 'sessions', sessions: Array.from(seen.keys()) };
  }
  if (opts.glob) {
    const re = globToRegExp(opts.glob);
    const out = [];
    (function walk(base) {
      let names;
      try { names = fs.readdirSync(base, { withFileTypes: true }); } catch (e) { return; }
      names.forEach((ent) => {
        if (!ent.isDirectory() || ent.name.startsWith('.') || WALK_SKIP_DIRS.has(ent.name)) return;
        const full = path.join(base, ent.name);
        if (re.test(relPosix(full))) out.push(full);
        walk(full);
      });
    })(ROOT);
    out.sort();
    if (!out.length) throw noInput('--glob「' + opts.glob + '」未匹配到任何目录（相对仓库根，* 段内、** 跨段）');
    return { mode: 'glob', sessions: out };
  }
  const base = path.resolve(ROOT, DEFAULT_EVIDENCE);
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
    throw noInput('缺省证据目录不存在：' + relPosix(base));
  }
  const out = [];
  walkSessionDirs(base, out);
  out.sort();
  if (!out.length) {
    throw noInput('缺省扫描（' + DEFAULT_EVIDENCE + ' 下 eval-session-* 目录）未发现任何场次目录；' +
      '可用 --sessions dir1,dir2 或 --glob 显式指定');
  }
  return { mode: 'default', sessions: out };
}
function noInput(msg) {
  const e = new Error(msg); e.code = 'no_input'; return e;
}

/* ---- 成绩单解析与校验（缺字段 → skip 登记；不复算评分） ---- */
export function parseScoreReport(data) {
  if (!isPlainObj(data)) return failField('顶层不是 JSON 对象');
  if (data.schema !== SCHEMA_SCORE) {
    return failField('schema 缺失或非 ' + SCHEMA_SCORE + '（实际读到 ' + JSON.stringify(data.schema) + '）');
  }
  if (!Array.isArray(data.rounds) || !data.rounds.length) return failField('rounds 缺失/非数组/为空');
  const rounds = [];
  for (let i = 0; i < data.rounds.length; i++) {
    const r = data.rounds[i];
    if (!isPlainObj(r)) return failField('rounds[' + i + '] 不是对象');
    const score = toScoreNum(r.round_score);
    if (score === null) return failField('rounds[' + i + '].round_score 缺失或不可解析（实际读到 ' + JSON.stringify(r.round_score) + '）');
    rounds.push({ index: isNum(r.index) ? r.index : i + 1, score: score });
  }
  const avg = toScoreNum(data.avg_score);
  if (avg === null) return failField('avg_score 缺失或不可解析（实际读到 ' + JSON.stringify(data.avg_score) + '）');
  return { ok: true, rounds: rounds, avg_score: avg };
}
function failField(detail) { return { ok: false, reason: 'missing_field', detail: detail }; }

/* ---- 参与者 id 解析（①内嵌 → ②配对提交 → ③不可得） ---- */
function agentNameOf(obj) {
  if (!isPlainObj(obj)) return null;
  const cand = [];
  if (isPlainObj(obj.agent)) cand.push(obj.agent.name, obj.agent.id);
  cand.push(obj.participant, obj.participant_id);
  for (const c of cand) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export function resolveParticipant(sessionDir, file, data) {
  const embedded = agentNameOf(data);
  if (embedded) return { ok: true, id: embedded, source: 'report' };

  const suffix = file.replace(/^score-report-/, '').replace(/\.json$/, '');
  if (!suffix) return failParticipant('文件名缺参与者后缀且成绩单内无 agent 字段');
  let names;
  try { names = fs.readdirSync(sessionDir); } catch (e) {
    return failParticipant('场次目录不可读，无法配对 submission');
  }
  const candidates = names.filter((n) =>
    n === 'submission-' + suffix + '.json' ||
    (n.startsWith('submission-' + suffix + '-') && n.endsWith('.json')));
  if (!candidates.length) {
    return failParticipant('成绩单内无 agent 字段，且目录内无配对提交 submission-' + suffix + '*.json');
  }
  const ids = new Set();
  for (const c of candidates) {
    let sub = null;
    try { sub = JSON.parse(fs.readFileSync(path.join(sessionDir, c), 'utf8')); } catch (e) { sub = null; }
    const id = agentNameOf(sub);
    if (id) ids.add(id);
  }
  if (ids.size === 1) return { ok: true, id: ids.values().next().value, source: 'submission' };
  if (ids.size === 0) return failParticipant('配对提交存在（' + candidates.join(', ') + '）但均无法解析 agent 名');
  return { ok: false, reason: 'ambiguous_participant', detail: '配对提交 agent 名不一致（' + Array.from(ids).join(' / ') + '）' };
}
function failParticipant(detail) { return { ok: false, reason: 'missing_participant', detail: detail }; }

/* ---- 聚合：records → 排序后的排行条目 ---- */
export function aggregate(records) {
  const byP = new Map();
  for (const r of records) {
    if (!byP.has(r.participant)) {
      byP.set(r.participant, { participant: r.participant, sources: new Set(), perSession: new Map(), rounds: 0, best: null, worst: null });
    }
    const e = byP.get(r.participant);
    e.sources.add(r.source);
    e.rounds += r.rounds.length;
    for (const rd of r.rounds) {
      if (e.best === null || rd.score > e.best) e.best = rd.score;
      if (e.worst === null || rd.score < e.worst) e.worst = rd.score;
    }
    const key = r.sessionDir;
    if (!e.perSession.has(key)) {
      e.perSession.set(key, { session: relPosix(key), avg_score: r.avg_score, rounds: r.rounds.length,
        best_round_score: Math.max.apply(null, r.rounds.map((x) => x.score)),
        worst_round_score: Math.min.apply(null, r.rounds.map((x) => x.score)),
        score_files: [r.file] });
    } else {
      const ps = e.perSession.get(key);
      ps.score_files.push(r.file);
      /* 同场次同参与者多份成绩单：场均与轮次并档（实践中不出现，登记以保口径确定） */
      ps.avg_score = round((ps.avg_score * (ps.rounds) + r.avg_score * r.rounds.length) / (ps.rounds + r.rounds.length), 1);
      ps.rounds += r.rounds.length;
      ps.best_round_score = Math.max(ps.best_round_score, Math.max.apply(null, r.rounds.map((x) => x.score)));
      ps.worst_round_score = Math.min(ps.worst_round_score, Math.min.apply(null, r.rounds.map((x) => x.score)));
    }
  }
  const entries = Array.from(byP.values()).map((e) => {
    const psList = Array.from(e.perSession.values());
    const avgMean = round(psList.reduce((s, ps) => s + ps.avg_score, 0) / psList.length, 1);
    return {
      participant: e.participant,
      avg_score: avgMean,
      sessions: psList.length,
      rounds: e.rounds,
      best_round_score: e.best,
      worst_round_score: e.worst,
      participant_source: Array.from(e.sources).sort().join('+'),
      session_dirs: psList.map((ps) => ps.session),
      per_session: psList
    };
  });
  return sortEntries(entries);
}

/* 排序：avg_score 降序 → 并列按场次数（多者优先）→ 参与者 id 字典序（确定性收口） */
export function sortEntries(entries) {
  return entries.slice().sort((a, b) => {
    if (a.avg_score !== b.avg_score) return b.avg_score - a.avg_score;
    if (a.sessions !== b.sessions) return b.sessions - a.sessions;
    return a.participant < b.participant ? -1 : a.participant > b.participant ? 1 : 0;
  }).map((e, i) => Object.assign({ rank: i + 1 }, e));
}

/* ---- 输出装配 ---- */
function buildJson(meta, sessions, records, skipped, entries) {
  const byReason = {};
  SKIP_REASONS.forEach((r) => { byReason[r] = 0; });
  skipped.forEach((s) => { byReason[s.reason] = (byReason[s.reason] || 0) + 1; });
  return {
    schema: SCHEMA_LEADERBOARD,
    notice: NOTICE,
    generated_at: new Date().toISOString(),
    scan_mode: meta.mode,
    input_sessions: sessions.map(relPosix),
    totals: {
      sessions_scanned: sessions.length,
      reports_found: records.length + skipped.length,
      reports_valid: records.length,
      reports_skipped: skipped.length,
      participants: entries.length
    },
    skipped: {
      total: skipped.length,
      by_reason: byReason,
      files: skipped.map((s) => ({ session: relPosix(s.sessionDir), file: s.file, reason: s.reason, detail: s.detail }))
    },
    entries: entries
  };
}

const SOURCE_LABELS = { report: 'id 内嵌于成绩单', submission: 'id 取自配对提交' };

function buildMarkdown(json) {
  const L = [];
  L.push('# FaultLab 本地排行榜（C-4 · DEC-6 最小形态）');
  L.push('');
  L.push('> 生成时间：' + json.generated_at);
  L.push('> 扫描方式：' + (json.scan_mode === 'default' ? '缺省（' + DEFAULT_EVIDENCE + ' 下 eval-session-*）'
    : json.scan_mode === 'glob' ? '--glob 模式' : '--sessions 显式列表'));
  L.push('> 输入场次（' + json.input_sessions.length + ' 个）：');
  json.input_sessions.forEach((s) => L.push('> - `' + s + '`'));
  L.push('> 成绩单：共 ' + json.totals.reports_found + ' 份，有效 ' + json.totals.reports_valid
    + ' 份，跳过 ' + json.totals.reports_skipped + ' 份；参与者 ' + json.totals.participants + ' 名');
  L.push('');
  L.push('| 排名 | 参与者 | 平均分 | 场次 | 轮次 | 单轮最佳 | 单轮最差 | 备注 |');
  L.push('|---:|---|---:|---:|---:|---:|---:|---|');
  json.entries.forEach((e) => {
    L.push('| ' + e.rank + ' | ' + mdCell(e.participant) + ' | ' + e.avg_score.toFixed(1)
      + ' | ' + e.sessions + ' | ' + e.rounds
      + ' | ' + e.best_round_score.toFixed(1) + ' | ' + e.worst_round_score.toFixed(1)
      + ' | ' + (SOURCE_LABELS[e.participant_source] ? mdCell(SOURCE_LABELS[e.participant_source]) : mdCell(e.participant_source)) + ' |');
  });
  L.push('');
  L.push('## 跳过文件（' + json.skipped.total + ' 份）');
  if (json.skipped.total) {
    json.skipped.files.forEach((f) => {
      L.push('- `' + f.session + '/' + f.file + '` — ' + f.reason + '（' + mdCell(f.detail) + '）');
    });
  } else {
    L.push('无');
  }
  L.push('');
  L.push('---');
  L.push(NOTICE);
  L.push('');
  return L.join('\n');
}

/* ---- CLI ---- */
function opt(args, name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}

export function runCli(argv) {
  try {
    if (argv.indexOf('--help') >= 0 || argv.indexOf('-h') >= 0) {
      printUsage();
      return 0;
    }
    const opts = {
      sessions: opt(argv, 'sessions', null),
      glob: opt(argv, 'glob', null),
      out: opt(argv, 'out', 'out')
    };
    if (opts.sessions && opts.glob) {
      console.error('[FAIL] --sessions 与 --glob 互斥，请二选一（缺省则扫 ' + DEFAULT_EVIDENCE + ' 下 eval-session-*）');
      return 1;
    }
    const { mode, sessions } = discoverSessions(opts);

    const records = [];
    const skipped = [];
    for (const dir of sessions) {
      let files = [];
      try {
        files = fs.readdirSync(dir).filter((n) => REPORT_RE.test(n)).sort()
          .filter((n) => fs.statSync(path.join(dir, n)).isFile());
      } catch (e) {
        skipped.push({ sessionDir: dir, file: '(目录不可读)', reason: 'missing_field', detail: e.message });
        continue;
      }
      for (const file of files) {
        let data = null;
        try { data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch (e) {
          skipped.push({ sessionDir: dir, file: file, reason: 'bad_json', detail: 'JSON 解析失败：' + e.message });
          continue;
        }
        const parsed = parseScoreReport(data);
        if (!parsed.ok) {
          skipped.push({ sessionDir: dir, file: file, reason: parsed.reason, detail: parsed.detail });
          continue;
        }
        const who = resolveParticipant(dir, file, data);
        if (!who.ok) {
          skipped.push({ sessionDir: dir, file: file, reason: who.reason, detail: who.detail });
          continue;
        }
        records.push({ sessionDir: dir, file: file, participant: who.id, source: who.source,
          rounds: parsed.rounds, avg_score: parsed.avg_score });
      }
    }

    if (!records.length) {
      console.error('[FAIL] 无任何有效成绩单输入：场次 ' + sessions.length + ' 个，成绩单 '
        + skipped.length + ' 份全部被跳过（明细见下），无法生成排行榜');
      skipped.forEach((s) => {
        console.error('  [skip] ' + relPosix(s.sessionDir) + '/' + s.file + ' — ' + s.reason + '（' + s.detail + '）');
      });
      return 1;
    }

    const entries = aggregate(records);
    const json = buildJson({ mode: mode }, sessions, records, skipped, entries);
    const md = buildMarkdown(json);

    const outDir = path.isAbsolute(opts.out) ? opts.out : path.resolve(ROOT, opts.out);
    fs.mkdirSync(outDir, { recursive: true });
    const jsonPath = path.join(outDir, 'leaderboard.json');
    const mdPath = path.join(outDir, 'leaderboard.md');
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
    fs.writeFileSync(mdPath, md);

    console.log('[OK] 排行榜生成：场次 ' + json.totals.sessions_scanned + ' · 成绩单 ' + json.totals.reports_found
      + '（有效 ' + json.totals.reports_valid + '，跳过 ' + json.totals.reports_skipped + '）· 参与者 ' + json.totals.participants);
    entries.forEach((e) => {
      console.log('  ' + e.rank + '. ' + e.participant + ' — 场均 ' + e.avg_score.toFixed(1) + '（'
        + e.sessions + ' 场 / ' + e.rounds + ' 轮，单轮 ' + e.worst_round_score.toFixed(1) + '…' + e.best_round_score.toFixed(1) + '）');
    });
    if (skipped.length) {
      skipped.forEach((s) => {
        console.log('  [skip] ' + relPosix(s.sessionDir) + '/' + s.file + ' — ' + s.reason + '（' + s.detail + '）');
      });
    }
    console.log('  排行表 → ' + relPosix(jsonPath));
    console.log('  排行页 → ' + relPosix(mdPath));
    console.log('  ' + NOTICE);
    return 0;
  } catch (e) {
    if (e && e.code === 'no_input') {
      console.error('[FAIL] 无任何输入：' + e.message);
      return 1;
    }
    console.error('[FAIL] ' + (e && e.message ? e.message : String(e)));
    return 1;
  }
}

function printUsage() {
  console.log([
    'leaderboard — 本地排行榜 CLI（C-4 · DEC-6 最小形态）',
    '',
    '用法：',
    '  node tools/leaderboard.mjs                       # 缺省扫 ' + DEFAULT_EVIDENCE + ' 下 eval-session-*',
    '  node tools/leaderboard.mjs --sessions dir1,dir2  # 显式场次目录列表（一目录 = 一场次）',
    '  node tools/leaderboard.mjs --glob \'<pattern>\'    # 相对仓库根 glob（* 段内，** 跨段含零段）',
    '  node tools/leaderboard.mjs --out <dir>           # 输出目录（缺省 out/）',
    '',
    '聚合：score-report-*.json 按参与者 id 聚合（场次数/轮次数/avg_score 均值/单轮最佳最差），',
    '      排序 avg_score 降序，并列按场次数；坏文件逐个跳过并计数登记。',
    NOTICE
  ].join('\n'));
}

/* 直接运行时执行（被测试 import 时不触发 main） */
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) process.exit(runCli(process.argv.slice(2)));
