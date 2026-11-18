# V1110_WAVE_DESIGN — v1.10.0 实现波设计（FCFMU-G2b-04 完整执行：C99 内核 + 工具链供给 + parity + adapter/注册面）

> **性质**：阶段设计文档（Lead 起草，2026-11-18）——V1100 波（bb96fb1）后首波。
> **授权记录（CHG-20261118-01）**：用户 2026-11-18 指令「执行」——承接 V1100 收口报告的
> 解锁杠杆登记（「装好后按 APPROVED v1.0 §8 清单执行」）——**DEC-1…6 全采推荐项**。
> **输入**：FC001_FMU_G2B_SPEC_APPROVED v1.0（CHG-20261115-10——Q1…Q18 已定案冻结）、
> fc001_fmu_v1 golden（13 golden 字节冻结）、V312 清单（FROZEN——钉 hash 须 CHG）、
> 2026-11-15/16/18 三日工具链复测记录。

---

## 0. 本波边界

**做（= APPROVED v1.0 §8 FCFMU-G2b-04 全清单）**：
1. **工具链供给**（DEC-1）：用户态可逆安装 MinGW-w64（WinLibs 官方 release zip + 官方
   sha256 校验；路径与出处登记；不写系统 PATH/注册表——会话/构建脚本内传参）；
2. **C99 内核**：`tools/backend/fmu/fc001_l1.c`（FMI 2.0 CS 最小合规面 + 5 态 RK4 δt=0.01
   子步、通信步 Δt=0.1 内部展开；只暴露 input/true 输出——I-3 认知分离硬边界）+
   `tools/backend/fmu/modelDescription.xml`（VR 契约）→ 编译（**-std=c99 -O2
   -ffp-contract=off -fno-fast-math**——IEEE 序保持，parity 前提）；
3. **FMU 打包**：`data/fmu/fc001_l1_v1.fmu`（FMI zip 布局，固定时间戳字节确定）→
   SHA-256 → **V312 钉 hash CHG**（Q17——FROZEN 修订随本波）；
4. **fmu_runner.py 扩展**：ctypes 加载（SHA-256 对 V312 校验）+ I-11 壳职责（传感污染/
   控制反馈/代数残差/pre-post 左极限分裂——事件分裂不进内核）+ 5 Run 执行 + 确定性输出
   → **R-G9-03 三次执行恒等**；**D-27 关闭**（doStep 实测）；
5. **parity（R-G9-02）**：`fc001_fmu_oracle.py --parity`（C vs Python 逐点散差实测——
   规模相对误差 ≤1e-9 判据 + 实测 ×≥10 冻结 gate 值登记）；
6. **产品面 additive**：`src/core/plants/fc001-fmu-adapter.js`（bridge 客户端 + file://
   预烘焙 golden 兜底——G0-V05-DEC-01）+ `src/core/causal-rules.js`（FC_RULE_01…06 声明
   注册——数据面 additive）+ `src/ui/pages/compare.js` cross_fidelity_l0_vs_l1_fmu 谓词 +
   **copy-guard Q11 四词入表（39→43）** + teaching.test.js 镜像同步 + EvidenceBundle
   v1.1 `fmu_sha256` additive 条件字段（勘误②——五哈希零变化证明随测试交付）；
7. **run-g2 步账**：parity 独立步新增（**SKIP 语义显式**——编译产物缺位环境记 skip 不
   fail，V312 §9⑥ 先例）→ **35→36 步（I-7 显式申报随 CHG）**；
8. **门禁全量 + 发布**：build ×2 / run-g2 ×2（36 步）/ verify_golden 全注册行 / copy-guard
   43 patterns / 负例 97+ → v1.10.0 发布（MINOR——additive/minor 第十个波）。

**不做**：linux64 第二平台（Q10 = (c) 单平台先行，其余登记后补）、C3（挂起维持）、
第三方 L2 Agent 会话（eval-session-003+ 开放面——非本波）、既有 13 golden 字节触碰。

