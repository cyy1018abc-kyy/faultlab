# G8 发布证据 — v0.9.0（B-3 草案轮 + A-5/C-5/D-5 + 残留三项清算 + v1.0 收敛准备）

> **发布**：v0.9.0（CHG-20261108-02）｜ **授权链**：V090_WAVE_DESIGN（CHG-20261108-01，
> DEC-1…8 按推荐）→ 用户「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务」。
> **执行方式**：动态工作流 dwfrun-9a8cae8b（三阶段 9 路），基线 85f5c80。
> **推送状态：用户裁定三批同批暂缓延续（v0.7.1+v0.7.2+v0.8.0+本波，将来同批推送）。**

## 1. 交付物

| 工作项 | 交付 |
|---|---|
| T1 B-3 MG-001 草案（DEC-1） | `MG001_G2B_SPEC_DRAFT.md` v0.1：**聚合层复用推荐**（engine 内组合 simulatePV001/simulateWT001、oracle 导入 pv001/wt001 冻结模块——不建第四物理栈，备选涟漪登记）；EQ-MG-1…9 **全代数零新 ODE**；孤岛=「脱离主馈线的功率平衡重整演示」（I-5 红线专项自查表）；4 族（load_step 有符号域含 O-13 语义差异声明/pv_shading_link/wt_gust_link/**island_event 零参数族+t_clear 重连**）；锚点五 Run 预填（并网 ΣP_source+P_grid=P_load/孤岛 ΣP_source=P_served+P_dump，r≡0，96/96 独立复算）；golden mg001_v1 提案（5 Run、聚合确定性复算器、MS-1…8 含复用一致性 emit 硬条件）；MG-DRAFT-Q1…Q7（Q1 推荐 island_event 族形态——SOC 闭式性决定性论据） |
| T2 A-5 探路评估稿（DEC-2） | `A5_MULTIPHYSICS_EXPLORATION.md`：三系统 L1 耦合深化提案（FC 电化学 V-I+温度 P1 → FL η_cap(T)+R_int 二次项 P2 → GT 燃烧延迟 τ_comb P3，各含涟漪面/新 id/golden 影响/G2b 前置）；**推荐时点全部 v1.0 后**（四理由：契约冻结窗口/I-7 预算/两波治理节奏/A-4 反哺观察窗）；**L2 不做清单确认**（三处原文引用+逐条理由） |
| T3 D-5 插件评估稿（DEC-4） | `D5_PLUGIN_ARCHITECTURE_ASSESSMENT.md`（392 行）：三面评估（SystemDef/ScenarioTemplate/EvalAgent——「插件化只省数组加一行这一最便宜环节，G2b/V312 式准入成本照付」）；**推荐 v1.0 不做插件化** + TR-1/2/3 触发条件 + **运行期代码装载列为永久排除项**；I-1/I-4/I-5 相容性分析 |
| T4 C-5 场景共享落地（DEC-3） | `scenario.js` exportScenarioEnvelope（{kind:'faultlab.scenario',version,content_checksum,scenario}——确定性、元数据不入校验和）+ importScenarioEnvelope（信封/裸 JSON 双格式 back-compat、checksum 不符=结构化错误不静默放行）+ 场景页信封导出/导入 + **docs/SCENARIO_SHARING.md**（威胁模型声明：closed-world 白名单即安全边界、无签名非来源认证）+ scenario 测试 **351 断言**（+30 信封用例：roundtrip/篡改拒绝/back-compat） |
| T5 残留三项清算（DEC-5） | ① `tools/file-smoke.mjs` 固化（61 断言=e2e 镜像 57+file:// 专属 4）**入 run-g2 第 31 步**（core 层）——终结两轮临时件重建；② engine.js buildCausal **thermo_track 运行期自动挂载**（GT+thermo+非 none Run 挂 causal.thermoTrackCard 附加字段；**主链 family 分派零变化**——避免 core.test 既有断言破坏，与 V090 §3 预期失效面一致；run_hash 不含 causal，golden 冻结不受影响）+ causal-rules 测试 120→**149**；③ `tools/ui-walkthrough.mjs` 五系统深度走查 **50 断言**固化（不进 run-g2，发布轮手工规程登记） |
| T6 v1.0 收敛准备（DEC-6） | `docs/V1_FACES.md`（424 行）：八契约面盘点（**golden schema v2=唯一标冻结面**；SystemDef/scenario/oracle_base/eval protocol/scope/步账/copy-guard=演进中 additive-only）+ SemVer breaking 政策（哈希面=breaking 判定）+ v1.0 收敛核对表（11 项：**8 达成/2 发布轮动作/1 残留待裁定，无阻塞缺口**）+ 双重声明「准备清单不构成冻结，冻结动作=v1.0 发布 CHG」 |

## 2. 验证

- `node tools/run-g2.mjs` **31/31 PASS** 两次独立（工作流内 + 主流程复验 54504 ms——含 file-smoke 新步）；
- **golden 零变更**（8 golden 字节冻结）；engine.js 改动仅 thermo_track 挂载面（主链分派零变化断言佐证）；
- copy-guard 0 命中；file-smoke 61/61、ui-walkthrough 50/50、causal-rules 149、scenario 351 全绿；
- B-3 锚点 96/96 独立复算（源轨调用冻结 pv001/wt001 oracle 复用不重推 + MG 聚合代数；复用交叉 E_pv=0.1341667/E_wt=0.218959 与源 golden 逐位一致）。

## 3. 批准轮修订清单（B-3 MG-001 双路评审条件——用户裁定输入）

**A 路（4 条件）**：A-1（P1）gate 补 `I_A_rtol:1e-12/I_A_atol:1e-15`（verify_golden T-A V-05 无条件消费，四 T-A golden 先例全带键；修 gate 不修码）；A-2（P2）§3.5 SOC(60) 包络更正 [−0.3333,+100.3333] pp（SOC0=100∧P_bess=−8 为域内可达角点）；A-3（P2）包络行改标「参数域叉积包络」+增 UI 单 Run 可达包络行；A-4 MG-G2b-03 oracle 独立性声明采用「源物理复用委托」形制（跨 oracle import 显式授权+MS-3 逐位审计+不 import src/**）。

**B 路（6 条件）**：B-1 §6.3 I-5 自查表第 2 行改真实口径（保护/检同期词面限于 limitations）；B-2 MS-3 核对面表述统一（采强者：源通道序列 ≤1e-12）；B-3 「verify_golden --all」改实机制（无 --all；mg001 为 per-model 第 32 步）；B-4 scenario.js 系统枚举文案修复扩两处（:150/:157 均缺 WT-001）；B-5 §6.1 引用 V06 原文并注明 I-5 口径改写覆盖；B-6 实现时点建议 **v1.0.x 首项**（V1_FACES 面① additive-only 使冻结后落地干净），终裁归用户。

## 4. 新增登记（诚实口径）

1. **thermoTrackCard 实现为附加字段**（非主链替换）——主链替换将破坏 core.test 既有断言（:626/:634/:664 主链节点数），与 V090 §3 预期失效面自述一致；systems.js thermo_track 卡自述文本已过时（「不是运行期模板」），留下一波清算；
2. **FaultLab.html 未重打包**（V090 §3 预定：本波无 UI 页面新增；工件内 engine 无 thermoTrackCard 挂载面，file-smoke 61 断言不触该面，随下次重打包自然收敛）；
3. **e2e E-04 偶发抖动观察**：后台高载下 900ms 播放窗偶发未过（单独复跑 57/57；全量门禁无并发负载干净通过）——门禁执行规程参考：避免与重负载任务并行跑门禁；
4. T6 新增残留两项登记：scenario.js 枚举文案缺 WT-001（×2 处）、teaching/leaderboard 测试未入 run-g2 步账（v1.0 发布轮裁定）；
5. T6 验证性 run-g2 core 冒烟覆写 tracked 工件已还原为 HEAD 内容（最终全量门禁收敛）。

## 5. 预期失效面

run-g2 31 步（file-smoke 新步）；thermo GT Run 的 causal 附 thermoTrackCard（数值零变化、run_hash 不含 causal）；场景页导出格式升级为信封（裸 JSON 导入 back-compat 保留）；**零 golden 变更、FL/FC/GT/PV/WT 物理面零触碰**（21 测试文件全绿佐证）。

**发布门**：G7（run-g2 31/31）✅ → G8（本证据）✅。批准人：用户（CHG-20261108-01 授权链）；
记录人：实现 Agent。**推送按用户裁定三批同批暂缓。**
