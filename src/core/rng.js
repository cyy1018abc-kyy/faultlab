/* owner: core-engine | module: rng | contract: docs/CONTRACT.md */
/* 确定性伪随机数：mulberry32 / gauss / hashSeed。全部由 seed 决定，禁止 Math.random。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};

  function mulberry32(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* FNV-1a 32bit：把字符串（seed / 信号 id）折叠成整数种子 */
  function hashSeed(str) {
    var s = String(str);
    var h = 0x811c9dc5 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i) & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  /* Box-Muller：每次消耗 2 个均匀随机数，返回标准正态样本 */
  function gauss(rand) {
    var u1 = rand();
    var u2 = rand();
    if (!(u1 > 1e-12) || u1 >= 1) u1 = 1e-12;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /* 按 (seed, signalId) 建立独立序列；同一 seed/同 id 跨运行完全一致 */
  function forSignal(seed, signalId, salt) {
    return mulberry32(hashSeed(String(seed) + '|' + signalId + '|' + String(salt || '')));
  }

  /* 逐采样点独立噪声：不依赖调用顺序，index 决定样本 */
  function noiseAt(seed, signalId, index) {
    var rand = mulberry32(hashSeed(String(seed) + '|' + signalId + '|' + String(index)));
    return gauss(rand);
  }

  FL.rng = {
    mulberry32: mulberry32,
    hashSeed: hashSeed,
    gauss: gauss,
    forSignal: forSignal,
    noiseAt: noiseAt
  };
})();