**版本**：v1.10.0（MINOR——adapter/rules 新文件 + copy-guard 增词 + bundle additive 字段
+ run-g2 +1 步；零 breaking——五类哈希既有输入零变化）。

## 1. 决策点（全采推荐项）

### DEC-1：工具链供给 = 用户态可逆安装（用户「执行」指令链授权）
**采纳（推荐）**：WinLibs 官方 GitHub release（GCC 16.2.0 UCRT/SEH win64）zip + 官方
.sha256 校验；提取至 `C:\Users\amdir\.zcode\toolchains\`（用户目录，仓库外——零仓库
污染，删除即回退）；**不写系统 PATH/注册表**——构建脚本显式传 gcc 路径（可复现命令
登记于构建脚本与 CHG）；出处（tag + 文件名 + sha256）登记本 CHG。

### DEC-2：Q10 平台裁定 = (c) 单平台先行
**采纳（推荐）**：win64（MinGW-w64 GCC）单平台先行；linux64/.dylib 登记后补（R-G9-03
钉 hash = win64 产物——平台矩阵扩张须重新钉 + CHG）。

### DEC-3：parity 归属 = oracle --parity 独立机检 + run-g2 SKIP 步
**采纳（推荐 = Q17(a) 定案兑现）**：parity 依赖编译产物——run-g2 新步
`fc001_fmu parity`：产物在位 → 实测判据；缺位 → **skip 记 fail=false + skipped 计数**
（V312 §9⑥ 先例——不 fail 不错报）。

### DEC-4：V312 修订 = 钉 hash + provenance 例外一次打包
**采纳（推荐 = 勘误②③ + Q2/Q17 打包）**：V312 清单文件显式修订（fmu_sha256 钉行 +
fmu_l1_lumped_unvalidated 例外行——Q2(A) 作用域限缩解释文字），随本波 CHG 授权；
fmu_admission A-4 docstring 同步修订（评审 B P3-6 处置）。

### DEC-5：adapter 形态 = Q13(a) plant adapter 层绑定
**采纳（推荐）**：场景零新键；adapter 预烘焙兜底 = data/golden/fc001_fmu_v1.json 只读；
bridge 路径按 bridge.py 既有安全边界（127.0.0.1 回环 + token）接线、产物缺位时降级
兜底（不静默——能力探针显式）。causal-rules/compare 注册按 §2.4/§2.5 逐字转写（含
勘误⑤(c) 实位路径）。

### DEC-6：步数账 = 35→36（parity 步）+ additive 三不承诺
**采纳（推荐）**：五类哈希既有输入零变化（fc001_fmu_v1 runHashInput 既有清单零新增键；
adapter/rules 零哈希面触碰）；既有 13 golden 字节零触碰；35 步判据零翻转（+1 步为纯新增）。

## 2. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | C-Python 散差超 1e-9（FMA/libm/运算序） | -ffp-contract=off -fno-fast-math + 表达式树逐字对齐 + 实测登记；超限停下显式 CHG 重议 R-G9-02（Q9 双向预案） |
| 2 | 供给的编译器可信性 | WinLibs 官方 release + 官方 sha256 校验 + 出处登记；用户态可逆 |
| 3 | .fmu 打包不确定性 | 固定时间戳 zip + 字节确定性验证（两次打包同哈希） |
| 4 | 步账扩张（I-7） | parity 步显式申报（本 CHG）+ SKIP 语义防环境碎裂 |
| 5 | V312 FROZEN 修订越权 | 本 CHG 显式授权打包（勘误②③ + Q2/Q17 定案兑现——修订面仅钉 hash 行 + 例外行 + A-4 docstring） |

**文件结束**。V1110_WAVE_DESIGN v1（2026-11-18，CHG-20261118-01 批准，按推荐执行）。
