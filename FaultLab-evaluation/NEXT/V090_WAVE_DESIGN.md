# V090_WAVE_DESIGN — v0.9.0 实现波设计（B-3 草案轮 + A-5/C-5/D-5 + 残留清算 + v1.0 收敛准备）

> **性质**：阶段设计文档（Lead 起草，2026-11-08）——V06_ROADMAP v0.8.0 行顺延项（A-5/B-3/
> C-5/D-5，V080_WAVE_DESIGN DEC-3 登记）+ v0.8.0 残留三项清算 + **v1.0.0 收敛准备**。
> **授权记录（CHG-20261108-01）**：用户指令「设计下一轮的长期方案，统一采用推荐决策，采用
> 并发多个子智能体来加速任务」——**DEC-1…8 全采推荐项**；B-3 MG-001 只到草案+双路评审
> （**批准留待用户**，沿 PV-001/GT-L1 两波节奏）；A-5/D-5 为评估稿（不定实现）。
> **推送状态**：三批同批挂起延续（v0.7.1 4963e6a + v0.7.2 1331ed3 + v0.8.0 7002c7a；
> 远端 main=e017c4c 即 v0.7.0）——本波基线同样只提交本地。
> **输入**：V06_ROADMAP §2/§3 ｜ v080-release.md §4 残留清单 ｜ V080_WAVE_DESIGN ｜
> GTL1/FLTH/WT001/PV001 APPROVED v1.0（G2b 先例与 L1 制度）｜ V06_ROADMAP v1.0 行。

---

## 0. 本波边界

- **golden 零变更**（既有 8 golden 字节冻结）；**零新仿真轨**（B-3 只出草案；engine.js 改动面
  仅限 thermo_track 运行期分派小改——DEC-5）；
- **不做**：D-3 FMU（等样本）、L2（CFD/FEA/多体——不做清单确认）、云/账户（I-1）、插件化实现
  （D-5 仅评估）。

## 1. 决策点（已按用户指令全采推荐项）

### DEC-1：B-3 MG-001 微电网 G2b 草案轮（批准留待用户）

- 形态提案交草案：多源耦合（PV-001 + WT-001 + BESS（FL-001 电池面）+ 负荷）母线功率平衡
  抽象；「孤岛检测」教学点**表述为「脱离主馈线的功率平衡重整演示」**（I-5 红线：非电网保护
  验证）；层级（L0b/L1 混合）由草案 Q 点裁定（多源聚合 vs 各源既有轨复用——推荐**复用既有
  系统轨**的聚合层设计，避免第四套物理栈）；
- 规模 L；**本波只到草案+双路评审；批准与实现随用户裁定**（推荐：批准早则 v1.0 收敛前实现，
  否则 v1.0.x 首项）。

### DEC-2：A-5 多物理场探路 = 评估稿（不定实现）

- 评估稿 `NEXT/A5_MULTIPHYSICS_EXPLORATION.md`：三系统 L1 耦合深化提案——
  ① FL：T_bat→容量/内阻二阶效应（thermal on 轨已有 T_bat，深化为温度-容量折算）；
  ② GT：燃烧动态二阶状态（T3 已有，深化多状态燃烧延迟）；③ FC：电化学 V-I + 温度
  （A-4c 已裁自写 ODE 主路径）；各给 G2b 前置评估与**推荐时点 v1.0 后**；
- **L2 不做清单确认**（CFD/FEA/多体动力学维持不做——V06_ROADMAP §6）。

### DEC-3：C-5 场景共享落地（小项）

- 场景 JSON 导入导出已存在（scenario 页）——C-5 落地 = **导出信封标准化**
  （exportTeachingPath 先例：{kind,version,content_checksum}）+ 导入 closed-world 校验声明
  + 手动文件流转指南（EVAL_TRACK_GUIDE §6 体例）+ roundtrip 测试；不做云/账户（I-1）。

### DEC-4：D-5 插件架构评估稿（不定实现）

