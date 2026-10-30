# G8 发布证据包 — FaultLab V0.3.0（2026-10-30）

> **候选提交（被测试代码）**：`1a8c1aee4f95d9e1d867fd318bc5114ee4330443`（短 `1a8c1ae`）
> **发布提交**：`v0.3.0` 标签所指提交（哈希见 `git log`）
> **门禁**：G8 发布门（`V0.3_PLAN_APPROVED.md` §4）。验收记录见
> [`g8-release-checklist.md`](g8-release-checklist.md)。
> **性质声明**：本目录全部 PASS 均为**内部一致性与可复核性**证据，**不构成**模型验证、
> 物理守恒验证或硬件验证；`model_provenance=analytical_demo`、
> `model_validation=not_performed`、`hardware_verification=not_performed` 保持不变。
> V0.3.0 是工程稳定性、可复现性与可追溯性交付；不新增产品功能、不扩物理模型范围。

## 1. 结果摘要

| 项 | 结果 | 证据 |
|---|---|---|
| G2 聚合回归 | **19/19 PASS**（候选提交、`worktree_dirty=false`） | `../../../../artifacts/run-g2-report.json`（仓库根 `artifacts/`，G2 原有报告位置不变） |
| 双 Golden | `verify_golden.py` fl001 / fc001 均 exit 0 | G2 报告步骤 ①② |
| I-11 逐位一致性 | **12/12 配置 · 36/36 字段** 对基线 `7aed9f6` 全等（`run_hash`/`signals_sha256`/`metrics_sha256`；`engine_version` 两侧 `0.1.0`） | `i11-bitidentity/` |
| Copy Guard | PASS（29 禁止词模式，`src/**` 命中 0） | G2 报告步骤；`g8-release-checklist.md` §2 |
| EvidenceBundle | 35/35（含 `verify_bundle.py` 好包/篡改包交叉验证、重算与 `run_hash` 一致） | G2 报告步骤 ④ |
| 双浏览器 E2E | **Chrome 155.0.8059.85 40/40**、**Edge 155.0.4283.62 40/40**，同一候选 SHA、同一 fl001-min 旅程、`worktree_dirty=false` | `chrome/`、`edge/`、`walkthrough-dual-browser.md` |
| 环境 | Windows x64 · Node v24.14.0 · Python 3.14.4 | 各报告 `environment`/`execution` 字段 |

## 2. 本目录证据清单

| 文件 | 内容 |
|---|---|
| `g8-release-checklist.md` | G8 验收记录：R-01…R-10 逐项结果、复跑命令、非阻断项、GO 结论 |
| `chrome/e2e-report.json` | Chrome fl001-min E2E 报告（T3 追溯：实测浏览器 product/revision/userAgent/jsVersion、候选 SHA、`worktree_dirty=false`、执行耗时、40 断言明细汇总） |
| `chrome/e2e-fl001-min.png` | Chrome 旅程终态截图 |
| `edge/e2e-report.json` | Edge fl001-min E2E 报告（字段同 Chrome；`environment.chrome`=msedge 路径、`base`=:4322、`browser.product`=`Edg/…` 已逐字段核实） |
| `edge/e2e-fl001-min.png` | Edge 旅程终态截图 |
| `walkthrough-dual-browser.md` | 双浏览器走查记录（命令、版本、时间、同一候选 SHA、边界声明） |
| `i11-bitidentity/baseline-7aed9f6.json` | 基线 `7aed9f6`（I-11 移植前）12 配置快照（detached worktree，同一快照工具生成） |
| `i11-bitidentity/current.json` | 候选提交 `1a8c1ae` 12 配置快照（含 `code`/`node`/`engine_version` 元数据） |
| `i11-bitidentity/comparison.json` | 逐位比对结果：`match=true`、36/36、`diffs=[]`、`missing/extra=[]` |
| `i11-bitidentity/README.md` | I-11 复核说明：命令、环境、结果、RFC §9.6 交叉核对、负例对照、诚实边界 |

> G2 原有报告继续保留在仓库根 `artifacts/run-g2-report.json`（不重复制作多套报告）；
> 浏览器与 I-11 证据按 G8 交付目录归档于本目录。

## 3. 复跑命令

```powershell
# G2 聚合（19 步：双 golden / 数值回归 / Schema / Registry / 证据包 / 范围守卫 / 文案 / 后端准入 / Arena / E2E）
node tools/run-g2.mjs

# 双 golden
python scripts/verify_golden.py
python scripts/verify_golden.py fc001

# I-11 逐位一致性（基线 vs 当前）
node tools/verify-i11-bitidentity.mjs --baseline FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\baseline-7aed9f6.json --out FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\comparison.json

# 双浏览器（先起静态服务：python -m http.server 4318；E2E 脚本亦可自起）
node tools/e2e.mjs --out FaultLab-evaluation\NEXT\evidence\g8\chrome
node tools/e2e.mjs --chrome "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --port 4322 --cdp-port 9355 --out FaultLab-evaluation\NEXT\evidence\g8\edge

# 文案护栏
node tools/copy-guard.mjs
```

## 4. 边界与未纳入项

- 未安装旧版浏览器、未建立 Windows 10/11 双环境矩阵（按计划只验收本机当前稳定版）。
- 未冻结性能阈值（G5 F-5 保留记录）；本发布不宣称任何性能指标。
- FC-001 仍为 `extension_preview`（未升正式）；GT-001 实现未开工；`FaultLab.html` 未重建、不随发布物提供。
- 未接入 Simulink/FMU、真实设备、云端账户与排行榜（明确不做）。
- 通过项的适用范围仅限**内部一致性与可复核性**；不构成模型验证、物理守恒验证或硬件验证。

**文件结束**（2026-10-30）。
