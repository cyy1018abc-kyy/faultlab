# V1180_WAVE_DESIGN — v1.18.0 波设计（v1 批准——TL-001 C99/FMU 链收尾 + I-11 新基线，精简版）

> **性质**：阶段设计文档（Lead 起草，2026-11-27）——v1.17.0 发布（PR #2 合并 5545892）后首波。
> **状态**：**v1 批准（CHG-20261127-03）**——用户 2026-11-27 指令「进入 1.18 的方案设计，与我进行多轮讨论」→
> 三轮讨论 + 臃肿度复核（§1–§4 各轮「全部采用推荐」；第四轮「全部采用推荐，并且使用精简版本」）。
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
| R2-5 | adapter | ~~做~~ → **第四轮改判不做（§4）**；原案：`src/core/plants/gt-tl-joint-adapter.js`（gt001-fmu-adapter 同构——预烘焙 golden + bridge 探针 + 轨锚定校验 golden_id / model_id / provenance）；不增 bridge HTTP 端点、不接 UI（两先例同款），测试覆盖 |
| R2-6 | 步账与测试 | run-g2 **39→40**（第 40 步 `gt_tl_joint_parity.py`，extended 层，`skipExitCode: 3`）；fmu_admission 自检覆盖新包 |

## 3. 第三轮裁定：B 组残留 + 治理收尾（2026-11-27，「全部采用推荐」；第四轮精简后终态见 §4）

| # | 裁定点 | 裁定（终态） |
|---|---|---|
| R3-1 | B① I-11 历史基线漂移 | **(a)+(b)**。溯源（本轮实测）：legacy 套件 v0.3.0 冻结候选 `1a8c1ae` 在 Linux/Node v22 下复现基线 12/12（环境无关）；首次漂移 `a2f2a0d`（v0.3.1 GT f_channel_diff，批准变更）12→11，此后随批准模型面变更逐步至 0/12——**基线过期，非缺陷**。gt 套件 `gt-v190-pre-wiring` 在其自身提交 `fa05562`（干净工作树）仅 32/46 复现（差 14 配置全为 GT thermo/thermo_comb 路径）；原归档 46/46 为脏工作树 + Windows Node v26.5.1 生成——成因 (i) 脏树未提交改动 或 (ii) 跨 V8 `Math.pow` 末位差异，待 (b) 判定。(a) 以 v1.17.0 发布提交 `5545892` 归档两套新基线，旧基线标「历史，不作发布门」，发布门方法 =「对上一发布提交前后快照比对」正式登记；(b) 用户 Windows 侧在 `5545892` 补一次快照，判 (i)/(ii)；若 (ii) 则 CONTRACT/V1_FACES 登记 pow 路径 run_hash 环境相关 |
| R3-2 | B② GT 热力链 agent 适配 | 第三轮采 (a) 内部参考 agent；**第四轮精简改判：移入 V08 §9 候选（运营线 D-13），本波不做**——自写 agent 于自出盲包提分证据价值有限；session-003 归档原样保留 |
| R3-3 | B③ Windows 侧事项 | 不另立清单文档——**写入 v1.18.0 发布证据「用户侧事项」节**（v1.17.0 回归 run-g2 + R3-1(b) 快照 + 联合内核 win64 dll 构建步骤与钉值回传） |
| R3-4 | 治理收尾 | **精简**：不另起 V09_ROADMAP，于 **V08_ROADMAP §9「v1.19+ 候选」**一节承载；**V2_CONVERGENCE_PRE_RESEARCH §6** 半页（breaking 清单增 Q5 + TL 联合面 + 「精简治理面」候选），不定排程 |
| R3-5 | 「精简治理面」 | **列入 v2.0.0 候选**（如合并 V06/V08 路线图重复版本行、压缩每次发布须同步的文档面） |

## 4. 第四轮：臃肿度复核与精简版（2026-11-27，「全部采用推荐，并且使用精简版本」）

| 原项 | 处置 | 理由 |
|---|---|---|
| R2-5 adapter `gt-tl-joint-adapter.js` | **不做**（R2-5 改判） | 不接 UI、无 bridge 端点、仅测试消费；TL 引擎浏览器实算（与 oracle 散差 ~1e-12），预烘焙兜底无实际用途；新增维护面（文件/测试/core-load/V1_FACES）无对应价值 |
| R3-2 参考 agent + eval-session-004-internal | 移入 V08 §9 候选 | 见 R3-2 |
| V09_ROADMAP / Windows 清单独立文档 | 并入 V08 §9 / 发布证据 | 见 R3-3/R3-4 |
| v1.18.1 独立排期 | **不单独排期**——win64 联合 dll 随用户构建后的下一个版本发布（R1-3 时序细化） | 单次重钉不值独立发布轮 |

## 5. 波次与门禁（精简版——串行，各段独立提交）

```text
S1 I-11 新基线归档（5545892，legacy + gt 两套）+ 发布门方法登记 + 溯源结论入 README
S2 TL-001 联合内核链：gt_tl_joint_l1.c + modelDescription.xml（输入 demand_kW/u_eff_kW/
   p_elec_scale/line_open）+ build_fmu --tl（linux64）+ fmu_runner run_gt_tl_joint_shell +
   GT_TL_FMU_SHA256_PINNED + gt_tl_joint_parity.py（门值实测冻结 R2-3）+ run-g2 第 40 步 +
   V312 §13 + fmu_admission 覆盖
S3 门禁 + v1.18.0 发布：build ×2 + run-g2 ×2（40/40）+ verify_golden 全行 + copy-guard +
   I-11 对 S1 新基线 + ui-walkthrough；版本 1.18.0；发布证据（含用户侧事项）+ V1_FACES §23 +
   V08 §9 + V2 §6 + CHG 收口
```

**三不承诺**：既有 17 golden 字节零触碰；五类哈希既有输入零变化（I-11 对新基线全一致）；既有 39 步判据
零翻转（第 40 步为显式申报新增）。**版本**：v1.18.0 MINOR（新 FMU 包 + 新 parity 步——additive）。

**文件结束**。V1180_WAVE_DESIGN v1（2026-11-27，CHG-20261127-03 批准；四轮讨论逐轮裁定）。
