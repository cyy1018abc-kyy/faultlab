# V3-11 FL-19 RFC 双路独立评审记录（草案 v1 → v1.1，2026-10-30）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.3 V3-11（评审对象 = `NEXT/FL19_BACKEND_RFC_DRAFT.md`）。
> **方法**：双路独立上下文 Agent 对抗评审（红线 5：G6 评审默认双路；评审员互不可见；只读）。
> **评审输入**：RFC v1 + MODEL_VALIDATION_SPEC / DATA_CONTRACT_SPEC / DECISIONS / SCOPE_SPLIT_MEMO
> + engine.js/registry.js/bundle.js/export.js/scope.js + verify_bundle.py / run-g2.mjs / 测试断言面。
> **记录人**：实现 Agent（Lead 裁定与修订处置同日完成）。

## 1. 评审员与总判定

| 评审 | 视角 | 总判定 | 关键发现 |
|---|---|---|---|
| **A** | 物理/数值可信性 | **CONDITIONAL GO** | F-1 [BLK]：scope 机制自相矛盾——registry 对本地路径用 `classify(config)` 重算 scope，白名单配置的后端 Run 会被判 `approved_p0` 进入 P0 验收面，与 RFC 核心承诺相反；F-2 role 枚举冲突、F-3 verify_bundle 能力描述失实、F-4 双判定层容差不一致、F-5 声明制缺治理（自报宽容差即可全绿）、F-6 B-4 准入使现行措辞红线句失实 |
| **B** | 工程/数据契约 | **CONDITIONAL GO** | F-01 [BLK]：「仅增三字段+逐字节兼容 v1」与「backend 入哈希」互斥——run_hash 输入面是 G0-DEC-07 冻结项，入哈希 ⇒ 全部 v1 历史包无法复核；F-02 engine_version 语义未裁定（保持 '0.1.0' 则闸门不拦）、F-03 同返回结构主张不现实（causal/中文文案/ snapshots 无法由后端进程自然产出）、F-04 provenance 硬编码会污染后端包、F-05 回环 HTTP 的 CORS/CSRF 现实、F-06 verify_bundle 网格硬约束 |

两路**互不可见**；多项发现交叉印证（scope 矛盾 = A F-1 ≈ B F-11；role = A F-2 ≈ B F-07；
verify_bundle = A F-3 ≈ B F-08；容差判定层 = A F-4 ≈ B F-12①；哈希/CHG = A F-8 ≈ B F-01），
独立一致性提高了结论可信度。

## 2. 评审 A 发现项与处置

| # | 级别 | 要点 | 处置（v1.1） |
|---|---|---|---|
| A-F-1 | **[BLK]** | scope 机制矛盾（classify 重算 vs 强制 extension_preview） | **已修**：§1 明文受控扩展——backend Run scope 强制 extension_preview、优先级高于 classify、走 CHG + scope-guard 断言增补；golden 对照走 §5.3 专用步，不占应用内 approved 比对路径 |
| A-F-2 | [MAJ] | `role='backend_run'` 与冻结 role 枚举冲突；语义损失（对照矩阵依赖 role） | **已修**：删除 backend_run；role 沿用场景语义；后端身份只进 manifest.backend |
| A-F-3 | [MAJ] | §4 把 importBundle 流程安到 verify_bundle.py 上（后者仅 B-01…B-08 文件/结构层） | **已修**：§4 如实分工表述；离线重算列入 V3-12 准入清单 |
| A-F-4 | [MAJ] | 页面重算管线固定引擎门禁 vs §5.3 按声明容差判——B-5 系统性 quality fail | **已修**：§5.1 裁定 checks 判定感知 tolerance_profile；页面侧新增 vs-golden 校验器为 BK-E03 载体 |
| A-F-5 | [MAJ] | tolerance_profile 无 schema/无量化预算/V3-12 未冻结/B-1 档位错配 | **已修**：§5.1 逐字段表 + 量化误差预算 + V3-12 冻结不可运行时改值 + B-1 按 analytic_crosscheck rtol 1e-12 |
| A-F-6 | [MAJ] | B-4 准入使 §2.3/§9.2「无实测/FMU/Simulink 对比」措辞失实 | **已修**：§2 B-4 行 + §7：准入即触发对应 CHG 改写；UI 标签强制；三字段恒 not_performed |
| A-F-7/F-9 | [MIN] | 自引失效；「差异只体现在 timeseries 与 method_id」不成立 | **已修**（引用更正 + 结构层/数值层两层表述） |
| A-F-8 | [MIN] | backend/method_id 入哈希与 metrics.method 枚举需显式 CHG | **已修**：§5.2 裁定 backend 不入 run_hash（采纳 B F-01）；method 口径双显示规则入 V3-12 |
| A-F-10 | [MIN] | 「L1 通道」表述 + 适配器无 G2b 触发检查 = 先实现后评审通道 | **已修**：§7 Q-4 三条守卫（准入门绑定/许可前置/验收路径禁入） |

**Q-2/Q-3/Q-4 裁定建议**（已回写 RFC §7）：Q-2 有条件批准（四条独立性边界）；Q-3 否决
`numerical_demo`（复用既有 `numerical_simulation` 枚举）；Q-4 批准登记 + 三守卫。

## 3. 评审 B 发现项与处置

