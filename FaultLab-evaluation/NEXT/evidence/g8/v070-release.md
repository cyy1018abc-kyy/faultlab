# G8 发布证据 — v0.7.0（PV-001 全链 + C-3 教学路径 + C-4 排行榜 + D-4 性能基线 + A-4a GT-L1 草案轮）

> **发布**：v0.7.0（CHG-20261104-11）｜ **授权链**：V070_WAVE_DESIGN（CHG-20261104-10，
> DEC-1…8 按推荐 + PV-001 G2b 批准登记）→ 用户「统一采用推荐决策，采用并发多个子智能体来加速任务」。
> **执行方式**：动态工作流 dwfrun-c8e209c4（五阶段 13 路；配额中断一次后恢复续跑，零沉淀损失），基线 77ec96b。

## 1. 交付物

| 工作项 | 交付 |
|---|---|
| T1 PV-G2b-01（DEC-1） | `PV001_G2B_SPEC_APPROVED.md` v1.0（更名自 DRAFT v0.2）：C-1…C-7 定案逐条落正文（EQ-PV-4 初值 P_pv(0)=k·G0·φ_T、Q1 终裁、SERIES_IDS 18 项含 t、Arena 勘正+DEC-2 显式排除、「不是能量损失」措辞、自查表闭合、排期增列）；§10/§11 保留 v0.2 历史记录 |
| T2 PV-G2b-03（DEC-3） | `tools/oracle/pv001_oracle.py`（EQ-PV-1..7 全实现、foStep 同构+更新序冻结、PS-1..7、4 Run、SERIES_IDS=t+17、schema v2 全量元数据、gate T-A+形制补键 I_A_rtol/atol 同值 gt001_v2 先例、approval 首签引 CHG-20261104-10）；**pv001_v1 emit**（sha256 df944f13…）+ sidecar；`verify_golden.py` 纯追加 pv001 注册行（参数化零改动）；`FAULT_CATALOG.md` §6 PV-001 节 |
| T3 PV-G2b-04a | `systems.js` PV-001 SystemDef（七组件/17 信号/2 族/EQ-PV-1..7 含 Q2/assumptions 九条/limitations 七条+PV-IMP-Q1 钳 0/锚点/双因果模板/注册表）+ 共享 UNITS 增 irradiance；`engine.js` simulatePV001（foStep 同构+Q2+钳 0）+ **分派链显式 PV 分支（R-4 守卫）**+ PV-only 校验分支（shading_step 白名单/initial 键面 SOC 分支——bounds 派生，三系统行为逐字等价）+ TARGET_SIGNAL/EVENT_TYPE/applyNoise fixup/buildCausalFacts；`metrics.js` FOCAL_SIGNAL+四标量（与 verify_golden scalars 同名）；`schema.js` UNIT_DICT 增 W/m²。验证：四场景锚点与规格 §3 全一致（69/69）、golden 交叉核对 128/128 零漂移、CDP 走查第四系统卡 17/17 零 console error、五测试全绿（10179/114/339/294/203） |
| T4 PV-G2b-04b | `tests/engine-pv.test.js`（149 断言：4 Run T-A 逐点+25 scalars、A/B/C 锚点、shading 两模式逐位等价、**R-4 GT 分派守卫+三系统 sanity**、健康局恒等、**DEC-2 Arena 源级守卫**）；scenario/schema 测试增 PV 用例；`src/ui/pages/arena.js` systemList 显式过滤 PV-001（DEC-2） |
| T6/T-UI C-3（DEC-5） | `src/core/teaching.js`（3 路径×5 步预设：传感器故障→闭环→仅监测→因果→评测入口；validateTeachingPath+getTeachingPaths+exportTeachingPath 信封）+ `src/ui/pages/teaching.js`（08 页：路径卡/步骤卡/深链/评测场景草稿经 sessionStorage→scenario 页最小读取入口）+ CSS 接线；tests/teaching.test.js **161/161**（含 33 模式子串自检+探针反证） |
| T7/T-UI C-4（DEC-6） | `tools/leaderboard.mjs`（三层参与者 id 解析、4 类跳过计数、avg_score 降序+并列细则、JSON+MD 输出、固定措辞）+ `src/ui/pages/leaderboard.js`（09 页 EXT：文件导入→schema 校验→只读渲染，浏览器不重排）+ 测试 **78/78**；真实场次实跑（eval-session-001：3 参与者 99.2/98.8/46.0 与 README 场次结论一致） |
| T8 D-4（DEC-7） | `tools/perf.mjs` 扩展：CDP 采样旅程（主旅程重走+两 ≥3s rAF 帧窗）→ 基线 3 轮（17.52/19.81/19.06 MB，fps 59.9）→ 阈值冻结 heap ≤120 MB / fps ≥41.93（常量+注释+登记 2026-11-05）→ 两轮复测稳定 → 最终连续 3 次全 PASS；报告 perf.baseline 块只增字段；不可测降级路径（gated=false+WARN）已实现 |
| T9/T10 A-4a（DEC-4） | `GTL1_G2B_SPEC_DRAFT.md` v0.2（450 行草案 + 双路评审记录 + 7 条件处置追记 §11-a）：EQ-GTL1-1…12（压气机/燃烧室/透平稳态效率链+摇摆接口）、三轨 inertia_model 推荐、L0b↔L1 分歧预期表、gt001_v3/T-B 计划、TESPy 对照轨道（GPL 隔离）；评审 **A:PASS_WITH_CONDITIONS（3 条件）/B:PASS_WITH_CONDITIONS（4 条件）**——批准下轮 |
| T5 接线 | run-g2 26→**28** 步（+verify_golden pv001 + engine-pv，均 core 层）；I-7 预算 ≤29 兑现 |

