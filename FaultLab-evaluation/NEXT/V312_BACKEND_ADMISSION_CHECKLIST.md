# V312_BACKEND_ADMISSION_CHECKLIST — FL-19 后端适配实现准入清单（冻结）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.3 V3-12（WS-C 收官件；依赖 V3-11 完成，G6-WS-C 已于
> CHG-20261030-03 关闭）。本文件把 `FL19_BACKEND_RFC_APPROVED.md` v1.1 的裁定落实为**可机检/可判定的
> 实现准入条目**；冻结后实现期不得运行时放宽，任何修改走 CHG。
> **状态**：`FROZEN`（2026-10-30，记录人实现 Agent；随 CHG-20261030-04 登记）。
> **范围**：后端适配实现（B-1 Python 解析 / B-5 Python ODE 首批；B-4 FMU 按各自另批）。B-2/B-3 在
> 其自身 RFC + G2b 通过前**不在本清单授权范围**（Q-4 守卫 3）。

---

## 1. Q-4 三守卫的机检化（准入即断言，不达标自始无效）

| # | 守卫 | 机检形式（实现期必须存在的检查，纳入 run-g2 后端步） |
|---|---|---|
| G-1 | **准入门绑定**：适配器只承载 `model_id='FL-001'` 且方程集 = MODEL_VALIDATION_SPEC §1.3 + 已批准 golden | `tests/backend-admission.test.js`（计划新建）：对每个注册适配器断言 (a) `capabilities().systems === ['FL-001']`；(b) 适配器产出的 Run 的 `model_manifest.model_id === 'fl001'` 且 `model_hash` 与 `FL.core.modelManifest('FL-001').model_hash` 自述一致（FMU 黑盒除外——见 §6）；(c) 引入 §1.3 之外物理（新增方程 id / 新信号族）的适配器在注册表扫描中**自始无效**——扫描器比对适配器自述方程 id 集合 ⊆ §1.3 集合 |
| G-2 | **依赖冻结**：B-2/B-3 许可证「待核实」期间禁止任何 import/代码依赖 | 同测试扫描 `tools/backend/**` 与适配器清单的依赖声明：凡 license 字段为 `unverified` 的候选，其 import 出现在任何 `src/**`、`tools/backend/**` 即 FAIL；核实记录须指向许可证**原文**路径（对原文核实，F-6 教训） |
| G-3 | **验收路径禁入**：B-2/B-3 不得出现在任何验收路径（含 SKIP 可选步） | `run-g2.mjs` 的后端步枚举来自适配器注册表的 `admitted: true` 标志；B-2/B-3 注册条目 `admitted: false` 时不得生成任何步骤（含 SKIP 占位） |

## 2. tolerance_profile 逐字段档位（RFC §5.1 冻结；V3-12 不得运行时改值）

- **结构**：每档 = `{ profile_id, 字段: {metric_id: {判定层, 阈值, 量化依据_ref}} }`；判定层 ∈
  `gate`（对解析 golden 的门禁档）/ `crosscheck`（解析交叉层 rtol 1e-12）。
- **量化依据**：每个阈值必须附独立交叉实测记录（SC-2 同法），引用文件入适配器清单；
  **无量化依据的档位不得注册**。
- **首批冻结档**：

| profile_id | 适用 | 字段与阈值 | 依据 |
|---|---|---|---|
| `fl001-analytic-crosscheck` | B-1（宣称解析口径） | 全部 golden 指标：rtol ≤ **1e-12**（`method='analytic_flux'` 交叉层） | MODEL_VALIDATION_SPEC §3.6；B-1 实现后按 SC-2 同法实测记录 |
| `fl001-rk4-dt0.1` | B-5（RK4 dt=0.1） | `E_bat_kWh` ±5e-4、`SOC_end_pp` ±5e-3、逐点信号 vs 解析 rtol ≤1e-3（**实现期以实测预算定值后冻结**，上表值为上限） | RK4(dt=0.1) 独立误差预算（事件步内 b 冻结方式计入）；v1 引「左矩形 5.6e-5」仅量级参考 |
| `fl001-js-engine` | JS 引擎（现状，不在适配器范围） | E ±1e-6 kWh / SOC ±1e-5 pp | 既有 golden 批准容差 |

- **UI 显示**：后端 Run 详情同时显示「声明容差档」与「golden 门禁值」并排（RFC §5.1），不合并、
  不隐式套用。

## 3. BK-E03 判定归属（评审 B F-12① 裁定落地）

