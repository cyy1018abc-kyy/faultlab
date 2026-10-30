/* owner: core-engine | module: tests/core-load | contract: docs/CONTRACT.md */
/* Node 加载器：建立 globalThis.window = globalThis，按依赖顺序 eval src/core 下经典脚本
   （含 I-11 plant 适配器 src/core/plants/*），使 window.FL 在 Node 中可用
   （浏览器/protocol.js 不参与，核心层不硬依赖 FL.protocol）。 */
'use strict';

const fs = require('fs');
const path = require('path');

const CORE_DIR = path.join(__dirname, '..', 'src', 'core');
const CORE_FILES = ['hash.js', 'rng.js', 'schema.js', 'scope.js', 'systems.js', 'plants/fl001.js', 'plants/fc001.js', 'engine.js', 'metrics.js', 'checks.js', 'registry.js', 'bundle.js', 'arena-protocol.js'];

function bootstrap() {
  globalThis.window = globalThis;
  for (const file of CORE_FILES) {
    const full = path.join(CORE_DIR, file);
    const code = fs.readFileSync(full, 'utf8');
    /* 间接 eval：在全局作用域执行，IIFE 挂载到 window.FL */
    (0, eval)(code);
  }
  const FL = globalThis.window && globalThis.window.FL;
  if (!FL || !FL.core || !FL.systems) {
    throw new Error('bootstrap 失败：window.FL 未就绪（检查 src/core 文件顺序：' + CORE_FILES.join(' → ') + '）');
  }
  return FL;
}

module.exports = { bootstrap, CORE_FILES, CORE_DIR };
