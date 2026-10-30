# G8 I-11 移植逐位一致性复验证据包（V0.3.0 发布候选，2026-10-30）

> **性质声明**：本目录记录 I-11 plant 接口移植（提交 `311d0f0`，随 `main` 进入 V0.3.0 发布候选）的
> **逐位一致性复验**证据：以移植前基线 `7aed9f6` 为参照，12 配置 × 3 字段（`run_hash` /
> `signals_sha256` / `metrics_sha256`）**36/36 逐位相同**。这是**内部一致性与可复现性证据**，
> **不构成模型验证、不构成硬件验证**（`model_validation=not_performed`、
> `hardware_verification=not_performed` 保持不变）；`engine_version` 按 RFC §6.1 裁决维持 `0.1.0`。
> 结论仅限本目录 §5 的固定 12 配置矩阵，不外推到其它配置、种子、UI/浏览器路径或物理性能。

## 1. 目的与范围

- **背景**：I-11 移植（CHG-20261030-07，RFC `FaultLab-evaluation/NEXT/RFC_MODEL_INTERFACE_I11_APPROVED.md`
  §9）把 FL-001 / FC-001 plant 适配器从并行备份分支还原回 V0.3 主线，使 `FL.registry.createRun`
  全管线对已覆盖家族委派 plant 适配器（内联数值路径保留）。
- **验收问题**：接口化只改变实现组织方式，是否改变内容寻址面（`run_hash`）与数据面（signals/metrics）？
- **判据（RFC §4 兼容性契约，适配本基线）**：移植前后快照逐配置、逐字段完全一致 —— `run_hash`
  逐位不变；任一字段变化即视为接口化改变了内容寻址面，应按 CHG 回滚。
  12 配置 × 3 字段 = **36 项全等 = PASS**。
- **覆盖矩阵**：plant 接管家族（FL-001 / FC-001 的 `none`、`sensor_drift`，主体）、暂缓家族
  （`load_step` / `actuator_fault`，走未改动内联路径）、GT-001 对照（未接入接口）。共 12 配置。

## 2. 产物清单

| 文件 | 说明 |
|---|---|
| `baseline-7aed9f6.json` | 基线快照：`7aed9f6` detached worktree 中运行同一快照工具生成（12 配置 × 3 字段 + 代码版本元数据） |
| `current.json` | 当前快照：代码冻结候选提交 `1a8c1ae`（`main`）生成，记录 `code.commit_sha` / `branch` / `worktree_dirty`、`node`、`engine_version`、`generated_at` |
| `comparison.json` | 逐位比对结果：`match=true`、12/12 配置、36/36 字段、`diffs=[]`，并内嵌基线与当前代码版本元数据 |
| `README.md` | 本文件（目的、命令、环境、结果、RFC §9.6 交叉核对、诚实边界） |

**工具**：`tools/verify-i11-bitidentity.mjs`（零第三方依赖，离线）。本次为 G8 证据归档做了增量增强，
默认快照行为保持向后兼容：

- 快照元数据新增：`code.commit_sha`（`git rev-parse HEAD`）、`code.branch`、
  `code.worktree_dirty`（`git status --porcelain --untracked-files=no`）、`node`；
  `engine_version`、`generated_at` 原有字段保留。
- 新增比对模式：`--baseline <基线快照.json> [--out <比对结果.json>]` —— 生成当前 12 配置快照并逐配置
  比对 `run_hash` / `signals_sha256` / `metrics_sha256`（共 36 项），打印匹配数与差异明细，写入比对
  JSON；退出码 **0 = 36/36 全等**，**1 = 存在差异 / 快照读取失败 / 参数错误**。
- 兼容性：`node tools/verify-i11-bitidentity.mjs [输出文件]` 仍为默认快照模式（给定输出文件则写入，
  否则打印 stdout），输出结构与既有快照字段一致（仅新增元数据字段）。

## 3. 复现步骤（PowerShell，仓库根目录）

