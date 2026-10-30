# G8 发布验收记录 — FaultLab V0.3.0（2026-10-30）

> **门禁**：G8（发布门，`V0.3_PLAN_APPROVED.md` §4：复用 G5 R-01…R-10 + 双浏览器走查 +
> 版本/标签/README/页脚同步 + CHG）。
> **性质**：本记录是**版本发布验收**，不是模型验证、不是物理守恒验证、不是硬件验证。
> 全部 PASS 含义为「内部一致性与可复核性证据」；`model_provenance=analytical_demo`、
> `model_validation=not_performed`、`hardware_verification=not_performed` 三标签随发布材料保留。
> **候选提交（被测试代码）**：`1a8c1aee4f95d9e1d867fd318bc5114ee4330443`（短 `1a8c1ae`）
> **发布提交**：`v0.3.0` 标签所指提交（哈希见 `git log`；本文件不能自引用发布提交哈希）
> **验收日期**：2026-10-30 · **记录人**：实现 Agent · **批准人**：用户（V0.3.0 最终实施方案）
> **范围约束（本次发布不变）**：不新增产品功能、不做大规模架构重构、不扩物理模型范围；
> 不升级 FC-001 预览状态；不重建 `FaultLab.html`；`engine_version` 维持 `0.1.0`。

## 0. 执行环境（本机实测）

| 项 | 值 |
|---|---|
| 平台 | Windows（win32 / x64；本机为 Windows 11 台机） |
| Node | v24.14.0 |
| Python | 3.14.4 |
| Chrome | 155.0.8059.85（headless，CDP 实测 `Browser.getVersion`） |
| Edge | 155.0.4283.62（headless，CDP 实测 `Browser.getVersion`） |
| 执行方式 | 全部离线、零第三方依赖；`run-g2` 26 秒量级 |

## 1. R-01…R-10 逐项结果

| # | 检查项 | 通过条件 | 结果 | 证据 |
|---|---|---|---|---|
| **R-01** | 聚合回归 | G2 19/19 | ✅ **19/19 PASS**（`ok=true`，`failed_count=0`；`commit_sha=1a8c1ae…443`，`worktree_dirty=false`） | `artifacts/run-g2-report.json`（2026-10-30T10:49:10Z，含每步 `duration_ms`） |
| **R-02** | Golden 与逐位一致性 | 双 golden 通过、I-11 12/12 | ✅ `verify_golden.py`（fl001 / fc001）均 exit 0；✅ I-11 **12/12 配置 · 36/36 字段**（`run_hash`/`signals_sha256`/`metrics_sha256`）对基线 `7aed9f6` 全等，`engine_version` 两侧均 `0.1.0` | G2 报告步骤①②；`evidence/g8/i11-bitidentity/`（`baseline-7aed9f6.json` / `current.json` / `comparison.json` / `README.md`） |
| **R-03** | 文案护栏 | Copy Guard PASS | ✅ `node tools/copy-guard.mjs` exit 0（29 禁止词模式，`src/**` 命中 0） | G2 报告步骤「G4 copy-guard」；本记录 §2 复跑 |
| **R-04** | 离线运行 | 无外部请求、无 console error | ✅ Chrome/Edge 各 40/40 断言含 E-08：外部请求 0、console error 0；两份报告 `failures=[]` | `evidence/g8/chrome/e2e-report.json`、`evidence/g8/edge/e2e-report.json` |
| **R-05** | README | 运行、安装、复现说明正确 | ✅ README v0.3.0：`python -m http.server` 离线运行、零依赖、复核命令与证据索引更新；声明边界未放宽 | `README.md` §2/§7；`evidence/g8/README.md` |
| **R-06** | 测试报告 | 版本、环境、测试结果完整 | ✅ `run-g2-report.json` 含 `code{commit_sha,branch,worktree_dirty}`、`environment{platform,arch,node,python}`、`execution{command,started_at,generated_at,duration_ms}`、每步 `duration_ms`（T1）；E2E 报告含浏览器实测身份、候选 SHA、`worktree_dirty=false`（T3） | `artifacts/run-g2-report.json`；两份 E2E 报告 |
| **R-07** | Scope 守卫 | 扩展预览不混入 FL-001 主验收 | ✅ `tests/scope-guard.test.js` 24/24；FC-001/GT-001/Arena 仍 `extension_preview`，SA-24 白名单未扩大；FC-001 **未**升正式 | G2 报告步骤「G4 scope-guard」；`README.md` §5 |
| **R-08** | 证据包复核 | 校验和、Schema、重算、run_hash 通过 | ✅ `tests/bundle.test.js` 35/35（含 `verify_bundle.py` 好包 exit 0 / 篡改包非零、重算与 `run_hash` 复核）；EvidenceBundle v1 格式未改（无 `bundle_schema_version` 变更） | G2 报告步骤「④ bundle.test.js」 |
| **R-09** | 浏览器验收 | Chrome 40/40、Edge 40/40 | ✅ **Chrome 155.0.8059.85 = 40/40**；✅ **Edge 155.0.4283.62 = 40/40**；同一候选 SHA `1a8c1ae…443`、`worktree_dirty=false`、同一 fl001-min 旅程、同一台 Windows 机器 | `evidence/g8/chrome/`、`evidence/g8/edge/`、`evidence/g8/walkthrough-dual-browser.md` |
| **R-10** | 工程边界 | 「模型验证、硬件验证未执行」声明保留 | ✅ README/UI/报告/证据包保留 `model_validation=not_performed`、`hardware_verification=not_performed`、`model_provenance=analytical_demo`；文案护栏禁止「验证通过/实测/物理守恒验证」类表述 | `README.md` §5/§9；`tools/copy-guard.mjs` exit 0；`tests/report.test.js` 页脚断言 |

