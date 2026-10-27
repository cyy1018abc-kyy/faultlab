/* owner: lead | module: main | contract: docs/CONTRACT.md */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const VERSION = '0.1.0';
  FL.app = { version: VERSION };

  const REQUIRED = [
    ['protocol', 'FL.protocol'],
    ['systems', 'FL.systems'],
    ['core', 'FL.core'],
    ['ui', 'FL.ui'],
    ['store', 'FL.store'],
    ['shell', 'FL.shell']
  ];

  window.addEventListener('error', (e) => {
    console.error('[FaultLab] uncaught error:', e.error || e.message, e.filename ? e.filename + ':' + e.lineno : '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[FaultLab] unhandled rejection:', e.reason);
  });

  function fatal(title, detail) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    const box = document.createElement('div');
    box.style.cssText = 'max-width:720px;margin:12vh auto;padding:28px;border:1px solid #2f3945;border-radius:10px;background:#0e141b;font-family:"Microsoft YaHei UI",sans-serif;color:#c2ccd0;line-height:1.7';
    box.innerHTML = '<div style="font-family:Consolas,monospace;font-size:11px;letter-spacing:.16em;color:#ff5f6d;text-transform:uppercase">FaultLab 启动失败</div>'
      + '<h1 style="font-size:20px;color:#eef3f2;margin:10px 0 8px">' + title + '</h1>'
      + '<p style="font-size:13px">' + detail + '</p>'
      + '<p style="font-size:12px;color:#8b98a5">请确认通过本地服务器打开（python tools/serve.py），并检查 index.html 中脚本是否全部加载成功；浏览器控制台有更详细的错误。</p>';
    app.appendChild(box);
  }

  function boot() {
    const missing = REQUIRED.filter(([, path]) => {
      const parts = path.split('.');
      let cur = window;
      for (let i = 0; i < parts.length; i++) {
        if (cur == null) return true;
        cur = cur[parts[i]];
      }
      return cur == null;
    }).map(([name]) => name);
    if (missing.length) {
      fatal('模块未就绪', '缺少核心模块：' + missing.join(' / ') + '。这通常意味着某个脚本文件缺失或加载失败。');
      return;
    }
    try {
      FL.shell.boot();
      FL.__ready = true;
      document.body.classList.add('fl-ready');
      console.info('[FaultLab] V' + VERSION + ' ready');
    } catch (err) {
      console.error('[FaultLab] boot failed', err);
      fatal('启动异常', String(err && err.message ? err.message : err));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