```powershell
# ① 基线快照：detached worktree @ 7aed9f6（out/ 已 gitignore），复制当前工具后运行
git worktree add --detach out/i11-baseline 7aed9f6
Copy-Item tools/verify-i11-bitidentity.mjs out/i11-baseline/tools/
Push-Location out/i11-baseline
node tools/verify-i11-bitidentity.mjs ..\..\FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\baseline-7aed9f6.json
Pop-Location
git worktree remove --force out/i11-baseline

# ② 当前快照 + 逐位比对（先写 out/ 暂存再复制入本目录；
#    避免证据文件自身的写入把 worktree_dirty 记成 true —— 快照记录的是生成时刻的代码树状态）
node tools/verify-i11-bitidentity.mjs out\current.json
node tools/verify-i11-bitidentity.mjs --baseline FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\baseline-7aed9f6.json --out out\comparison.json
Copy-Item out\current.json FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\current.json
Copy-Item out\comparison.json FaultLab-evaluation\NEXT\evidence\g8\i11-bitidentity\comparison.json

# ③ 判读：② 的比对命令退出码 0 = 12/12 配置 36/36 字段全等
```

说明：基线 worktree 中复制的工具文件为**未跟踪文件**，`git status --porcelain --untracked-files=no`
不计入 `worktree_dirty`，故基线快照 `worktree_dirty=false`；基线为 detached HEAD，`code.branch=HEAD`。
工具的子进程输出捕获使用「临时文件 + 继承文件描述符」而非管道 stdio（受限环境下管道可能 EPERM），
语义等价、普通环境同样适用。

**本轮归档（`1a8c1ae`）生成方式说明**：生成时刻主线工作区含未提交的发布工件/文档改动（`artifacts/`
下最终 G2/E2E 重跑产物与发布文档编辑；`src/core`、`tests`、`tools` 无未提交改动）。为让快照记录的
代码树状态真实为干净（`worktree_dirty=false`），`current.json` / `comparison.json` 由 `1a8c1ae` 的
**独立干净检出**（`out/` 下临时副本，生成后删除；提交/分支/源码与主线一致）生成，主线文件未被改动；
基线快照与此前归档一致，不受影响。

## 4. 实测结果（2026-10-30）

| 项 | 值 |
|---|---|
| 基线提交 | `7aed9f6e12408aed2a163255d03d029ad8030a50`（detached worktree，`branch=HEAD`，`worktree_dirty=false`，`engine_version=0.1.0`） |
| 当前提交 | `1a8c1aee4f95d9e1d867fd318bc5114ee4330443`（`main`，`worktree_dirty=false`，`engine_version=0.1.0`） |
| 环境 | Windows 11（内核 10.0.26200）、Node `v24.14.0`、git `2.53.0.windows.2`；离线、零第三方依赖 |
| 配置数 | **12/12** |
| 字段比对 | **36/36**（12 配置 × `run_hash` / `signals_sha256` / `metrics_sha256`） |
| 差异 | **0**（`diffs=[]`、`missing_in_baseline=[]`、`extra_in_baseline=[]`） |
| 比对模式退出码 | **0** |
| RFC §9.6 交叉核对 | **12/12** `run_hash` 与 RFC 表格逐位一致（脚本解析 RFC 表格比对，非人工转录） |
| 负例自检（工具有效性） | 在快照复制品中篡改 `FC-001/load_step/closed_loop` 的 `run_hash` 并注入多余配置 → 比对退出码 **1**、**35/36**、差异明细精确列出该配置/字段、`extra_in_baseline` 命中；证明比对器不是恒真通过 |

本快照于代码冻结候选提交 `1a8c1ae` 的干净检出中生成，`worktree_dirty=false` 表示生成时刻无未提交
的跟踪文件（生成方式说明见 §3 末段）；`code` / `node` / `generated_at` 元数据不参与任何哈希计算，
快照结论只由产品代码决定。

## 5. 12 配置 run_hash 一览（与 RFC §9.6 表逐位一致）