| # | 级别 | 要点 | 处置（v1.1） |
|---|---|---|---|
| B-F-01 | **[BLK]** | 「逐字节兼容」与「backend 入哈希」互斥（run_hash 输入面冻结，G0-DEC-07） | **已修**：裁定 backend **不入 run_hash**；兼容主张更正为「七文件结构不变、manifest.json 增 backend 对象、run_hash 输入面零改动」 |
| B-F-02 | [MAJ] | engine_version 语义未裁定：保持 '0.1.0' 则闸门不拦；改则 §5.2 失真 | **已修**：裁定 engine_version = 产生数值的实现版本（后端自有版本），闸门天然生效；compareRuns **零改动**，backend.id 仅 UI 预检 |
| B-F-03 | [MAJ] | 「同返回结构」不现实（causal/events 中文文案/snapshots/source_signal_ids 后端无法产出）；registry.createRun 硬绑 JS simulate | **已修**：§3.1 两级接口（后端 `produce` 产 t+signals+integrals；页面侧 `assembleRun` 复用 systems/metrics/checks 模块）+ registry `createFromParts` 原子入口（BK-E02 载体） |
| B-F-04 | [MAJ] | 组装链硬编码 analytical_demo/「非 Simulink」——数值后端包被错误标注 | **已修**：§4 条件化 provenance/data_kind/footer（按 Q-3 档位）+ CHG + copy-guard 允许串扩充 |
| B-F-05 | [MAJ] | 回环 HTTP 的 CORS 现实（必须响应头，属收窄非放开）；页面不能 spawn 子进程（stdio 只在 Node 侧）；CSRF 面 | **已修**：I-1/I-2 v1.1 安全条款（仅 echo 批准 origin + Origin/Sec-Fetch-Site 校验 + 会话 token；stdio 限工具链） |
| B-F-06 | [MAJ] | verify_bundle 硬编码 602 行/t=20.0——非 60s/0.1s 网格的后端包结构上不可验收 | **已修**：§5.3 验收场景锁定 golden 形状；dt 扩展列为候补不承诺 |
| B-F-07 | [MIN] | role 兼职两概念（同 A F-2） | 已修（同上） |
| B-F-08 | [MIN] | verify_bundle 能力边界（同 A F-3） | 已修（同上） |
| B-F-09 | [MIN] | run-g2 SKIP 盲区 | **已修**：§5.3 显式开关 `--require-backend` + skipped 计数 |
| B-F-10 | [MIN] | BK-E01 连接/计算超时混用 | **已修**：§6 拆分 BK-E01a（连接，退避 ≤3）/BK-E01b（作业，声明式）；simulate 不自动重试 |
| B-F-11 | [MIN] | scope 双真值源（同 A F-1） | 已修（同上） |
| B-F-12 | [MIN] | 四个归属问题（BK-E03 载体/后端 model_manifest 来源/noise 所有权/method 双口径显示） | **已修/入 V3-12**：§5.1 裁定 BK-E03 载体=页面侧 vs-golden 校验器；§7 Q-5 裁定后端 model_manifest 必须自述；noise 页面侧施加、method 双口径显示规则入 V3-12 归属表 |

**Q-1/Q-5 裁定建议**（已回写 RFC §7）：Q-1 回环 HTTP（安全条款按 B F-05 改写）；Q-5 强制
model_manifest 方准入，拒绝者仅「黑盒预览」且禁入对比结论。

## 4. Lead 裁定（记录人）

1. **采纳两路全部 BLK/MAJ**——v1.1 已逐条落位（上表处置栏），无未处置的 BLK/MAJ 文本项；
   MIN 项中 F-7/F-9/F-10/F-11 及 B-F-06/09/12 的文档层部分已顺手关闭，其余（B-05 参数化、
   scope-guard 断言、V3-12 归属表落地）推迟到实现期。
2. **两路建议的融合点**：Q-3 与 Q-5 的档位分歧按「不新增 provenance 枚举」统一——FMU 的
   已声明/未复核区分放 `manifest.backend` 自述 + UI 标签，不制造 `numerical_blackbox_declared`
   新档位（保住 A 的「防软化标签」结论，也满足 B 的「黑盒须自述」要求）。
3. **残留风险登记**：① scope 强制覆盖推翻「scope 由 classify 派生」的既有不变式，实现期必须有
   scope-guard.test.js 断言守护（V3-12）；② engine_version 语义扩展（「实现版本」）需
   DATA_CONTRACT_SPEC §1.1 措辞 CHG 同步，否则导出面（CSV 头/HTML 报告「引擎版本」）会展示
   后端版本号引起误读；③ B-1 的独立性天花板（同源推导，不构成方程级校核）必须随实现文案对外
   传达，防「第二实现=验证」误读。

## 5. 结论

> **V3-11 评审侧结论：CONDITIONAL GO（修订后放行）**——RFC v1.1 已吸收全部「G6 关闭前必须改」项；
> **G6-WS-C 关闭待用户批准**（批准时随 CHG 落 Q-1…Q-5 裁定 + DATA_CONTRACT_SPEC 措辞 CHG 条目）。
> 本记录不构成对后端适配实现的验收（实现属 G6 后另批，准入清单 V3-12）。

## 6. 复核入口

- RFC：`NEXT/FL19_BACKEND_RFC_APPROVED.md`（v1.1，含修订记录段；批准时由 FL19_BACKEND_RFC_DRAFT.md 更名，CHG-20261030-03）
- 关键代码锚点：`src/core/registry.js:46-58`（run_hash 输入面）、`registry.js:110`/`bundle.js:126`（scope 派生）、
  `src/core/engine.js:1410-1412`（engineVersion 闸门）、`engine.js:1076-1181`（causal 模板）、
  `src/core/bundle.js:134-135`（provenance 硬编码）、`tools/verify_bundle.py:17-19,101`（能力边界与网格硬编码）、
  `tools/run-g2.mjs:23-63`（SKIP 语义）、`src/core/scope.js:32-61`（classify）
