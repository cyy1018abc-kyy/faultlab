/**
 * copy-guard.mjs — 禁止词扫描（UI_COPY_GUARDRAILS §6.3 / §8.2，G0-DEC-13）。
 *
 *   node tools/copy-guard.mjs        # 扫描 src/**，命中即 exit 1
 *
 * 规则：先剔除「批准的否定/限定串」（allow 列表），再匹配禁止词；
 * docs/** 与 FaultLab-evaluation/** 是证据引用，不扫描。
 * 允许列表的每次扩充须在 evidence deviations.md 记录理由。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCOPES = ['src'];

/* §6.3 禁止词（正则） */
const BANNED = [
  '验证通过', '已通过验证', '物理守恒验证通过', '模型验证通过',
  '实测', '工业真实', '工业级', '已验证', '已证明',
  '能量损失', '损失 4 kW', '损失 0\\.044', '多发\\s*4\\s*kW', '多发电',
  '诊断算法', '检出率', '误报率', '诊断延迟', '置信度',
  '第三方认证', '公证', '(?i)sealed', '防篡改', '逐位一致',
  '校准', '与真实设备一致', '可外推到真实设备', 'Simulink 仿真结果', 'FMU 结果'
].map((p) => (/^\(\?i\)/.test(p) ? new RegExp(p.slice(4), 'i') : new RegExp(p)));

/* §6.3 批准的否定/限定串（先剔除再匹配） */
const ALLOW = [
  'L0 · 解析行为级演示（非实测 / 非 Simulink / 未做硬件验证）',
  '非实测', '未与实测校准', '无实测对比', '解析金标准数值（未与实测校准）',
  '不是能量损失', '本演示无诊断算法',
  '不代表数字签名、来源证明或第三方认证', '不代表签名/来源/第三方认证',
  /* 扩充（deviations.md D-10）：§3.1 锁定横幅自身含"无检出率与延迟指标" */
  '本页不做检测/定位/诊断，无检出率与延迟指标'
];

const hits = [];
function scanFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    let check = line;
    /* D-11：truthSealed/sealed 等为 DECISIONS G0-DEC-11 命名的代码标识符与状态键，
       不是用户可见表述；剥离含 sealed 的标识符 token 后，仅散文中的 sealed 仍会命中。 */
    check = check.replace(/[A-Za-z0-9_$.]*[Ss]ealed[A-Za-z0-9_$.]*/g, '');
    for (const a of ALLOW) check = check.split(a).join('');
    for (const re of BANNED) {
      if (re.test(check)) {
        hits.push({ file: path.relative(ROOT, file), line: i + 1, pattern: String(re), text: line.trim().slice(0, 160) });
      }
    }
  });
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(js|mjs|html|css|json)$/.test(name)) scanFile(full);
  }
}

for (const scope of SCOPES) walk(path.join(ROOT, scope));

if (hits.length) {
  console.error('FAIL: 产品源码命中禁止词 ' + hits.length + ' 处');
  hits.slice(0, 40).forEach((h) => {
    console.error('  ' + h.file + ':' + h.line + ' [' + h.pattern + '] ' + h.text);
  });
  process.exit(1);
}
console.log('PASS: no banned copy in ' + SCOPES.join('/') + '/** (' + BANNED.length + ' patterns)');
