# FaultLab V0.1 · QA 与验收报告

> 生成日期：2026-10-27 · 环境：Windows + Chrome headless（CDP）· 服务器：`python tools/serve.py`（127.0.0.1:4318）
> 数据性质：本报告验证的是**行为级（L0）解析模型演示**，不是 Simulink、不是硬件实测，也不是第三方认证。

---

## 1. 最终测试结果（全部通过）

| # | 套件 | 命令 | 结果 | 说明 |
|---|---|---|---:|---|
| 1 | 数值内核 | `node tests/core.test.js` | **PASS 10621 / FAIL 0** | FL-001 解析黄金值（19.9/20.0/21.5/26/60 s、电能、SOC、残差）、monitor、load_step、actuator、FC/GT 验收范围、守恒、哈希确定性、run 不可变、非法配置 |
| 2 | Agent Arena | `node tests/arena.test.js` | **PASS 155 / FAIL 0** | 同 seed 逐字节一致、盲观测隔离、fusion ≫ 弱基线、健康局误报约束、导出无真值泄漏、外部诊断 round-trip、三系统 |
| 3 | 规格 UX 流程 | `node tools/qa.mjs ux` | **14/14** | UX-01/02/03/06/07/09/10/12 + 因果六节点三层 + 601 点采样 + 控制台 0 error |
| 4 | Arena 端到端 | `node tools/qa.mjs arena` | **7/7** | 3 轮盲测、排行榜排序、fusion 优势、真值封存/解封、导出包无真值、页面揭晓 |
| 5 | 真实点击链路 | `node tools/qa.mjs ui` | **9/9** | 首页开始实验→系统页、切故障家族重建参数、创建运行、导航、曲线缩放、对比双屏、竞技场 |
| 6 | 边界与键盘 | `node tools/qa.mjs misc` | **9/9** | 传感器→曲线（UX-04）、+4kW 展开（UX-05）、SOC 放大（UX-08）、空格/方向键、刷新恢复、讲解弹层/假设抽屉 Esc、解释异常来源 |
| 7 | 独立 Python 预言机 | `python tools/oracle.py` | 一致 | 闭环 E_bat=0.123888889、E_source=0.376111111、SOC_true=59.690277778、SOC_est=59.579166667、SOC_err=−0.111111111 pp；monitor E_bat=0.166666667、SOC_err=−0.111111111 pp |

FL-001 关键数值与规格 §1 校准表一致（容差 1e-6）：`+4 kW` 仅作为**测量一致性残差**出现，真实功率守恒残差恒 ≈0。

---

## 2. 规格验收矩阵（摘要）

| 规格条目 | 覆盖方式 | 证据 |
|---|---|---|
| 五页面完整可用 | 导航 6 页（含 Arena 扩展）、hash 路由、跨页保留时间/选中/Run | `01-home` / `02-system` / `03-signals` / `04-causal` / `05-compare` / `06-arena` |
| 真值/观测/推断分离 | 每信号 `source_kind` + 全站来源标签；盲测封存 | `20-signals-table`、`24-signals-sealed`、`31-arena-sealed` |
| 20.0 s 事件不连续 | pre/post 快照、step 绘制、不跨阶跃平滑 | `04-causal`、`22-signals-soc-zoom`、`signals-click-07` |
| 仅监测 vs 闭环 | 独立 Run（role=contrast）、对比页可选为试验并加"刻意对照"说明 | `41-monitor-compare`、`52-compare-contrast` |
| +4 kW 正确解释 | 因果页展开：r_true / r_meas 公式与逐项数值，明确"不是能量损失" | `46-causal-residual` |
| 对比有效性 | 一致性检查、黄色警告、差值视图单位约束、缺失显示「不可用」 | `49-compare-invalid`、`45-compare-diff` |
| 导出可追溯 | CSV（601 行 + 哈希元数据）、配置清单、HTML 报告、证据包、分享摘要 | UX-10（qa ux）、`exports` 相关检查 |
| 三系统扩展 | FL-001 / FC-001 / GT-001，各 3 故障家族 × 闭环/仅监测 | `65-system-fc-final`、`66-system-gt-final`、`26-signals-gt`、`32-arena-gt` |
| Agent Arena（扩展） | 隐藏真值、5 个确定性 Agent、六维评分、排行榜、外部诊断导入 | `30-arena-final`、`33-arena-import`、`34-mobile-arena` |
| 无障碍 / 响应式 | 键盘快捷键、表格模式、焦点管理/Esc、reduced-motion、1440/1100/1024/390 | `20-signals-table`、`61-mobile-home-final`、`64-mobile-system-final`、`70-tablet-inspector-drawer` |

---

## 3. 截图索引（`artifacts/`）

**主流程（1440×960）**