- **归属方：页面侧新增 vs-golden 校验器**（`src/core/golden-compare.js`，计划新建；Node 侧既有
  `scripts/verify_golden.py` 不动、不复用其代码——golden 文件只读共享）。
- 职责：加载 `data/golden/fl001_v1.json`，对后端 Run 的 metrics/checks 按其声明
  `tolerance_profile_id` 选判定层执行比对；超差 → Run 入库但 `quality_checks` 增 `fail` 项
  （check_id=`vs_golden_tolerance`），BK-E03 提示，对比入口禁用该 Run。
- **JS Run 不走该校验器**（既有 golden 路径不变）；仅 `manifest.backend` 存在的 Run 进入。

## 4. noise 施加方（评审 B F-12③ 裁定落地）

- **页面侧施加并声明**：后端适配的 `produce(config)` 一律收到 `noise={enabled:false}` 的配置；
  若需含噪对照，由页面侧在组装阶段对 blind_observable 信号施加 `FL.rng` 噪声（与 JS 引擎同源
  实现，`rng.noiseAt`），并在 manifest.backend 声明 `noise_applied_by: 'page'`。
- 后端**不得**自带噪声实现（复刻 mulberry32 逐位一致成本高且无教学增量；跨实现噪声一致性
  非本批目标）。`capabilities().supports_noise` 恒 `false`（sr1 网格）。

## 5. method 双口径显示规则（评审 B F-12④ 裁定落地）

| 口径 | 字段 | 显示规则 |
|---|---|---|
| golden/积分口径 | `metrics[].method`（既有枚举 `analytic_flux/trapezoid/substep`，G0-DEC-09 冻结） | 原样显示；后端 Run 的积分口径**不得**塞入该枚举 |
| 后端口径 | `manifest.backend.method_id`（自由串，如 `py_rk4_dt0.1`） | 在 Run 详情/对比页显示为「后端口径：<method_id>（容差档 <profile_id>）」 |

- 两者**并排显示、不得混写**；`G0-DEC-09` 枚举扩展须独立 CHG（本批不做）。
- `metrics[].method_version` 语义不变；后端 Run 的 metrics 由页面侧 `metrics.js` 计算（§4 组装权），
  其 `method` 字段取值规则：B-1 → `analytic_flux`（口径同源）；B-5 → `trapezoid`（页面重算口径），
  真实后端积分口径只体现在 `manifest.backend.method_id`。

## 6. scope-guard 断言增补（评审 B F-11 / RFC §1 受控扩展）

- 断言 1：`manifest.backend` 存在的 Run —— `run.scope === 'extension_preview'`，**即使** config
  落在 SA-24 白名单内（受控扩展：backend ⇒ 强制预览，优先级高于 classify）。
- 断言 2：`FL.scope.classify` 对该类 config 的返回值不变（`approved_p0`）——即强制发生在
  registry/组装层，**不改 classify 本身**（白名单语义零改动）。
- 断言 3：后端 Run 不进入应用内 approved 比对路径（`assertApprovedP0` 对后端 Run 抛
  `SCOPE-E01`）；golden 对照走 §3 专用校验器。
- 断言 4：后端 Run 导出包 `run_manifest.scope === 'extension_preview'` 且 `verify_bundle.py`
  通过（结构层）。
- 落点：`tests/scope-guard.test.js` 增补（计划新建用例，随实现交付）；`DATA_CONTRACT_SPEC` §2.2
  扩展表登记 `manifest.backend`（CHG 条目，见 §8）。

## 7. engine_version / model_manifest / 复核链（评审 B F-02/F-12②、评审 A Q-5 落地）

- `engine_version` = **产生数值的实现版本**：后端 Run 携带适配器声明版本（≠ '0.1.0'）；
  `DATA_CONTRACT_SPEC` §1.1「实现版本」措辞随实现 CHG。
- 后端 Run 的 `model_manifest` **必须自述**（方程/参数/假设/limitations/数值口径），不得借
  `systems.js` 清单——防 `model_hash` 与 JS 相同致 `engine.js:1407` 检查语义失真；FMU 黑盒
  无 manifest 不得准入（Q-5），「已声明未复核」状态放 `manifest.backend.self_declared: true` +
  UI 标签，**不新增 provenance 档位**（**例外——FC-001 已批 FMU 轨（FCFMU-G2b-02 批准轮，
  CHG-20261115-10）：Q2(A) 裁定 additive 新档位 `fmu_l1_lumped_unvalidated`——V312 本行
  按黑盒准入轨作用域限缩解释，FC-001 批准轨显式 CHG 例外（CHG-20261118-01 ④ 授权修订）——**B-2 扩域（CHG-20261119-01 ④）：适用面扩至已批 FMU 轨通用（GT-001 FMU 镜像轨随批准轮同轮增列——fmu_admission A-4 docstring 同步修订）**）。**（v1.19.x 起该档位已正式化——见 §14；本行原文保留为历史。）**
