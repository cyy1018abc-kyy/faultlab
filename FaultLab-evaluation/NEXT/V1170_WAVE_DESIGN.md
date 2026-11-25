# V1170_WAVE_DESIGN — v1.17.0 波设计（linux64 前置 + 版本单源 + TL-001 实现轮）

> **性质**：阶段设计文档（Lead 起草，2026-11-25）——v1.16.0 发布（bb5b667）与 TL-001 G2b
> 草案轮收口（d9cb06f）后首波。
> **授权记录（CHG-20261125-01）**：用户 2026-11-25 指令「进入下一阶段的方案设计，与我讨论」→
> 讨论稿四项裁定点 + 余 Q 点 →「全部采用推荐」——**DEC-1…5 全采推荐项**；同指令链批准
> TL001_FMU_G2B_SPEC_APPROVED v1.0（R-TLFMU-01..03）、LINUX64 R-L64-01..03、V2 R-V2-01..04。
> **输入**：V08_ROADMAP v4 §3 v1.17.0 行 ｜ TL001_FMU_G2B_SPEC_APPROVED v1.0 ｜
> LINUX64_PLATFORM_ASSESSMENT（+ §5 裁定）｜ evidence/g8/linux64-feasibility-20261125.md ｜
> V2_CONVERGENCE_PRE_RESEARCH（+ §5 裁定）。

---

## 0. 本波边界

**做**：
1. **D-12 linux64 平台矩阵**（波首项，串行前置）：三现有 FMU 包增 `binaries/linux64/*.so`；
   `build_fmu.py` 平台分支；V312 重钉；parity 脚本非支持平台 SKIP 语义；Linux 下 run-g2 37/37；
2. **版本单源**（小项）：应用版本号单一定义点 + 一致性测试，消除 README / index.html /
   界面显示三处漂移（v0.5.0 滞留 11 个发布的教训——本会话 f22677c/22d1cae/5586a1e 修补）；
3. **A-11 TL-001 实现轮**（GTLJ-G2b-03/04）：`gt_tl_joint_oracle.py` + `gt_tl_joint_v1` golden
   （8 Run / 30 列 / schema v2 / T-B）+ verify_golden 注册 + C99 联合内核 `gt_tl_joint_l1.c`
   （[f,T3,δ] RK4）+ 引擎 `simulateJoint` + TL-001 SystemDef + parity 步（37→38）+ adapter；
   全部按 TL001_FMU_G2B_SPEC_APPROVED v1.0 §1–§9 与 §12 定案执行；
4. **v1.17.0 发布**：additive minor（G7 → G8）。

**不做**：v2.0.0 breaking 窗口（R-V2-01 不排程）；darwin64 / .dylib（R-L64-03 暂不纳入）；
TL 线路过载故障族（规格 §0 显式缓做）；联合模式下垂调速器形态（§3.3 平衡流形维持现文——
登记为远期候选，须另立 Q/CHG）；C3 真 TESPy（挂起维持）；MG/PV/WT FMU 轨（不预设）。

**版本**：v1.17.0（MINOR——新平台二进制 + 新系统/联合 golden 均为 additive；零 breaking）。

## 1. 决策点（全采推荐项）

### DEC-1：排程 = D-12 前置串行，A-11 随后
**采纳（推荐）**：V08 §3 原排「A-11 + D-12 同波并行隔离」修订为**串行**——D-12 先落地。
**理由**：A-11 新增 C99 联合内核与 parity 步；本项目开发会话运行于 Linux 云端容器，win64-only
现状下 parity 步在开发环境恒 FAIL（2026-11-25 实测 35/37），新内核 parity 无法在开发环境闭合。
D-12 先行后，全量门禁可在开发环境 37/37，A-11 的 38 步门可原地验收。D-12 仍为独立平台工作流、
独立验收（不与 A-11 验收链耦合）——只改先后，不改隔离。

### DEC-2：linux64 构建路线与打包
**采纳（推荐）**：
- **路线 (e) 云端 Linux 开发容器原生 gcc**（评估 §2 外新路线——可行性实测见
  evidence/g8/linux64-feasibility-20261125.md：三内核编译通过，fc001 parity 0.0、gt001 parity
  2.548e-4 < 1e-3，与 win64 同量级）；(c) Docker 保留为用户本机复现备选；
- **打包 = `.so` 并入现有三 `.fmu`**（`binaries/linux64/<modelIdentifier>.so`——FMI 2.0 多平台
  单包惯例；win64 条目逐字节保留）；
- **重钉面（须本 CHG 授权——A-7 原文「重钉须 CHG」兑现）**：三包 sha256 → `fmu_runner.py`
  `FC_FMU_SHA256_PINNED` / `GT_FMU_SHA256_PINNED` + V312 §10/§11 钉值行（旧值保留为历史行）+
  `tests/backend-bridge.test.js` 三处断言；`tests/bundle.test.js:284` 为证据包往返夹具（非钉值
  校验）——维持原值不动。golden 文件不含包哈希（实读核对）——**16 golden 字节零触碰**；
