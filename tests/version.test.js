/* owner: core-engine | module: tests/version | contract: NEXT/V1170_WAVE_DESIGN.md DEC-3（CHG-20261126-02）
   应用版本单一来源一致性：src/core/version.js 为唯一定义点；README 标题 / index.html meta 为静态文本，
   须与之逐字一致；界面（shell.js）不得写死版本字面；APP_VERSION 不进入任何哈希输入。
   运行：node tests/version.test.js；失败非零退出。 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
}

/* 1. 单一定义点：在独立沙箱求值 version.js */
globalThis.window = {};
(0, eval)(read('src/core/version.js'));
const V = globalThis.window.FL && globalThis.window.FL.APP_VERSION;
const D = globalThis.window.FL && globalThis.window.FL.APP_RELEASE_DATE;
ok(/^\d+\.\d+\.\d+$/.test(V || ''), 'APP_VERSION 为 x.y.z 语义版本', String(V));
ok(/^\d{4}-\d{2}-\d{2}$/.test(D || ''), 'APP_RELEASE_DATE 为 YYYY-MM-DD', String(D));

/* 2. 静态文本与单一来源一致 */
const readme = read('README.md');
const readmeTitle = readme.split('\n')[0];
ok(readmeTitle === '# FaultLab — Virtual Energy Lab · v' + V, 'README 标题版本 = v' + V, readmeTitle);
ok(readme.indexOf('当前版本 v' + V + '（' + D) !== -1, 'README 当前版本段 = v' + V + '（' + D + '…）');
const index = read('index.html');
const meta = (index.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
ok(meta.indexOf('FaultLab V' + V + ' — ') === 0, 'index.html meta description 版本 = V' + V, meta.slice(0, 40));
const iVer = index.indexOf('src/core/version.js');
const iShell = index.indexOf('src/ui/shell.js');
ok(iVer !== -1 && iShell !== -1 && iVer < iShell, 'index.html 先载 version.js 后载 shell.js');

/* 3. 界面不写死版本字面 */
const shell = read('src/ui/shell.js');
const hard = shell.match(/V\d+\.\d+\.\d+/g) || [];
ok(hard.length === 0, 'shell.js 无写死版本字面（V x.y.z）', JSON.stringify(hard));
ok(shell.indexOf('FL.APP_VERSION') !== -1 && shell.indexOf('FL.APP_RELEASE_DATE') !== -1, 'shell.js 读取 FL.APP_VERSION / FL.APP_RELEASE_DATE');

/* 4. 不进入任何哈希输入：核心计算模块不引用 APP_VERSION */
['src/core/engine.js', 'src/core/registry.js', 'src/core/hash.js', 'src/core/scenario.js', 'src/core/bundle.js',
  'src/core/schema.js', 'src/core/systems.js'].forEach((rel) => {
  ok(read(rel).indexOf('APP_VERSION') === -1, rel + ' 不引用 APP_VERSION（版本号与 run_hash/engine_version 分离）');
});

/* 5. 单文件构建产物（若存在）与单一来源一致 */
const bundlePath = path.join(ROOT, 'FaultLab.html');
if (fs.existsSync(bundlePath)) {
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  ok(bundle.indexOf("FL.APP_VERSION = '" + V + "'") !== -1, 'FaultLab.html 内联 version.js 与单一来源一致（须 python tools/build.py 重建）');
}

console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '' : '  ✓'));
if (fail) {
  console.log('FAILURES:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('版本单一来源一致性通过：APP_VERSION=' + V + '（' + D + '）——README / index.html / 界面 / 构建产物一致，且不进入任何哈希输入。');
