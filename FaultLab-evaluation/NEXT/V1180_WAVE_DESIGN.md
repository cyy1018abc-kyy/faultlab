# V1180_WAVE_DESIGN — v1.18.0 波设计（讨论稿，多轮进行中）

> **性质**：阶段设计文档（Lead 起草，2026-11-27）——v1.17.0 发布（PR #2 合并 5545892）后首波。
> **状态**：**讨论中**——用户 2026-11-27 指令「进入 1.18 的方案设计，与我进行多轮讨论」；第一轮已裁定（§1），
> 第二轮（A 组细节）进行中。全部轮次结束后登记批准 CHG 并转 v1。
> **输入**：V08_ROADMAP §3 v1.18.0 行 + §8 对账 ｜ V1170_WAVE_DESIGN §5 ｜ TL001_FMU_G2B_SPEC_APPROVED v1.0 ｜
> evidence/g8/v1170-release.md §4/§5 ｜ V2_CONVERGENCE_PRE_RESEARCH §5（R-V2-04「A-11 收口后重开」）。

---

## 1. 第一轮裁定（2026-11-27，用户「全部采用推荐」）

| # | 裁定点 | 裁定 |
|---|---|---|
| R1-1 | 主轴 | **(a) A 组 TL-001 C99/FMU 链收尾 + B 组残留清算**（不按 V08 原排「仅残留+运营」，不直入 v2.0.0） |
| R1-2 | Q5 runHash systems 数组 | **改判：移入 v2.0.0 breaking 候选清单，本波不做**。理由：runHashInput（registry.js:46）现无 systems；v1.17.0 已发布 TL-001 Run，加键将改变同 config 下 TL-001 run_hash，证据包导入 `computeRunHashFromParts` 重算即失配（或须新旧双路径）——违反「既有 Run 哈希零变化」；语义增量低（联合身份已由 config_hash 内 systemId=TL-001 / modelId 承载）。规格 Q5=(a) 定案时 TL 未发布，前提已变 |
| R1-3 | win64 联合 dll 时序 | **(a) v1.18.0 先以 linux64-only 发布**：新包无 win64 条目时 Windows parity 按 D-12 SKIP 语义记 skipped，发布证据显式登记；用户 WinLibs 构建 dll 后出 **v1.18.1** 补丁（包重钉） |
| R1-4 | B 组残留 | **全部纳入**：① I-11 历史基线漂移溯源 + 新基线归档；② GT 热力链 agent 适配面（eval-session-003 幅值 NaN / 分类偏 actuator）；③ v1.17.0 Windows 侧回归（用户本机项，不阻塞发布） |
| R1-5 | 治理收尾 | 收口时起草 **V09_ROADMAP** + 按 R-V2-04 **重开 v2.0.0 裁定章**（讨论稿，不定排程）；Q5 进入 v2.0.0 breaking 清单 |

**不做（本轮确认）**：darwin64 / .dylib（R-L64-03 维持）；D-13 第三方 Agent 运营（不绑发布）；
联合模式下垂调速器（远期候选维持）。

## 2. 第二轮裁定：A 组 TL-001 C99/FMU 链（2026-11-27，用户「全部采用推荐方案路线」）

| # | 裁定点 | 裁定 |
|---|---|---|
| R2-1 | 工件形态 | **(a) 打包为 FMU** `data/fmu/gt_tl_joint_l1_v1.fmu`（fmu_admission 准入 + V312 新增 §13 钉值）；规格 §1.2「本轨无 FMU 工件…无 V312 钉值面」澄清为「**golden 层不依赖 FMU 工件**」（golden 由 oracle emit、model_id `gt.sync.tl.l0` 不变——零已发布面改动）。依据：规格 §1.1（C99 内核 + modelDescription.xml + fmu_runner 联合 shell）、Q6（三先例机制全复用）、V1170 DEC-4（「该包」）与 §1.2 字面不一致，按多数条文定 |
| R2-2 | 内核输入面 | **增 `line_open`（0/1）为第四输入**（规格 §1.5 列三项：demand_kW / u_eff_kW / p_elec_scale）——规格偏离显式登记。依据：oracle `joint_gt_standalone` 走 `line_open → P_elec = 0.0` 分支（gt_tl_joint_oracle.py:215）；若以 scale=0 表达，δ<0 时得 `-0.0`，P_elec 列不再与 golden 逐位相同、并危及 GLJ-5 逐位恒等守卫 |
| R2-3 | parity 判据与门值 | C 内核 + host shell 8 Run × 29 列（除 t）对 `gt_tl_joint_v1` golden 逐点规模相对误差（gt001 parity 同构）；**门值 = 不小于实测 ×10 的最小 10 的整数次幂，且远小于 golden T-B 容差；实测 0.0 ⇒ 1e-9（fc001 先例）**。规格 R-A-09(2) sin 大参数义务**销项**：golden 8 Run \|δ\| 最大 1.021 rad，无大参数路径 |
| R2-4 | host shell 与构建 | `fmu_runner.py` 增 `run_gt_tl_joint_shell` + `--run-gt-tl-joint`（GT shell 同构：governor / 传感偏置 / 记账 / 事件分裂归 host；内核纯物理 [f,T3,δ] RK4，h=0.01、n=1）；`build_fmu.py` 增 `--tl` 目标（复用 D-12 平台分支）；v1.18.0 包仅 linux64（R1-3） |
| R2-5 | adapter | **做**：`src/core/plants/gt-tl-joint-adapter.js`（gt001-fmu-adapter 同构——预烘焙 golden + bridge 探针 + 轨锚定校验 golden_id / model_id / provenance）；不增 bridge HTTP 端点、不接 UI（两先例同款），测试覆盖 |
| R2-6 | 步账与测试 | run-g2 **39→40**（第 40 步 `gt_tl_joint_parity.py`，extended 层，`skipExitCode: 3`）；fmu_admission 自检覆盖新包 |

## 3. 第三轮：B 组残留 + 治理收尾 + 波次（讨论中）

见会话讨论稿；裁定后回填本节。

**文件结束**（讨论稿）。
