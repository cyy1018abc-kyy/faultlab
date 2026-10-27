/* owner: core-engine | module: hash | contract: docs/CONTRACT.md */
/* 确定性序列化 + 纯 JS SHA-256（无依赖、无网络、可在 file:// 与 Node 下运行） */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  var core = FL.core = FL.core || {};

  /* ------------------------------------------------------------------ *
   * canonicalize(obj) -> string
   * 稳定性：对象 key 排序；数组保序；数字规范；丢弃 undefined/函数。
   * 用同一个 canonical 字符串做 SHA-256 即得 configHash / modelHash。
   * ------------------------------------------------------------------ */
  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function numberToString(n) {
    if (n === 0) return '0'; // 归一化 -0
    return String(n);
  }

  function canonicalize(value) {
    var stack = [];

    function walk(v, path) {
      if (v === null || v === undefined) return 'null';
      var t = typeof v;
      if (t === 'number') return isFiniteNumber(v) ? numberToString(v) : 'null';
      if (t === 'string') return JSON.stringify(v);
      if (t === 'boolean') return v ? 'true' : 'false';
      if (t === 'bigint') return JSON.stringify(v.toString());
      if (t === 'function' || t === 'symbol') return 'null';

      if (Array.isArray(v)) {
        if (stack.indexOf(v) !== -1) throw new Error('canonicalize: 循环引用 at ' + path);
        stack.push(v);
        var parts = new Array(v.length);
        for (var i = 0; i < v.length; i++) parts[i] = walk(v[i], path + '[' + i + ']');
        stack.pop();
        return '[' + parts.join(',') + ']';
      }

      if (t === 'object') {
        if (stack.indexOf(v) !== -1) throw new Error('canonicalize: 循环引用 at ' + path);
        stack.push(v);
        var keys = Object.keys(v).filter(function (k) {
          var vt = typeof v[k];
          return vt !== 'undefined' && vt !== 'function' && vt !== 'symbol';
        }).sort();
        var out = new Array(keys.length);
        for (var j = 0; j < keys.length; j++) {
          var k = keys[j];
          out[j] = JSON.stringify(k) + ':' + walk(v[k], path + '.' + k);
        }
        stack.pop();
        return '{' + out.join(',') + '}';
      }

      return 'null';
    }

    return walk(value, '$');
  }

  /* ------------------------------------------------------------------ *
   * SHA-256（FIPS 180-4），输入按 UTF-8 编码。
   * ------------------------------------------------------------------ */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  var H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  function utf8Bytes(str) {
    var s = String(str);
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) {
          var cp = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
          i++;
          out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        } else {
          out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        }
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return out;
  }

  function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  function sha256(input) {
    var bytes = utf8Bytes(input);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor(bitLen / 4294967296) >>> 0;
    var lo = bitLen % 4294967296 >>> 0;
    bytes.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
    bytes.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

    var H = H0.slice();
    var w = new Array(64);

    for (var off = 0; off < bytes.length; off += 64) {
      var t;
      for (t = 0; t < 16; t++) {
        var o = off + t * 4;
        w[t] = (((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0);
      }
      for (t = 16; t < 64; t++) {
        var s0 = (rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)) >>> 0;
        var s1 = (rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)) >>> 0;
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3];
      var e = H[4], f = H[5], g = H[6], h = H[7];

      for (t = 0; t < 64; t++) {
        var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        var ch = ((e & f) ^ (~e & g)) >>> 0;
        var temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var temp2 = (S0 + maj) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }

    var hex = '';
    for (var i = 0; i < 8; i++) hex += (H[i] >>> 0).toString(16).padStart(8, '0');
    return hex;
  }

  function hashObject(obj) {
    return sha256(canonicalize(obj));
  }

  function hashString(str) {
    return sha256(String(str));
  }

  core.canonicalize = canonicalize;
  core.sha256 = sha256;
  core.hashString = hashString;
  core.hashObject = hashObject;
})();
