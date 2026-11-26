/* owner: core-engine | module: version | contract: FaultLab-evaluation/NEXT/V1170_WAVE_DESIGN.md DEC-3 */
/* 应用版本单一定义点（V1170 DEC-3，CHG-20261126-02）。
   - 界面显示（shell.js 页头副标题 / 帮助弹窗）一律读 FL.APP_VERSION / FL.APP_RELEASE_DATE，禁止再写死版本字面；
   - README.md 标题与 index.html meta description 为静态文本，由 tests/version.test.js 校验与本文件一致
     （不一致 exit 1——v0.5.0 滞留 11 个发布的漂移教训）；
   - 纪律：APP_VERSION 与 engine_version（run_hash 输入）严格分离——本值不进入任何哈希输入
     （config_hash / model_hash / run_hash / scenarioHash / golden），改版本号不扰动任何 Run。
   发布时只改本文件两常量 + README 标题 + index.html meta（测试兜底三处一致）。 */
(function () {
  'use strict';
  var FL = window.FL = window.FL || {};
  FL.APP_VERSION = '1.16.0';
  FL.APP_RELEASE_DATE = '2026-11-20';
})();
