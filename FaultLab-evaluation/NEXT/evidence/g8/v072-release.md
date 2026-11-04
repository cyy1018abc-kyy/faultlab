# G8 发布证据 — v0.7.2（残留清算九项全清 + A-4b/A-4c/B-2 草案轮）

> **发布**：v0.7.2（CHG-20261105-02）｜ **授权链**：V072_WAVE_DESIGN（CHG-20261105-01，
> DEC-1…7 按推荐 + A-4c 裁定落地）→ 用户「先不推送；设计下一轮的长期方案，统一采用推荐
> 决策，采用并发多个子智能体来加速任务」。**推送状态：用户裁定暂缓（本提交留在本地，
> 与 v0.7.1 将来同批推送）**。
> **执行方式**：动态工作流 dwfrun-11360bb0（三阶段 13 路），基线 acddba2。

## 1. 交付物

### 1.1 残留清算（九项全清）

| 项 | 交付 | 验证 |
|---|---|---|
| 1 | checks.js soc-bounds/energy-balance 按 system.bounds 派生（PV 不派发）+ **PV 专属 PHY 检查 pv-energy-consistency**（E_pv_true+E_grid=E_load，容差 T-A E_kWh=1e-9；实测残差 0/0/0/5.551e-17） | engine-pv **166/166**（锁定态断言翻转+PHY 17 条新断言）、engine-gt 451、core 11147 全绿 |
| 2 | schema.js validateScenarioConfig initial 键面按 bounds 派生（PV 免 SOC_pct、G0_W_m2 域校验、scenarioView 补投）——FL/FC/GT 经 baseline 并跑探针**逐字等价**（12 正例+5 负例 JSON/问题列表/configHash 全等） | schema **227/227**（+2b 节 17 断言）、bundle 35、core 11147 |
| 3 | home.js 四系统化 + 徽章真实 level 前缀（PV→L0/**GT→L1 联带修正**）+ 故障原理卡通用化（FL/FC/GT 参数化图 + PV 声明性机制卡）+ scenario METRIC_PICK PV 键 + compare bySystem 指标组 | e2e **48/48**、CDP 走查 **50/50** 零 console error |
| 4 | signals.js 内层根 div 修复（消除 SPA 离开恒 block 残留缺陷）+ e2e E-09 深链残留面 8 断言（回退→咬合失败→重应用→48/0 闭环证明） | e2e 48/48 |
| 5 | CORE_FILES 并入 scenario.js/teaching.js（解除 (0,eval) 自装载遗留）+ **FaultLab.html 重打包**（1383.4 KiB、css=10/js=33、43 引用全内联；原产物为 2026-10-27 陈旧构建缺 15 个本波文件）+ file:// 冒烟 **57 断言 ×3 轮**（9 页 SPA/事件相位/golden 关键值/证据包往返/零 console error/file:// 会话恢复） | scenario 321、teaching 161 断言数与基线一致 |
| 6 | systems.js GT causalTemplates 增 thermo_track 静态叙事卡（跨深度 §3.2 数值）+ causal.js RESIDUAL_CANDIDATES 增 PV/GT-thermo 键 + **单位域缺陷修复**（f_channel_diff_Hz 原被硬编码 kW 代入功率分解式）+ teaching 增 path-gt-001-cross-depth 跨深度路径（5 步契约零破坏） | causal-rules/teaching 全绿 |
| 9 | TESPy 对照独立算例 `evidence/gt/tespy-independent-case.md`（stdlib 按 TESPy 文档口径复算设计点，GL-1 同判据 6/6 PASS；**结论只写稳态点一致性旁证，三标签不合并**；GPL 隔离；LICENSE 核实未执行如实登记） | 临时复算脚本已删 |

### 1.2 A-4b FL-001 热模型 G2b 草案（DEC-2，批准留待用户）

`FL001_THERMAL_G2B_SPEC_DRAFT.md`（547 行，DRAFT v0.1）：thermal_model off|on **默认 off**（P0
旗舰四理由 vs GT-L1 Q4 先例差异显式登记）；守恒面裁定推荐 (a) 进母线平衡（P_gen=P_load−
P_bat+P_loss、E_source+E_bat≡E_load+E_loss、SOC 零涟漪）；EQ-FLTH-1…9（教学参数 R0=0.2Ω/
α=0.01/K/C_bat=300J/K/h=10W/K 非实测显著标注）；锚点 RK4 预填（thermal on 四轨 T_bat(60)=
309.953229/303.419884/309.953229/302.770820 K；L0 轨零变化三层佐证 worst diff=0.0）；golden
fl001_v2（新 id）+ fl001_l1_oracle 计划；FLTH-G2b-01..04；评审 **A:PASS_WITH_CONDITIONS（4 条件）/
B:PASS_WITH_CONDITIONS（3 条件）**——批准轮修订清单见 §3。

### 1.3 B-2 WT-001 风电 G2b 草案（DEC-4，批准留待用户）

`WT001_G2B_SPEC_DRAFT.md`（576 行，DRAFT v0.1）：L0b 机械动态推荐（WT-DRAFT-Q3：解析气动
代数链嵌入低维非线性 ODE）；Cp 经验式（Heier 教学惯例）+ 三支路目标 min(k_opt·ω³, P_rated,
k_v·v_ctrl³) + 变桨一阶 + PV 同构馈线；3 族（v_sensor_bias——**v³ 目标律经复算证伪发散，注入
点推荐钳位+估计通道（Q1）**/pitch_stuck 位置强制（Q2 显式差异）/gust_step）；锚点复算（设计点
γ=1.0 闭合、14 点域扫描、gust 两模式逐位同解）；golden wt001_v1 5 Run 计划；评审
**A:PASS_WITH_CONDITIONS（3 条件）/B:PASS_WITH_CONDITIONS（4 条件）**——见 §3。