- 复核分工照 RFC §4 v1.1：`verify_bundle.py` = 文件/结构层；metrics/checks/run_hash 重算 =
  应用内导入路径（`createFromParts` 原子入口）；离线重算脚本（后端 golden 比对）列入实现期
  交付物。

## 8. 随实现必须登记的 CHG 条目清单（一次性打包，实现开工时落）

| # | 条目 | 影响文件 |
|---|---|---|
| C-1 | `engine_version` 语义扩展为「产生数值的实现版本」 | DATA_CONTRACT_SPEC §1.1 |
| C-2 | `manifest.backend`（id/version/method_id/tolerance_profile_id/self_declared/noise_applied_by）入 §2.2 扩展表；不入 run_hash | DATA_CONTRACT_SPEC §2.2/§3.2 |
| C-3 | BK-E01a/E01b/E02/E03/E04/E05 入契约错误码表；AE-E01…E15 入评测轨命名空间 | DATA_CONTRACT_SPEC §错误码 |
| C-4 | 条件化 provenance/data_kind/页脚文案（`numerical_simulation` 档位启用 + 「合成模型间一致性比对，仍非模型验证」句） | bundle.js/export.js + UI_COPY_GUARDRAILS §1.5（copy-guard 允许串扩充，deviations 留痕） |
| C-5 | `scenario_rules` 时刻区间口径更正 2–52 s（如涉及 FL-001 文档） | docs/CONTRACT.md §（如适用） |

## 9. 实现期归属总表（评审 B F-12 全量处置）

| # | 事项 | 归属 |
|---|---|---|
| ① | vs-golden 容差校验（BK-E03 载体） | 页面侧 `src/core/golden-compare.js`（§3） |
| ② | 后端 model_manifest | 适配器自述（§7） |
| ③ | noise | 页面侧施加并声明（§4） |
| ④ | method 双口径 | 并排显示规则（§5） |
| ⑤ | registry 入口 | `createFromParts` 原子组装（RFC §3.1 v1.1） |
| ⑥ | run-g2 后端步 | 可选步 + `--require-backend` 开关（SKIP 记 fail）+ skipped 计数（RFC §5.3 v1.1） |
| ⑦ | 双超时 | BK-E01a 连接（退避 ≤3）/ BK-E01b 作业（声明式，不混用） |

---

## 10. FC-001 L1-FMU 轨钉 hash（FCFMU-G2b-04，CHG-20261118-01 ④ 授权修订——勘误②③ + Q17 定案兑现）

| 项 | 值 |
|---|---|
| 产物 | `data/fmu/fc001_l1_v1.fmu`（FMI 2.0 CS zip——modelDescription.xml + binaries/win64/fc001_l1.dll + **binaries/linux64/fc001_l1.so（D-12 增）** + model_manifest.json；固定时间戳 + 固定 create_system 字节确定性） |
| **fmu_sha256（钉，现行——CHG-20261127-01 linux64 重钉）** | `259e2cc1c46e239da74bacabc075a40fc0b151bc3ed0b05b6e371a219da71ef6`（24,117 B）——见 §12 |
| fmu_sha256（历史钉值 v1.11.0–v1.16.0，win64-only） | `5f60ca78c0a799d7fd50dd4f98fa535ed1ceda2979e618f3e1883400bc34b89d`（18,117 B） |
| model_id / provenance | `fc.pem.fmu_l1`（A-3 自述）/ `fmu_l1_lumped_unvalidated`（Q2(A) additive 档位——§7 例外行） |
| 构建命令（钉） | `python -I tools/backend/fmu/build_fmu.py --gcc <gcc.exe>`（gcc -std=c99 -O2 -ffp-contract=off -fno-fast-math——WinLibs GCC 16.2.0 UCRT/SEH r3，sha256 校验 3c693050…；Q10=(c) win64 单平台先行） |
| 重钉纪律 | 编译器/平台矩阵变更 ⇒ 产物字节变更 ⇒ 本表重钉须 CHG（fmu_runner FC_FMU_SHA256_PINNED 常量同步） |
| 校验面 | fmu_runner.run_fc001_shell 装载前强制校验（不符即拒——R-G9-03 前置） |

