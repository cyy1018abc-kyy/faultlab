# V04_RELEASE_PLAN — FaultLab v0.4.0 发布规划

> **任务**：用户 2026-10-31 指令「进行 v0.4.0 的发布规划」。
> **性质**：规划文档（Lead 建议稿）——批准后由记录人登记 CHG 并按队列逐项派发。
> **版本定案建议**：**v0.4.0**（minor——新功能首次进入发布物：GT-001 正式、FC-001 正式、
> 后端对照框架、评测轨框架；无架构重构、无 breaking change、EvidenceBundle v1 兼容）。
> **记录**：Lead，2026-10-31。

---

## 1. 发布定位

v0.3.x 系列完成了 G0–G8 门禁 + 三队列 + V3-04 升正式。v0.4.0 是**第一个承载产品功能增补的
minor 版本**——把 v0.3.1 之后积压的"已实现但未对外"的能力打包发布，同时收拢 V0.3 规划的
最后一里（GT UI 深化、评测轨扩容、FMU 路线推进）。

### 1.1 已在树上的（v0.3.1 后提交，随 v0.4.0 发布）

| 提交 | 内容 | 状态 |
|---|---|---|
| `51d69ac` | **V3-04 FC-001 升正式**：model_version 1.1.0、scope=approved_fc、golden 重发 | ✅ 已验证（109/109） |

### 1.2 v0.4.0 新增工作项（待实现）

| # | 工作项 | 来源 | DoD 摘要 | 规模 | 门禁 |
|---|---|---|---|---|---|
| W-1 | **GT-001 UI 深化**：系统页/首页 GT 卡片标注与文案正式化（W-11 过渡态解除）；因果页 GT 模板已改通道差叙事（v3-33），需 UI 走查确认渲染 | G2b v1.1 §7 条件 7 | GT 系统卡 tagline 含 L0b 标签、因果页 6 节点+通道差叙事可见且无 undefined、四禁词 copy-guard 33 模式 0 命中 | S | G7 |
| W-2 | **FC-001 UI 升正式**：首页/系统页 FC 卡片「扩展系统→已验收系统」标注更新（scope=approved_fc）；对比页 FC Run 可选择为试验 | V3-04 | FC 卡片文案含「正式验收（1.1.0）」、对比页 FC Run 可选取、scope-guard approved_fc 断言保持 | S | G7 |
| W-3 | **FMU ctypes runner**：`tools/backend/py/fmu_runner.py`（FMI 2.0 CS 最小加载器：zipfile 解包 + ctypes 加载平台二进制 + doStep 循环）；`fmu_admission.py` 增 runner 集成（通过准入的 FMU 可产出 Run）；**需实际 FMU 样本或参考 FMU 测试** | D-27 推进 | 有 manifest 的样例 FMU 可经 bridge→createFromParts 产出 Run；无样例时准入层已有（FS-1…3）且 runner 标注「待样本验证」 | L | G7 |
| W-4 | **评测轨场次扩容**：`arena2-session.mjs` 支持 `--agents all`（全 Agent 参赛）与多场次脚本；评测轨 README（参赛者接入指南） | 协议 v2 QP-2/QP-3 | 3+ Agent 参赛、场次归档含 README 与复核命令 | M | G6 已闭 |
| W-5 | **对比页后端面板深化**：后端 Run 可选为基准/试验；对比 incomparable 时的用户引导文案 | FL-19 增量三反馈 | 后端 Run 出现在对比选择器（scope=extension_preview）；incomparable 时提示含 backend.id | S | G7 |
| W-6 | **README / 文档发布同步**：版本号、系统卡、评测轨接入指南、V02_UPSTREAM_ERRATA 交叉引用 | 发布标准 | README 全文一致、版本号三处同步 | S | G8 |

### 1.3 明确不做（v0.4.0 范围外）

- FC-001 的 load_step / actuator_fault 扩展（各自 G2b 未启动）；
- FL-001 actuator_fault 升正式（G2b 未启动）；
- L1 数值模型（PyBaMM 等科学建模纵深——Q-4 守卫）；
- 服务端/云/账户/排行榜（V0.2 §12 退出条件，永久不做）；
- B-2/B-3 依赖 import（许可证待核实——Q-4 守卫 2）。

## 2. 门禁结构

| 门禁 | 管什么 | 关闭条件 |
|---|---|---|
| G7（实现集成门） | W-1…W-5 实现增量 | run-g2 全绿（24→26 步）+ copy-guard 0 + E2E 40 断言基线不回退 + 新增测试全过 |
| G8（发布门 v0.4.0） | 版本发布 | G7 关闭 + 版本号三处同步（v0.4.0）+ README/页脚 + 标签 + 双浏览器走查 + 就绪检查单 + CHG |

## 3. 执行队列（批准后按序派发）

| 序 | 工作项 | 依赖 | 前置 |
|---|---|---|---|
| 1 | W-1 GT UI 深化 + W-2 FC UI 升正式 | 无（G2b/V3-04 已闭） | 纯文案/标注/测试更新 |
| 2 | W-5 对比页后端面板深化 | 无 | compare.js 已有面板骨架 |
| 3 | W-4 评测轨场次扩容 | 无（协议已批） | arena2-session.mjs 扩展 |
| 4 | W-3 FMU ctypes runner | D-27 样本或参考 FMU | 最长杆——尽早启动 |
| 5 | W-6 文档同步 | 全部完成后 | 发布前收尾 |
| — | G7 → G8 | 全部 W 项 | 发布门 |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | FMU 样本不可得（无 MATLAB 导出） | W-3 标注「待样本验证」先行合入 runner 骨架；不影响其余项发布 |
| R-2 | GT 因果页通道差叙事渲染回归 | W-1 含 UI 走查截图；arena.test 155/155 与 causal-rules.test 64/64 既有覆盖 |
| R-3 | approved_fc scope 新增后 store/compare 适配遗漏 | scope-guard.test 24/24 既有覆盖 + W-2 新增对比页测试 |
| R-4 | 评测轨扩容引入 score_hash 不一致 | 协议 v2 canonical_json 已冻结（§4）；perf.mjs 哨兵步守护 |

## 5. 发布清单草案（G8 v0.4.0）

1. 版本号三处同步（index.html / shell.js / README）→ **V0.4.0**；
2. 标签 `v0.4.0`；
3. README §1 范围行改「v0.4.0 minor：GT-001 正式、FC-001 正式、后端对照框架、评测轨框架」；
4. `evidence/g8/v040-release.md`（验证摘要 + 工作项清单 + 偏差登记）；
5. run-g2 最终 24+ 步全绿（dirty=false）；
6. 双浏览器走查（Chrome/Edge 各 E2E 40/40 + 截图）；
7. CHG 登记。

---

**文件结束**。V04_RELEASE_PLAN v1（2026-10-31）。批准后按 §3 队列逐项派发。