## 2. 复跑命令（全部离线、零第三方依赖）

```powershell
node tools/run-g2.mjs                                  # R-01/R-02/R-03/R-07/R-08：19/19（含 E2E）
python scripts/verify_golden.py                        # R-02 fl001 golden（exit 0）
python scripts/verify_golden.py fc001                  # R-02 fc001 golden（exit 0）
node tools/verify-i11-bitidentity.mjs --baseline FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\baseline-7aed9f6.json --out FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\comparison.json
node tools/copy-guard.mjs                              # R-03/R-10：PASS
node tools/e2e.mjs --out <dir>                         # R-04/R-09：Chrome 40/40
node tools/e2e.mjs --chrome "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --port 4322 --cdp-port 9355 --out <dir>   # R-09：Edge 40/40
```

> 注：I-11 基线快照 `baseline-7aed9f6.json` 由 `7aed9f6` 的 detached worktree 用同一快照工具生成；
> 复现步骤见 `evidence/g8/i11-bitidentity/README.md` 与 `RFC_MODEL_INTERFACE_I11_APPROVED.md` §9.7。

## 3. 非阻断项与已知边界（不虚报）

| # | 项 | 处置 |
|---|---|---|
| N-1 | 浏览器矩阵只覆盖**本机实测的当前构建** Chrome 155.0.8059.85 / Edge 155.0.4283.62（headless，CDP 实测版本）；未安装旧版浏览器，未建立 Windows 10/11 双环境矩阵 | 按计划 T3 范围，不额外安装；滚动版本回归属发布后持续项。 |
| N-2 | 性能阈值仍未冻结（G5 F-5） | 保留记录；本次发布不新增性能门禁，不据此宣称性能指标。 |
| N-3 | 本验收为记录者单路执行；G8 沿用 G5「复用 R-01…R-10 + 双浏览器走查」结构 | 评审独立性（F-6 整改）在 G6/G2b 环节已实行双路；G8 按批准计划执行并留痕。 |
| N-4 | FC-001 仍为 `extension_preview`；GT-001 实现未开工；`load_step` 已按 O-13 删除 | 均为 V0.3 计划 §2.2「暂不纳入」项，不因发布默认取消。 |
| N-5 | 一致性/PASS 不等于模型有效 | 见页首与 R-10；发布说明与 UI 继续保留 not_performed 声明。 |

## 4. 结论（评审侧 / 决策侧）

- **评审侧（记录人）**：R-01…R-10 全部满足，无阻断项 → **GO**。
- **决策侧（用户）**：用户以《FaultLab V0.3.0 最终实施方案》批准本次发布；G8 关闭动作 =
  创建 `v0.3.0` 标签与 GitHub Release、发布仓库静态目录（仓库根即静态目录，无构建步骤）。
- **发布定位**：FaultLab V0.3.0 是一个稳定、可复现、可追溯的工程演示与验证平台版本；
  **不代表**真实设备或物理模型已经完成验证。

## 5. 发布提交与候选提交的代码一致性校验

发布提交（`v0.3.0` 标签）相对候选提交 `1a8c1ae` 只允许新增文档/证据与本记录，
**不允许**任何产品代码、测试或工具变更；发布后可用以下命令复核（期望输出为空）：

```powershell
git diff --stat 1a8c1aee4f95d9e1d867fd318bc5114ee4330443..v0.3.0 -- src tools tests index.html
git status --porcelain        # 期望为空（工作树干净）
```

> 即：候选提交 `1a8c1ae` 上取得的 G2 19/19、I-11 12/12、双浏览器 40/40 证据，
> 对发布提交同样成立（差异仅在文档与证据文件）。

**文件结束**（2026-10-30）。
