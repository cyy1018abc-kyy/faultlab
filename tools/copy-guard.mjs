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

/* §6.3 禁止词（正则）。
   v1.1.0 MG 落地轮增词评估（MG001_G2B_SPEC_APPROVED v1.0 §0/§6.3 I-5 红线；
   全文登记 = evidence/g2/deviations.md D-27）：识别出六词确有过度声明风险——
   ①孤岛检测（检测类措辞邻接——教学点只能表述为「脱离主馈线的功率平衡重整演示」）、
   ②孤岛保护（保护类声明）、③防孤岛（同②）、④检同期（重连/并网保护控制语义）、
   ⑤并离网切换验证（验证类动词 + 切换功能双重声明）、⑥微电网稳定验证（验证类语义）。
   **已落地（W8 词表收口，CHG-20261110-01 波，2026-11-11）**：W7 曾暂缓入表（tests/teaching.test.js
   §D 以 BANNED.length === 33 硬编码镜像本数组，tests 面同步留待交接）——本波六词入表
   33→39 并与 §D 镜像同步（39）；src/** 否定式/limitations 命中 5 处经 ALLOW 增量 3 串放行
   （逐条登记 = evidence/g2/deviations.md D-28，粒度沿 D-10）。I-5 词面守卫双层：
   tools/ui-walkthrough.mjs REDLINE_TERMS（渲染面肯定性语义扫描，11 词根，B-1 口径）
   + 本表 39 模式（UI 源面零命中复核）。词表单调不减纪律维持：39 模式为基线，
   未来增词 = additive（V110_WAVE_DESIGN DEC-8③）。 */
const BANNED = [
  '验证通过', '已通过验证', '物理守恒验证通过', '模型验证通过',
  '实测', '工业真实', '工业级', '已验证', '已证明',
  '能量损失', '损失 4 kW', '损失 0\\.044', '多发\\s*4\\s*kW', '多发电',
  '诊断算法', '检出率', '误报率', '诊断延迟', '置信度',
  '第三方认证', '公证', '(?i)sealed', '防篡改', '逐位一致',
  '机组动态验证', '电网稳定验证', '一次调频验证', '惯量验证',
  '校准', '与真实设备一致', '可外推到真实设备', 'Simulink 仿真结果', 'FMU 结果',
  /* —— MG 落地轮六词（D-27 评估识别 → W8 收口落地，deviations.md D-28）—— */
  '孤岛检测', /* D-27①：检测类措辞邻接——教学点只可表述为「脱离主馈线的功率平衡重整演示」 */
  '孤岛保护', /* D-27②：保护类声明——未建模面只能以否定式/limitations 语境出现（放行见 ALLOW D-28②③） */
  '防孤岛', /* D-27③：同②保护类声明（放行见 ALLOW D-28③） */
  '检同期', /* D-27④：重连/并网保护控制语义（放行见 ALLOW D-28①③） */
  '并离网切换验证', /* D-27⑤：验证类动词 + 切换功能双重声明 */
  '微电网稳定验证' /* D-27⑥：验证类语义 */
].map((p) => (/^\(\?i\)/.test(p) ? new RegExp(p.slice(4), 'i') : new RegExp(p)));

/* §6.3 批准的否定/限定串（先剔除再匹配） */
const ALLOW = [
  '非机组/电网动态验证',
  'L0 · 解析行为级演示（非实测 / 非 Simulink / 未做硬件验证）',
  '非实测', '未与实测校准', '无实测对比', '解析金标准数值（未与实测校准）',
  '不是能量损失', '本演示无诊断算法',
  '不代表数字签名、来源证明或第三方认证', '不代表签名/来源/第三方认证',
  /* 扩充（deviations.md D-10）：§3.1 锁定横幅自身含"无检出率与延迟指标" */
  '本页不做检测/定位/诊断，无检出率与延迟指标',
  /* 扩充（deviations.md D-28，W8 六词入表联带）：src/** 否定式/limitations 语境放行 5 处，
     src/** 属本波禁触面 → 文案改写路径不可用，按否定式增量纪律放行（逐条登记 D-28）。 */
  '无检同期', /* systems.js:1456/1587/2986——「无+X」否定短语（粒度沿「非实测」先例） */
  '孤岛保护、低电压穿越、频率/电压穿越、防雷接地等并网保护面', /* systems.js:1086 PV-001 limitations 未建模面枚举（结构否定语境，精确串限定） */
  '孤岛保护与重整控制逻辑未建模：检同期、防孤岛' /* systems.js:1593 MG-001 limitations「均未建模」否定锚定串（单连续串防重叠剥离） */
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