## 2. 验证

- `node tools/run-g2.mjs` **28/28 PASS** 两次独立（工作流内 + 主流程复验 35417 ms）；
- **golden 零变更**（6 golden + sidecar 字节未动）；零新仿真轨（engine.js 零改动）；
- copy-guard 0 命中；全测试面绿（core 11147/engine-gt 451/engine 339/engine-fc 294/engine-pv
  166/scenario 321/schema 227/teaching 161/leaderboard 78/bundle 35/compare 27/causal-rules 等）；
- file:// 冒烟 57×3、e2e 48/48（含新增深链残留断言）、CDP 走查 50/50。

## 3. 批准轮修订清单（四草案条件汇总——用户裁定输入）

**A-4b（A 路 4 + B 路 3）**：
- A-1 §3.4 两角点 P_gen 预填值修正（load0=45：6.769954→**21.769954**；load0=10：40.139754→**20.139754**）；
- A-2 FL-7 判据不得冻结预填值 5.68e-14 K（双实现散差×≥10 或 ≥1e-9 K；评审复算 1.46e-11）；
- A-3 涟漪表补 metrics.js:191 指标定义串 on 域变体 + acceptance.keyValues off 域专用声明；
- A-4 勘正四项 P3（损耗偏差 W 值/稳定性边界精确值 48.2843 kW/worst diff 措辞/verify_golden T-B 单位分支）；
- B-1 model_version 1.1.0 归一涟漪面（scope.js APPROVED.modelVersion 同步或声明不校验/旧存档
  重放拒绝预期/DATA_CONTRACT 与 MODEL_VALIDATION_SPEC 引用失效面入 FLTH-G2b-04）；
- B-2 FLTH-G2b-04 显式两门禁面：engine↔fl001_v2 T-B 比对面 + on 轨 P0 验收路由
  （cfg.thermal_model→golden 分派 off→fl001_v1/on→fl001_v2，v2 emit 通过前 on 轨不进 P0 验收）；
- B-3 verify_golden T-B 分支 r_true_kW 路由口径裁定。

**B-2（A 路 3 + B 路 4）**：
- A-1 β(20.0) 矛盾修正二选一（推荐 §3.2 改 β(20.0)=0.0（状态 pre）+ beta_stuck_deg(20.0)=16.5
  事件域信号——I_cap 先例）；
- A-2 λ_opt 依赖项 15 位登记重划（不可独立复现，改登记可达精度；五项可保留）；
- A-3 §3.5 包络按 UI 全域重述或限定 v0=9（v0=6+stuck85% 角点越所列界，稳定性裕度仍成立）；
- B-1 「非本机组实测」禁词命中改写 ALLOW 句式（§6.3 自查表更正）；
- B-2 d_wt_atol 死键删除或显式加分支工作面；
- B-3 exposure 三值映射工作面（WT-G2b-04，PV001 C-6 体例）+ 批准 CHG 更正行号引用；
- B-4 批准 CHG §7① 字面触发项闭合登记。

## 4. 新增残留登记（本波探针发现，须显式 CHG）

1. **faulted PV Run bias_A 分域缺陷**：schema.js:161-163 bias_A |b|≤20 A 检查把 PV 辐照度幅值
  （W/m²）按电流域处理——faulted PV Run 导出校验仍报 CN-E02（healthy 已由 R-8 修复）；
  修复需 bias_A 语义系统化分域（T2 探针首次实测确认）；
2. docs/CONTRACT.md §4.8 quality 检查「必含」措辞与 bounds 派生实现的口径差（文档面欠账）；
3. causalTemplates thermo_track 为静态叙事面（engine.buildCausal 按 family 分派不变——
  engine.js 本波零改动），运行期自动分派留后续。

## 5. 预期失效面

PV quality 检查锁定态 fail→pass（engine-pv §4 断言翻转）；**新建 PV Run config_hash/run_hash
变化**（scenarioView 补投 initial_G0_W_m2——inertia_model 先例；无冻结 PV 哈希断言，FL/FC/GT
哈希逐位不变）；修复前导出的旧 PV bundle 导入改报 G0 缺失（修复前本就无法导入，无工作流回归）；
FaultLab.html 字节变化（构建产物）；home 徽章/INTRO 文案变化；既有 FL/FC/GT 行为经 baseline
探针逐字等价。

**发布门**：G7（run-g2 28/28）✅ → G8（本证据）✅。批准人：用户（CHG-20261105-01 授权链）；
记录人：实现 Agent。**推送按用户裁定暂缓。**