| 文件 | 内容 |
|---|---|
| `01-home.png` | 实验首页（Hero、三系统卡、体验路径） |
| `02-system.png` | 系统交互图 t=21 s（拓扑/故障编排/检查器） |
| `03-signals.png` | 实时曲线（真/测/目标/偏置、事件线、快照） |
| `04-causal.png` | 因果解释（六节点三层、模板句、证据） |
| `04b-causal-lower.png` | 因果页下半（仅监测对照、+4kW、局限） |
| `05-compare.png` | 结果对比（Run 选择、一致性、指标卡） |
| `05b-compare-lower.png` | 对比页图表（叠加、事件分叉线、发现） |
| `06-arena.png` | Agent 竞技场设置 |
| `13-arena-results.png` / `30-arena-final.png` | 竞技场排行榜与逐轮揭晓 |
| `40-gt-actuator-fixed.png` | GT 执行器异常（双轴单位处理） |
| `41-monitor-compare.png` | 仅监测对照 vs 无故障基准 |
| `42-causal-final.png` / `43-compare-final.png` | 最终版因果/对比全页 |
| `44-compare-split.png` / `45-compare-diff.png` | 双屏 / 差值视图 |
| `49-compare-invalid.png` | 无效对比（黄色警告、差值禁用） |

**多系统与状态**

| 文件 | 内容 |
|---|---|
| `07-system-fc.png` / `65-system-fc-final.png` | FC-001 系统页 |
| `08-signals-gt.png` / `66-system-gt-final.png` | GT-001 曲线页 / 系统页 |
| `40-gt-actuator-fixed.png`、`48-causal-gt.png`、`32-arena-gt.png` | GT 执行器故障、因果、Arena |
| `20-signals-table.png` | 曲线页表格模式（变量名+单位+来源） |
| `21-signals-baseline.png` | 基准叠加（dotted + 45%） |
| `22-signals-soc-zoom.png` | SOC 纵轴放大（量程徽标、pp 说明） |
| `23-signals-selected-point.png` | 点击数据点元数据 |
| `24-signals-sealed.png` | 盲测真值封存态 |
| `31-arena-sealed.png` / `33-arena-import.png` | 盲测封存 / 外部诊断导入 |
| `60-home-final.png`、`67-home-intro.png`、`68-home-assumptions.png` | 首页最终版、快速讲解、模型假设 |
| `62-system-t0.png` / `63-system-t21.png` | 系统页 t=0 / t=21 对比（故障未激活/已激活） |
| `69-system-invalid.png` | 参数无效（逐条错误 + 禁用创建） |
| `90-offline-singlefile.png` | `FaultLab.html` 单文件离线渲染（file://） |

**响应式**

`10-mobile-home.png`、`11-mobile-system.png`、`12-mobile-signals.png`、`27-mobile-signals-full.png`、`34-mobile-arena.png`、`51-mobile-causal.png`、`61-mobile-home-final.png`、`64-mobile-system-final.png`、`70-tablet-inspector-drawer.png`、`71-home-1100.png`。

---

## 4. 已知限制（不阻塞 V0.1 交付）

1. **L0 模型边界**：所有模型为行为级/解析模型，不含开关动态、母线电容、电化学 OCV/温度/效率、保护逻辑；GT 频率/惯量为显式标注的降阶代理。UI 不展示未建模物理量。
2. **哈希语义**：浏览器端 SHA-256 仅证明导出内容一致性，不是防篡改签名或第三方认证；导出包 `evidence_levels` 明确 `model_validated_against_experiment: not_performed`、`real_hardware_verified: not_performed`。
3. **Arena 为扩展预览**：内置 Agent 是确定性规则/统计算法，不是 LLM；比赛完成后真值保留在内存供揭晓；正式盲评需服务端封存（`docs/AGENT_PROTOCOL.md` 已说明 seed 可复现的边界）。
4. **计算状态瞬时**：模型计算毫秒级，真实用户路径几乎观测不到 `computing` 帧；页面已实现并防御该状态。
5. **执行器分类混合单位**：FC/GT 的 `%` 阀位与 `A/kW` 上限分别置于左右轴；当前场景全为 null 的分类显示占位提示（已在曲线页处理）。
6. **标签自动排布**：系统拓扑边标签为启发式避让；三系统当前采样下无重叠/裁切，若未来大幅修改坐标需重新核验。

---

## 5. 复现方式

```powershell
python tools/serve.py            # http://127.0.0.1:4318/
node tests/core.test.js
node tests/arena.test.js
python tools/oracle.py
node tools/qa.mjs ux
node tools/qa.mjs arena
node tools/qa.mjs ui
node tools/qa.mjs misc
python tools/build.py            # 重建单文件 FaultLab.html
```