**冻结声明**：本清单自登记起为后端适配实现的准入事实源；与 RFC v1.1 冲突时以本清单为准
（本清单即 RFC 裁定的实施细则）。**文件结束**。2026-10-30。（§10 + §7 例外行 = 2026-11-18
CHG-20261118-01 ④ 授权修订——修订面仅此两处，其余条目零触碰。）

## 11. GT-001 L1-FMU 镜像轨钉 hash（GTFMU-G2b-04，CHG-20261119-01 ④ 授权修订）

| 项 | gt001_l1_v1.fmu（thermo） | gt001_comb_l1_v1.fmu（comb 深化） |
|---|---|---|
| **fmu_sha256（钉，现行——CHG-20261127-01 linux64 重钉）** | `08cfd649ac5b267d0bc4c093af8828b04e5dc6f75dbd39469ea400a223ac7f95` | `06d2c9f87182d4d9f14b9e8e547d620dbcdaa947aab8240dc00ab83fb9c8fd1d` |
| 字节（现行） | 23427 | 23909 |
| fmu_sha256（历史钉值 v1.12.0–v1.16.0，win64-only） | `db966da9c8c8d70dae5bd7f871641ecf31b836073f9cf0afc0b7ff7b891f88e8` | `fc2289a2eabb393e06ca2513fb79c4a59cb7235fae754812d66eeceff98a8684` |
| 字节（历史） | 17811 | 18064 |
| model_id | gt.sync.fmu_l1 | gt.sync.fmu_l1 |
| provenance | fmu_l1_lumped_unvalidated（§7 例外行 B-2 扩域） | 同左 |
| 构建 | gcc -std=c99 -O2 -ffp-contract=off -fno-fast-math（WinLibs GCC 16.2.0 UCRT/SEH r3） | 同左 |
| parity | 散差 ~2.5e-4（pow 跨 libm——R-1；×≥10 冻结制 gate 值远在 T-B 内） | 同左 |
| 重钉纪律 | 编译器/平台矩阵变更 ⇒ 产物字节变更 ⇒ 本表重钉须 CHG | 同左 |

## 12. linux64 平台矩阵重钉（D-12，CHG-20261127-01 授权——A-7「重钉须 CHG」兑现；V1170_WAVE_DESIGN DEC-2）

| 项 | fc001_l1_v1.fmu | gt001_l1_v1.fmu | gt001_comb_l1_v1.fmu |
|---|---|---|---|
| **fmu_sha256（钉，现行）** | `259e2cc1c46e239da74bacabc075a40fc0b151bc3ed0b05b6e371a219da71ef6` | `08cfd649ac5b267d0bc4c093af8828b04e5dc6f75dbd39469ea400a223ac7f95` | `06d2c9f87182d4d9f14b9e8e547d620dbcdaa947aab8240dc00ab83fb9c8fd1d` |
| 字节 | 24,117 | 23,427 | 23,909 |
| 包内成员（固定序） | modelDescription.xml → binaries/win64/fc001_l1.dll → binaries/linux64/fc001_l1.so → model_manifest.json | 同构（gt001_l1） | 同构（gt001_comb_l1） |
| linux64 `.so` sha256 | `ef2ce5ae…edd326`（17,384 B） | `afbe6edc…eb7d1e`（17,352 B） | `550cba37…10f020`（17,360 B） |
| win64 条目 | **逐字节保留**（成员内容与 v1.16.0 包逐字节相同——dll / modelDescription.xml 零变化） | 同左 | 同左 |
| manifest 变化 | additive 键 `build_toolchains`（win64 + linux64 编译器身份与参数） | 同左 | 同左 |
| linux64 构建 | `python -I tools/backend/fmu/build_fmu.py --gcc gcc --platform linux64 [--gt]`——gcc 13.3.0（Ubuntu 13.3.0-6ubuntu2~24.04.1）/ glibc 2.39；参数 = 钉死 CC_FLAGS + `-fPIC` / `-lm` | 同左 | 同左 |
| win64 构建 | 命令逐字不变（`--platform` 缺省 win64；WinLibs GCC 16.2.0 UCRT/SEH r3） | 同左 | 同左 |
| parity（linux64） | **0.0**（5 Run；门 1e-9） | **2.548e-4**（12 Run 双包合计；门 1e-3——与 win64 同量级） | 同左 |
| 非支持平台 | parity 脚本：包内无当前平台二进制 ⇒ `status=skip` exit 3；run-g2 记 skipped（不 fail、不计通过） | 同左 | 同左 |

