# G8 发布证据 — v0.6.1（C-2 编排器骨架 + D-1 tier 分层 + B-1 PV-001 草案与双路评审）

> **发布**：v0.6.1（CHG-20261104-09）｜ **授权链**：V06_ROADMAP v1（CHG-20261104-08，
> DEC-1…7 按推荐）→ 用户「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务」。
> **执行方式**：动态工作流（dwfrun-cdfff72c，三阶段 7 路 + 门禁修复环），基线 5b6caac。

## 1. 交付物

| 工作项 | 交付 |
|---|---|
| S1 C-2 场景 core（DEC-1/DEC-6、I-6） | `src/core/scenario.js`：parseScenario（封闭白名单：目录/参数 min-max-step 域/0.1s 网格/t_clear 仅 GT actuator/≤12 事件/未知字段拒绝/结构化错误）、scenarioHash（键序不敏感 canonical、归一化幂等、元数据不入哈希）、executeScenario（逐事件经 createConfig→createRun，不新增执行语义）+ FL/FC/GT 可执行样例；`tests/scenario.test.js` 48 负例类+roundtrip+执行等价+字段完整性：**230/230** |
| S2 D-1（DEC-3） | `tools/run-g2.mjs`：25 步 tier 标签（core 19+extended 6）+ `--tier core\|extended\|all`（默认 all 步面与 HEAD 逐项比对零变化）+ 报告分层小计（只增字段）+ I-7 步数账注释与 FATAL 护栏；`D1_LITE_ASSESSMENT.md` §7 实施追记 |
| S3 B-1 草案 | `NEXT/PV001_G2B_SPEC_DRAFT.md`：PV-001 L0 定义提案（P_mpp=k·G·φ_T + MPPT τ=1.0s + 理想逆变器/平衡馈线，无 load→MPPT 边=不可调度结构签名）、2 故障族（G_sensor_bias/shading_step）、锚点解析预填（临时 Python 双口径复算，差 ≤8.9e-15）、golden 计划（4 Run/schema v2/verify_golden 注册面勘正）、排期 PV-G2b-01..04、8 风险 |
| S4 C-2 UI | `src/ui/pages/scenario.js` + shell.js 07 页接线 + index.html 装载 + store.js addScenarioRuns（不抢 activeRun）+ `css/scenario.css`：导入（文件+粘贴）→ 校验展示 → 只读事件卡序列 → 运行场景 → 结果摘要（Scen 前缀）→ 导出 roundtrip；零构建 ES2020；CDP 真实 Chrome 手工走查 17/17（含 0 console error、run_hash 刷新恢复） |
| S6 B-1 双路评审 | A 路 **PASS_WITH_CONDITIONS**（锚点全量独立复算通过；4 条件）/ B 路 **PASS_WITH_CONDITIONS**（5 条件）——已登记草案 §10/§11 并升 v0.2（C-1…C-7 处置表；**批准留待用户**，DEC-2） |
| S5 门禁接线 | scenario.test.js 入 run-g2 第 26 步（core 层）；步数账 25→26（I-7 预算 ≤27 兑现） |

## 2. 验证

- `node tools/run-g2.mjs` **26/26 PASS**（工作流内 + 主流程复验 20474 ms 两次独立，报告含 tier=all 分层小计 core 20/extended 6）；
- `--tier core`（20 步）/`--tier extended`（6 步）分跑通过；`--tier bogus` exit 2 显式拒绝；
- `node tests/scenario.test.js` 230/230（复跑两次逐字节相同=确定性）；copy-guard 33 模式 0 命中；
- B-1 锚点独立复算（评审人 A 独立上下文）：逐项复现。

## 3. 覆盖口径

本波零 golden 重出、零 engine.js 物理面改动（DEC-7）；C-2 编排面为新增文件+最小接线
（scenario.js/pages/shell/store/index/css）；PV-001 全场景 classify 现返回 extension_preview
（scope.js:82 fall-through），未进入任何验收路径。

## 4. 已知事项

1. scenario.js 未并入 tests/core-load.js CORE_FILES（测试按 arena.test.js 同款 (0,eval) 自装载——并发波隔离；S5 已接线 run-g2，CORE_FILES 并入留待下次波）；
2. FaultLab.html（单文件构建物）未重打包——本波接线以 index.html 为源；重打包属发布/打包步骤；
3. `--tier` 仅支持空格分隔形态（`--tier=core` 走缺参 exit 2 显式失败，不静默）；
4. Arena 「默认入池」口径勘正与初值决策点（PV-DRAFT-Q2）等 7 条件见 PV001 草案 §11——批准前必决。

**发布门**：G7（run-g2 26/26）✅ → G8（本证据）✅。批准人：用户（CHG-20261104-08 授权链）；记录人：实现 Agent。