- **编译器身份入 `model_manifest.json`**（平台 → 编译器版本/flags 记录，additive 键）；
- **`build_fmu.py`**：additive `--platform linux64`（CC_FLAGS 平台分支：+`-fPIC`、链接 `-lm`；
  win64 路径逐字不变）；
- **parity SKIP 语义补全**：包内无当前平台二进制 ⇒ `status=skip`（exit 3——与脚本头注既有
  SKIP 语义对齐），不再记 FAIL；run-g2 步数 37 不变。

### DEC-3：版本单源
**采纳（推荐）**：新增应用版本单一定义点（`APP_VERSION`，落点实现时定——须为经典脚本 IIFE、
零依赖）；`shell.js` 三处显示读该值；新增一致性测试（README 标题 / `index.html` meta /
`APP_VERSION` 三者一致，不一致 exit 1）。**纪律**：`APP_VERSION` 与 `engine_version`
（run_hash 输入）严格分离——**不进入任何哈希输入**，五类哈希零变化。若新增脚本文件致
`FaultLab.html` js 计数 37→38，于发布证据登记。

### DEC-4：A-11 实现边界 = 规格 v1.0 定案全集
**采纳（推荐）**：GTLJ-G2b-03/04 按 TL001_FMU_G2B_SPEC_APPROVED v1.0 §12 定案执行（Q1 单转子形
… Q13 fmu_l1_lumped_unvalidated）；随批打包义务（规格 §5/§8⑤）：EVENT_KEYS +1（line_fault）、
docs/FAULT_CATALOG.md §9 TL-001 章、runHashInput systems 数组（Q5——additive，既有 Run 哈希零变化
须实证）、verify_golden 注册行 + DEFAULT_MODELS 尾追加、`_rad_s`/`_rad` 条件分派支（既有路由
零变化证明义务）、run-g2 步账 37→38。
**联合内核 win64 二进制**：新内核 `gt_tl_joint_l1` 的 linux64 `.so` 于本容器构建；**win64 `.dll`
由用户 Windows 工具链（WinLibs GCC 16.2.0，与既有三包同链）构建并实测 parity**——不在 Linux 上
mingw 交叉编译（避免同一平台两条工具链）。win64 构建前该包仅含 linux64 条目，Windows 上 parity
步按 DEC-2 SKIP 语义记 skip（非 FAIL），发布证据显式登记。

### DEC-5：门禁与三不承诺
**采纳（推荐）**：既有 16 golden 字节零触碰；五类哈希既有输入零变化（runHash systems 数组须
additive 且对单系统 Run 逐位不变——I-11 bitidentity 12/12 复验）；既有 37 步判据零翻转（parity
两步由 Linux 下 FAIL → PASS 属平台补齐，不属判据翻转）；新增第 38 步 = 联合 parity。

## 2. 波次派发（串行——DEC-1）

```text
S1 D-12 linux64：build_fmu.py 平台分支 → 三包注入 .so → 重钉（runner/V312/bridge 测试）
   → parity SKIP 语义 → run-g2 37/37（Linux）→ 小收口 commit
S2 版本单源：APP_VERSION + shell 读取 + 一致性测试 → build.py → file-smoke/e2e
S3 A-11 GTLJ-G2b-03：gt_tl_joint_oracle.py（出生接入 + GLJ-1…7 自检 + 容差实测冻结）
   → gt_tl_joint_v1 emit（8 Run）→ verify_golden 注册 + 分派支
S4 A-11 GTLJ-G2b-04：gt_tl_joint_l1.c + simulateJoint + TL-001 SystemDef + 联合 shell
   → gt_tl_joint_parity.py + run-g2 第 38 步 → adapter → FAULT_CATALOG/EVENT_KEYS/runHash
S5 门禁：build ×2 + run-g2 ×2（Linux）+ verify_golden 全行 + copy-guard + I-11 bitidentity
   + ui-walkthrough；win64 dll 由用户构建后 Windows 侧补跑 run-g2（DEC-4）
S6 收口：v1170-release.md + V1_FACES 增节 + V08_ROADMAP 对账 + CHG 收口条 + commit + push
```

各 S 段独立提交（会话上下文预算降级先例：CHG-20261119-09-A——段间可跨会话承接）。

## 3. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | 重钉后 Windows 侧既有流程（bridge 测试/证据包夹具）失配 | 重钉面逐处清单（DEC-2）；bundle 夹具不动；Windows 侧回归由用户在 S5 补跑 |
| 2 | 联合内核 win64 二进制滞后 | DEC-4：SKIP 语义显式登记；发布证据标注 win64 parity 待补 |
| 3 | runHash systems 数组扰动既有 Run 哈希 | additive 形态 + I-11 bitidentity 12/12 + 全 golden verify 兜底（规格 R-8） |
| 4 | 规格 §10 R-1…R-10（sin/pow 散差、守卫失效、域越界等） | 按规格缓解列执行；超限停下显式 CHG，不静默调门 |
| 5 | 实现轮体量大（L+L） | S3/S4 分段提交、可跨会话；每段自带门禁 |

**文件结束**。V1170_WAVE_DESIGN v1（2026-11-25，CHG-20261125-01 批准，按推荐执行）。