**重钉同步面**：`fmu_runner.py` `FC_FMU_SHA256_PINNED` / `GT_FMU_SHA256_PINNED`（旧值注释留痕）+
`tests/backend-bridge.test.js` FC 三处断言（收敛为单常量 `FC_FMU_PIN`）；`tests/bundle.test.js:284`
为证据包往返夹具（非钉值校验）——维持原值不动；golden 文件不含包哈希——**16 golden 字节零触碰**。

**可复现性**：Linux 上以 v1.16.0 形态（仅 win64 成员、无 build_toolchains 键）重新打包，三包 sha256
与历史钉值 5f60ca78… / db966da9… / fc2289a2… **逐字节一致**（证据 `evidence/g8/v1170-release.md` §2）——
zip 成员 `create_system` 固定 0 消除宿主差异。darwin64 / `.dylib` 维持不纳入（R-L64-03）。


## 13. TL-001 联合轨 FMU 钉 hash（GTLJ-G2b-04 C99/FMU 链，CHG-20261127-05 授权——V1180_WAVE_DESIGN R2-1…R2-6）

| 项 | gt_tl_joint_l1_v1.fmu |
|---|---|
| **fmu_sha256（钉，现行——v1.18.0 linux64-only）** | `290ea21f301115c12443dcf5b3a878fb20b896071580b27b3ccd6f677a8be6ed`（8,778 B） |
| 包内成员（固定序） | modelDescription.xml → binaries/linux64/gt_tl_joint_l1.so（`12a80d78…9615f4`，17,408 B——两次构建同哈希）→ model_manifest.json |
| model_id / provenance | `gt.sync.tl.l0`（= parity golden `gt_tl_joint_v1` 的 model_id——FMU 先例「manifest id ≡ golden id」）/ `fmu_l1_lumped_unvalidated` |
| golden 关系 | **golden 层不依赖本 FMU 工件**（规格 §1.2 澄清——R2-1）：gt_tl_joint_v1 由 oracle emit；本包仅服务 C↔golden parity |
| VR 契约 | 输入 demand_kW / u_eff_kW / p_elec_scale / **line_open**（R2-2 规格偏离登记）+ 参数 delta0_rad；输出 f/T3/δ + 代数链 + P_elec / V_gen / ω |
| 构建 | `python -I tools/backend/fmu/build_fmu.py --gcc gcc --platform linux64 --tl`（GCC 13.3.0 / glibc 2.39；钉死 CC_FLAGS + -fPIC / -lm） |
| parity（linux64） | **0.0**——8 Run × 29 列 139,432 值逐位相同（含 -0.0 符号）；门 **1e-9**（R2-3：实测 0 ⇒ 1e-9） |
| win64 | **暂缺**（V1170 DEC-4 / V1180 R1-3：用户 WinLibs 构建后随下一版本发布并重钉本表；此前 Windows parity 记 SKIP） |
| 重钉纪律 | 编译器/平台矩阵变更 ⇒ 产物字节变更 ⇒ 本表重钉须 CHG（fmu_runner `GT_TL_FMU_SHA256_PINNED` 同步） |
| 校验面 | fmu_runner.run_gt_tl_joint_shell 装载前 admit() + 钉值强制校验（不符即拒） |

## 14. provenance 档位正式化（v1.19.x 治理波，CHG-20261128-02——V1190_WAVE_DESIGN G7）

`fmu_l1_lumped_unvalidated` 自本节起为**正式档位**（不再挂 §7「例外行」）。正式档位全集：

| 档位 | 含义 | 使用面（2026-11-28 实读） |
|---|---|---|
| `analytical_demo` | 浏览器引擎解析/集总行为级演示 | 前端 Run（src/core） |
| `numerical_simulation` | 后端黑盒数值仿真（准入 A-4：须 self_declared=true） | 后端适配器 Run |
| `fmu_l1_lumped_unvalidated` | 已批 FMU 轨 L1 集总参数模型（FMI 2.0 CS 内核 + manifest 自述；数值与实现自洽 only，未经实验/硬件验证） | FMU 包 4（fc001_l1 / gt001_l1 / gt001_comb_l1 / gt_tl_joint_l1）+ golden 5（fc001_fmu_v1 / gt001_fmu_v1 / gt001_fmu_comb_v1 / mg001_v2 / gt_tl_joint_v1） |

**新增档位纪律**：新档位须经 CHG 写入本表（不再走「例外行」路径）。**机检面不变**：fmu_admission `admit()`
现行不机检 provenance（docstring 注记照旧）；本节为文字正式化，零代码变更。