## 2. 验证

- `node tools/run-g2.mjs` **28/28 PASS** 两次独立（工作流内 + 主流程复验 31479 ms——perf 采样窗为 DEC-7 固有代价）；报告 tier=all 分层小计含新步；
- verify_golden：pv001（4 Run，25 checks）exit 0；fl001/fc001/gt001 各 exit 0（**既有 4 golden 字节零变更**，gt001_v2 sha c50315c9… 维持）；
- copy-guard 33 模式 0 命中；e2e 主旅程 PASS（新增两页不破坏）；teaching 161/161、leaderboard 78/78、engine-pv 149 断言全绿。

## 3. 覆盖口径与残留观察（诚实登记）

1. **PV quality 检查锁定状态**：checks.js 通用 soc-bounds/energy-balance 对 PV Run 判 fail（PV 无 SOC 序列/E_bat 指标）——checks.js 在本波开放面外，engine-pv.test §4 以「当前锁定状态」断言固化；PV 专属 PHY 检查须显式 CHG（建议 PV-G2b-04c，v0.7.x）；
2. **schema 导出面缺口**：validateScenarioConfig 要求 initial_SOC_pct → PV Run 经 bundle/protocol 校验报 CN-E02（T3 遗留缺口③）——须 R-8 显式 CHG（v0.7.x）；
3. **home/compare/causal/scenario 静态文案与指标组缺口**（T3 遗留缺口④⑤：三系统标题、PV 卡 L0b fallback、故障原理图 FL 静态示意、METRIC_PICK 无 PV 键等）——v0.7.x 实现面清单已登记；
4. **既有缺陷（非本波引入）**：signals.js mount 后 page section display:block 残留（CSS 同特异性覆盖，DOM 探针证实）——留主线裁定；
5. scenario.js:139 未知系统错误文案未含 PV-001（陈旧文案，功能无影响）；
6. PV 解析闭式 vs 引擎子步浮点差 ≤8.88e-14（T-A 内，逐位口径如实登记为容差内非零差）。

## 4. 预期失效面

新增 pv001_v1(+sidecar)；model_hash 因 UNITS 字典增项而数值变化（无任何处锚定具体值，golden 零变更维持）；PV-001 classify=extension_preview（fall-through 零改动）；Arena 显式排除（DEC-2 源级守卫）；core.test 系统数断言 3→4、scenario 负例 N08 改用 XX-999（注册面演进）；既有三系统 Run 数值逐位不变（engine-gt 203/engine-fc 294/engine 339 全绿）。

**发布门**：G7（run-g2 28/28）✅ → G8（本证据）✅。批准人：用户（CHG-20261104-10 授权链）；记录人：实现 Agent。
