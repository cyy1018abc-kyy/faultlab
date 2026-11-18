# v1.10.0 发布验收记录（G7→G8 — 2026-11-18，CHG-20261118-02）

> **门禁**：G7（回归，run-g2 36 步——parity 步显式申报 35→36，I-7 CHG 随波）→ G8（发布门）。
> **性质**：版本发布验收 = 内部一致性与可复核性证据，**不是模型验证、不是物理守恒验证、
> 不是硬件验证**。FMU 轨声明随发布材料保留：`model_provenance=fmu_l1_lumped_unvalidated`、
> `model_validation=not_performed`、`hardware_verification=not_performed`——**行为与数值
> 集总参数演示模型（未经实验/硬件验证）——数值与实现自洽 only**。
> **授权**：V1110_WAVE_DESIGN v1（CHG-20261118-01——用户「执行」指令链：G2b-04 解锁杠杆
> 授权 + §8 清单执行授权）。
> **验收日期**：2026-11-18 · 记录人：Lead Agent（V1110 承接会话）。

## 1. 门禁全表（全部真实运行）

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1766.8 KiB**（css=10 js=36——+2 = fc001-fmu-adapter.js + causal-rules.js） |
| 2 | `node tools/run-g2.mjs` ×2 独立 | **均全部 PASS exit 0**（122145 / 118862 ms）——**36 步**（35+1：parity 步第 36 步 PASS 999 ms——SKIP 语义在产物缺位环境记 skipped） |
| 3 | `python -I scripts/verify_golden.py` 逐模型 ×11 + 默认六 | **12 次调用全 exit 0**（fc001_fmu V-01…V-09 全过——V-03 oracle 字节哈希一致（e09090e2…——实现纪律：oracle 文件在 golden 锚定期零触碰）） |
| 4 | copy-guard | **PASS 43 patterns 0 命中**（Q11 四词入表 39→43——词表单调不减；teaching.test.js 镜像同步 43） |
| 5 | oracle 自检 | `fc001_fmu_oracle.py --self-check` FMU-1…7 全过（文件字节冻结——未触碰） |
| 6 | **R-G9-02 parity（C↔Python）** | `python -I tools/oracle/fc001_fmu_parity.py` **PASS——全 5 Run × 21 列 × 601 点散差 = 0.0**（规模相对误差；-ffp-contract=off + 表达式树逐字对齐成效）；gate 冻结记录：实测 0.0 ×≥10 = 0.0（1e-9 承诺维持） |
| 7 | **R-G9-03 确定性** | fmu_runner 三次连续执行输出文件 SHA-256 逐字节一致（`338e5d369a246e2f` ×3）；run_hash 五 Run 恒等 |
| 8 | **D-27 关闭** | doStep 路径经 fc001_l1_v1.fmu 实测验证（fmu_runner FR-3-d27-closed） |
| 9 | FMU 准入 | fmu_admission admit() = admitted=true（A-1/A-2/A-3 过——model_id 自述 fc.pem.fmu_l1）；装载前 SHA-256 对 V312 钉值强制校验 |
| 10 | 既有 13 golden 字节冻结 | **零触碰**（git status data/golden/ 零修改——实现纪律：fc001_fmu_oracle.py 一次误编辑当场拦截回退，V-03 复验通过） |
| 11 | 测试面 | run-g2 全套全绿——compare.test.js **27/27**（含 cross_fidelity 谓词 8 断言）、plants.test.js **116**（含 FMU adapter 8 断言 + 因果规则 2 断言）、bundle.test.js **38**（含 fmu_sha256 条件字段 3 断言）、arena-protocol-negative **97/97** |

## 2. 交付清单（APPROVED v1.0 §8 FCFMU-G2b-04 逐项）