- 评估稿 `NEXT/D5_PLUGIN_ARCHITECTURE_ASSESSMENT.md`：SystemDef/ScenarioTemplate/
  EvalAgent 可注册化三面评估（现状=JSON+约定注册已覆盖多少、插件化收益 vs 攻击面/复杂度、
  准入审查成本）——**推荐结论：v1.0 不做插件化**，登记触发条件（外部 SystemDef 贡献出现时
  走 RFC）。

### DEC-5：v0.8.0 残留三项清算

1. **file:// 冒烟脚本固化**：新建 `tools/file-smoke.mjs`（v0.7.2/v0.8.0 两轮临时件重建的
   正式化，61 断言体例）+ **入 run-g2 第 31 步**（tier=core；发布能力面）；
2. **thermo_track 运行期自动分派**：engine.js buildCausal 按 inertia_model 轨分派
   （thermo Run 自动挂 thermo_track 卡；swing/linear 既有分派零变化）+ causal-rules 测试扩展；
3. **CDP 双浏览器深度走查固化**：`tools/ui-walkthrough.mjs`（v0.7.2 T3 体例 50 断言正式化，
   五系统覆盖）——**不进 run-g2**（耗时），作为发布轮工具 + 使用规程登记于证据模板。

### DEC-6：v1.0 收敛准备 = API 契约冻结清单

- `docs/V1_FACES.md`：列出 v1.0 将承诺冻结的契约面——SystemDef schema（含五系统实例）、
  golden schema v2（含 T-B 分支）、scenario schema v1（含 inertia_model/thermal_model 键）、
  oracle_base 契约、eval protocol v2、scope 三档、run-g2 步账门禁、copy-guard 词表——
  逐面标注「冻结/演进中/待定」与 breaking-change 政策；**v1.0 前置文档，不构成冻结本身**。

### DEC-7：步数账（I-7）

run-g2 30 → **31**（+file-smoke 第 31 步，core 层）；预算 ≤32 申报。

### DEC-8：push 状态

三批同批挂起延续（用户先前裁定）；本波产出将来同批。

## 2. 波次派发（并发子智能体）

```text
阶段一（并行 6）：T1 B-3 MG-001 草案 ｜ T2 A-5 探路评估稿 ｜ T3 D-5 插件评估稿
                ｜ T4 C-5 场景共享落地 ｜ T5 残留三项清算 ｜ T6 v1.0 冻结清单
阶段二（并行 2）：T7/T8 B-3 双路评审
阶段三：全量门禁 run-g2（31 步）+ ≤3 修复环
```

**文件面分配**：T1/T2/T3/T6 各自新文档｜T4=scenario 页信封+指南+tests｜T5=engine.js（分派）+
tools/file-smoke.mjs+tools/ui-walkthrough.mjs+run-g2.mjs+causal-rules.test——互不相交。

## 3. 预期失效面

thermo_track 分派：thermo Run 的 causal 卡从静态引用变自动挂载（教学面增强，数值零变化）；
run-g2 31 步（file-smoke 新步，file:// 冒烟从手工规程变门禁）；FaultLab.html 不重打包
（本波无 UI 页面新增——C-5 复用既有页；若 T4 需微调 UI 则重打包随 T4）。

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | B-3 草案规模（多源聚合 L 级）超本波消化 | 只到草案+评审；聚合层复用既有轨的推荐降低物理栈风险 |
| 2 | file-smoke 固化后 run-g2 时长增长（Chrome 启动） | 61 断言实测 <60s；预算 ≤32；必要时 tier=extended 裁定留 T5 |
| 3 | thermo_track 分派波及既有 GT Run causal 面 | swing/linear 分派零变化断言 + causal-rules 全量回归 |
| 4 | 四份评估稿/草案间口径漂移 | T2/T3 引用 T6 冻结清单口径；评审路 B 核对 |

**文件结束**。V090_WAVE_DESIGN v1（2026-11-08，CHG-20261108-01 批准，按推荐执行）。