| 配置 | `run_hash` |
|---|---|
| FL-001/none/closed_loop | `dcc74e2141769aa70531e22e657ad432b5ab9effceb33d49df19b7620c871f21` |
| FL-001/none/monitor | `ad40bc00225dc5f4dbc20ac4eb69963b5c720a8fbe9fca8405c076ab103df0b8` |
| FL-001/sensor_drift/closed_loop | `2463535a0817ce201bf78decca4c5f24792916650007b3368b3a138ad9103004` |
| FL-001/sensor_drift/monitor | `987e4b0aaed92b4aca90f09e18ab6e5edeb30871376a135d4763fb85968fdc6f` |
| FL-001/actuator_fault/closed_loop | `cd35e73a42b4929fb58d4c413d9a426a2b4315f5ee0ed18ad540ae4ae98cdbb2` |
| FC-001/none/closed_loop | `cc03d75edad7ac94868a9a80828573fe328819ceffbcf32d6e1fae910c140a96` |
| FC-001/none/monitor | `346bf31cbaa63debd27f15eacd8a584de766e8fc3e596df3c58f4f398010d600` |
| FC-001/sensor_drift/closed_loop | `f725be559525afb644304a9339e843d4926016615dfc7d462a882639e7c18409` |
| FC-001/sensor_drift/monitor | `8ba97205b4dc34680a6c1c35a74436ad004aa045ed1b5a1313734f07a5b744ec` |
| FC-001/load_step/closed_loop | `6adabf69a50e4859128a7116b5fd45eb0e8cbc4434226e8992559f35e7773d28` |
| FC-001/actuator_fault/closed_loop | `95bafc8b137e12d208bd3b1789c42a814a2db3cfe58df83bbe6a2f6d7ae82a5e` |
| GT-001/sensor_drift/closed_loop | `b431782a6414f6971e26a104559791073d03cf4f95fc37077c8a2aca8cbbe822` |

`signals_sha256` 与 `metrics_sha256` 在这 12 配置上同样逐位相同（36/36），完整哈希值见
`baseline-7aed9f6.json` 与 `current.json` 的 `runs.*` 字段，逐项对照见 `comparison.json`。

## 6. 诚实边界（本证据不证明什么）

1. **内部一致性 / 可复现性 only**：证明 I-11 接口化在固定 12 配置矩阵上未改变 `run_hash` 与
   signals/metrics 哈希（移植前后由同一套 registry/engine 管线产出）。
2. **不是模型验证**：不证明 FL-001 / FC-001 的物理/数值模型正确，也不新增任何模型能力；
   `model_validation=not_performed` 不变。
3. **不是硬件验证**：不涉及任何硬件或实测数据；`hardware_verification=not_performed` 不变。
4. **覆盖有限**：仅固定 12 配置矩阵与固定 `runId`/`createdAt` 快照路径；不覆盖其它种子、其它系统/
   家族组合、浏览器 UI 路径（E2E 另见 G2 证据包）、性能（RFC §9.8 已列遗留：性能微基准未做）。
5. **`engine_version` 维持 0.1.0**：移植未改变任何输出，按 RFC §6.1 裁决不升版（RFC §9.8）。
6. 本证据是**同源重跑对照**（基线代码在独立 worktree 中由同一工具生成），不是第三方独立 oracle。

## 7. 记录信息

- 生成方式：§3 命令实测（2026-10-30，Windows / Node v24.14.0 / 离线）。
- 记录人：i11-verifier（发布门禁验证），归档于 G8 发布证据包。
- 归档状态：本证据已在**代码冻结候选提交 `1a8c1ae`**
  （`1a8c1aee4f95d9e1d867fd318bc5114ee4330443`）上重新生成 `current.json` / `comparison.json`
  （`code.commit_sha=1a8c1ae…`、`worktree_dirty=false`）；`baseline-7aed9f6.json` 为固定基线
  （`7aed9f6e12408aed2a163255d03d029ad8030a50`，detached HEAD），不再变化。
