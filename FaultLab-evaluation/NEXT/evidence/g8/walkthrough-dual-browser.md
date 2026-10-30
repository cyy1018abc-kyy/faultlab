# G8 T3 双浏览器走查记录（V0.3.0，2026-10-30）

> **目的**：为 V0.3.0 发布补齐 T3 双浏览器 E2E 证据（任务 T3）。执行方式：同一 E2E
> 旅程 `fl001-min`（`tools/e2e.mjs`，40 条断言，覆盖五视图深链/事件 pre-post 相位/
> 单时钟/回放不变性/golden 指标/因果证据链/EvidenceBundle/离线无报错）分别驱动
> Chrome 与 Edge 无头实例，并各自在候选提交的**干净工作树**上取证。
>
> **候选提交（final candidate）**：`1a8c1aee4f95d9e1d867fd318bc5114ee4330443`
> （short `1a8c1ae`，branch `main`）。
> **执行日期/时间（Asia/Shanghai）**：2026-10-30 18:49（Chrome 18:49:18–18:49:28，
> Edge 18:49:34–18:49:44）。
> **取证执行会话**：Team Lead 会话（完整文件访问）；记录者为 e2e-verifier。
> 两次运行的 `code.worktree_dirty=false`，即取证时工作树相对候选提交无 tracked 变更。

## 结果

| 浏览器 | 实际版本（CDP `Browser.getVersion`.product） | revision | jsVersion | E2E fl001-min | 用时 | 证据文件 |
|---|---|---|---:|---:|---:|---:|---|
| Google Chrome（headless） | **Chrome/155.0.8059.85** | `@0e66b94549a8bd85f03fbdf189b752d6e7b63c32` | 15.5.35.25 | **PASS 40 / FAIL 0** | 9755 ms | `chrome/e2e-report.json` + `chrome/e2e-fl001-min.png` |
| Microsoft Edge（headless） | **Edg/155.0.4283.62** | `@aa3a7406ba8c53a83536df539f07124d73c899bd` | 15.5.9.7 | **PASS 40 / FAIL 0** | 10702 ms | `edge/e2e-report.json` + `edge/e2e-fl001-min.png` |

## 精确命令

```powershell
# Chrome 官方取证（默认端口 4319 / 9339）
node tools/e2e.mjs --out FaultLab-evaluation/NEXT/evidence/g8/chrome

# Edge 官方取证（独立端口 4322 / 9355，避免与 Chrome/G2 的固定端口冲突）
node tools/e2e.mjs --chrome "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --out FaultLab-evaluation/NEXT/evidence/g8/edge --port 4322 --cdp-port 9355
```

## 报告字段审计（T3 追溯增强）

逐项审计两份 `e2e-report.json`（37/37 项检查 PASS）：

- `journey=fl001-min`、`ok=true`、`pass=40`、`fail=0`、`failures=[]`：两份一致。
- `environment.browser`（CDP `Browser.getVersion` 实测，非路径/UA 猜测）：
  - Chrome：`product=Chrome/155.0.8059.85`，`revision=@0e66b945…`，`userAgent` 含 `HeadlessChrome/155.0.0.0`，`jsVersion=15.5.35.25`；
  - Edge：`product=Edg/155.0.4283.62`，`revision=@aa3a7406…`，`userAgent` 含 `Edg/155.0.0.0`，`jsVersion=15.5.9.7`。
- `environment.chrome`：Chrome 为 `C:\Program Files\Google\Chrome\Application\chrome.exe`；
  Edge 为 `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`（msedge 路径，非 Chrome）。
- `environment.base`：Chrome `http://127.0.0.1:4319`；Edge `http://127.0.0.1:4322`（端口隔离的双重旁证）；
  `environment.node=v24.14.0` 两份一致。
- `code`：两份 `commit_sha` 均为 `1a8c1aee4f95d9e1d867fd318bc5114ee4330443`（短 SHA 一致），
  `branch=main`，`worktree_dirty=false`。
- `execution`：`started_at/generated_at/duration_ms` 均为真实值（Chrome 9755 ms、Edge 10702 ms）；
  顶层 `generated_at` 分别为 `2026-10-30T10:49:28.407Z` / `2026-10-30T10:49:44.847Z`
  （即本地 18:49:28 / 18:49:44）。
- PNG 截图：两份目录各含 `e2e-fl001-min.png`，PNG 签名有效，尺寸 758×482（Chrome，214114 B）
  与 750×485（Edge，214616 B）。

> 浏览器身份与代码版本、干净工作树、执行时间均为报告内自证字段，Chrome 与 Edge 证据
> 不可互换（product 前缀 `Chrome/` vs `Edg/`、可执行路径、base 端口三重区分），
> 避免历史 G5 时期"Edge 归档误存 Chrome 报告"一类归属错误。

## 证据文件清单

- `FaultLab-evaluation/NEXT/evidence/g8/chrome/e2e-report.json`
- `FaultLab-evaluation/NEXT/evidence/g8/chrome/e2e-fl001-min.png`
- `FaultLab-evaluation/NEXT/evidence/g8/edge/e2e-report.json`
- `FaultLab-evaluation/NEXT/evidence/g8/edge/e2e-fl001-min.png`
- `FaultLab-evaluation/NEXT/evidence/g8/walkthrough-dual-browser.md`（本文件）

## 支持矩阵边界（诚实声明）

- **本机仅有单一 OS、两个当前稳定浏览器**：Windows（`10.0.26200.9711`，x64）；
  Chrome **155.0.8059.85** 与 Edge **155.0.4283.62** 各一套，无旧版 Chrome/Edge 安装。
  因此**未覆盖**"Chrome/Edge 最近两个大版本"滚动矩阵，也**未覆盖 Windows 10/11 双 OS 矩阵**；
  本机存在 Firefox 158 / IE 11，但二者不在本项目支持矩阵内，未纳入本证据。两浏览器均以
  **headless** 模式运行。
- **性质边界**：本记录是**内部一致性检查**——同一旅程与 40 条断言在两种 Chromium 引擎上
  可重复通过，且报告同时自证浏览器身份、代码提交与干净工作树；**不构成模型验证
  （model_validation=not_performed）或硬件验证（hardware_verification=not_performed）**，
  不证明数值模型的物理正确性，也不替代金标准/硬件在环证据。模型与硬件边界以
  `MODEL_VALIDATION_SPEC` / `DECISIONS` 为准（model_provenance=analytical_demo）。

## 执行环境说明（沙箱，事实记录）

- 记录者（e2e-verifier）的 agent 会话处于 workspace-write / Low-integrity 沙箱，无法启动
  Chromium：crashpad `OpenProcess` 与 mojo named-pipe 均被拒（错误码 0x5），E2E 在 CDP
  端点发现阶段超时。故两次官方取证由 Team Lead 的完整访问会话执行；
  工具行为与候选提交 `1a8c1ae` 中提交的 `tools/e2e.mjs` 版本一致（本次 T3 增强已随候选提交入库）。
- 本次仅增强见证字段与输出目录创建时机，`fl001-min` 旅程、40 条断言、执行顺序与退出码未变。