1. **工具链供给**（DEC-1）：WinLibs GCC 16.2.0 UCRT/SEH win64 r3——官方 GitHub release zip
   + **官方 sha256 校验通过**（3c69305081e4… = 发布清单值）；提取 `C:\Users\amdir\.zcode\
   toolchains\winlibs-gcc-16.2.0\`（用户态可逆，仓库外，零系统 PATH/注册表写入）；构建
   命令显式传 gcc 路径（build_fmu.py --gcc）；
2. **C99 内核** `tools/backend/fmu/fc001_l1.c`（FMI 2.0 CS 最小合规面 + 5 态 RK4 δt=0.01
   子步/Δt=0.1 通信步展开；只暴露 input/true 输出——I-3 认知分离：传感/控制/残差/事件
   分裂全归 host）+ `modelDescription.xml`（VR 0..17 契约）；
3. **FMU 打包** `data/fmu/fc001_l1_v1.fmu`（18,117 B；FMI zip 布局 + model_manifest.json
   Q-5 八字段；固定时间戳字节确定性——两次打包同哈希 ✓）——**fmu_sha256 =
   5f60ca78c0a799d7fd50dd4f98fa535ed1ceda2979e618f3e1883400bc34b89d**（V312 §10 钉 hash——
   CHG-20261118-01 ④ 授权修订；fmu_runner 装载前强制校验）；
4. **fmu_runner.py 扩展**：ctypes SetReal/Reset + run_fc001_shell（I-11 壳：传感污染/
   控制反馈/残差 host 职责 + pre/post 左极限分裂——事件分裂零内核内嵌；确定性输出
   零墙钟字段）+ **R-G9-03** + **D-27 关闭**（FR-3-d27-closed）；
5. **parity 机检** `tools/oracle/fc001_fmu_parity.py`（64 位解释器定位 + 子进程 runner +
   冻结 oracle 只读 import；SKIP 语义：产物/64 位解释器缺位 ⇒ skip 不 fail）——
   **run-g2 第 36 步**（35→36 显式申报，CHG-20261118-01 ③）；
6. **V312 修订**（§10 钉 hash 表 + §7 provenance 例外行）+ fmu_admission A-4 docstring
   同步（评审 B P3-6 处置）；
7. **产品面 additive**：`src/core/plants/fc001-fmu-adapter.js`（预烘焙 golden 兜底装载
   + bridge 探针——fetch 调用方注入：core 零网络 API 直调；golden 校验三拒绝面：轨锚定/
   schema/approval）+ `src/core/causal-rules.js`（FC_RULE_01..06 逐字声明注册——数据面）
   + engine.js compareRuns **cross_fidelity_l0_vs_l1_fmu 谓词**（comparison_kind additive
   字段 + 跨保真警示——既有 P0 关系零变化；actuator 结构性排除由 sameFaultConfig 天然
   承载）+ index.html/core-load.js 注册；
8. **UI 文案**：零新增 UI 句面（adapter 无新页面承载——§6.3 终检 = copy-guard 43/0 实跑）。

## 3. additive 三不承诺兑现

- **五类哈希既有合法输入零变化**：fc001_fmu_v1 runHashInput 既有清单零新增键；adapter/
  causal-rules 零哈希面触碰；compareRuns 仅 additive 字段（comparison_kind）；
- **既有 13 golden 字节零触碰**（git status 实证）；fc001_fmu_oracle.py 字节零变更
  （V-03 锚定面——误编辑当场拦截回退）；
- **35 步判据零翻转**：+1 步为纯新增（parity），既有步判据零改动。

## 4. 预期失效面兑现核对（V1110 §0 / APPROVED §4 项 12）

| 面 | 计划 | 实际 |
|---|---|---|
| fc001_l1.c / modelDescription.xml | Create | ✓ |
| .fmu 打包 | Create（V312 钉 hash CHG） | ✓ 18,117 B + §10 修订 |
| fmu_runner 扩展 | Update（壳 + pre/post + D-27） | ✓ |
| oracle parity | Create（独立机检） | ✓ fc001_fmu_parity.py |
| plants/ adapter | Update（fc001-fmu-adapter.js Create） | ✓ |
| causal-rules 注册 | 注册面 | ✓ src/core/causal-rules.js（新增声明面——实位勘误：原 spec 预设 compare.js/causal-rules.js 均与仓内现实有差，实落点随本波登记） |
| compare 谓词 | 注册面（实位 = engine.js compareRuns——勘误⑤(c) 再校正） | ✓ |
| copy-guard | 四词入表 | ✓ 39→43 |
| EvidenceBundle fmu_sha256 | additive 条件字段 | ✓ + 三断言 |
| run-g2 步账 | 35→36 | ✓ parity 步 |
| UI 文案 | §6.3 终检 | ✓ 零新增句面（43/0 实跑） |

## 5. 发布定位

FaultLab v1.10.0 = 八面冻结下第十个 additive/minor 发布——FC-001 L1-FMU 轨从 oracle/golden
面扩展到 **C99 内核 + parity + adapter 全链**（三层夹心架构完整落地）；C↔Python 散差
0.0（数值与实现自洽）；**不代表**真实设备或物理模型已完成验证；FMU 轨全部输出 synthetic。

**文件结束**（2026-11-18，记录人：Lead Agent——V1110 承接会话）。
