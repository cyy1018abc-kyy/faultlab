# V2_CONVERGENCE_PRE_RESEARCH — v2.0.0 收敛预研报告（C-8 / V1150 / CHG-20261119-09）

> **性质**：预研评估文档（Lead 起草，2026-11-20；V1150_WAVE_DESIGN C-8 / CHG-20261119-09
> DEC-3——D-10 兑现；**裁定留白章显式留用户**；不定排程）。
> **任务**：V08_ROADMAP 主线 C **C-8 行**「v2.0.0 收敛预研报告（八面冻结下的 breaking
> 候选清单 + V3 迁移义务草案 + 用户迁移成本评估）」。

---

## 1. 八面 breaking 候选清单

### 面① model registry

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| systemId 命名空间重构（TL-001/未来系统统一命名域） | 现有 GT-001/FL-001/FC-001 等引擎 SystemDef id 变更 → 所有 config/golden/run_hash 级联重出 | 全 15 golden 重出 + 全 UI/config 迁移指南 |
| multi-system 联合 Run 原生化（TL-001 RFC 方案 A 的永久化——systems 数组从 additive 升为 core contract） | config schema 变更 → scenarioHash 面变化 | 联合 golden 迁移 + 引擎 dispatch 面重构 |
| TL-001 SystemDef 正式化（从 extension_preview 升 approved） | scope.js 白名单变更 | TL-001 golden 从 backend/预览 → 正式验收路径 |

### 面② golden

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| golden schema v3（当前 v2 + V3 字段扩展：multi-system/multi-FMU/provenance 扩展） | 15 golden schema v2 → v3 | 15 golden 重出（**字节冻结约束下 = 全量重出**——approval 面重签）+ verify_golden 面全量适配 |
| FMU 轨 golden 原生化（backend/golden 交叉面正式化） | fmU golden 从并列轨 → 正式轨 | FMU 轨验收路由扩张（scope 变更） |
| golden 格式压缩（2373 KB×15 = 35 MB 仓库面——如需优化） | 格式变更 → run_hash 面 | 全 golden 重出 + verify_golden 兼容双格式 |

### 面③ scenario/config

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| config schema v3（systems 数组升 core contract——TL-001 RFC 方案 A 永久化） | config_hash 输入面变化 → 全部 run_hash 变化 | 全 golden 重出 + 引擎 dispatch 面重构 + 迁移指南 |
| config 键面清理（历史遗留键弃用） | 既有场景兼容面 | 迁移脚本 + 兼容期 |
| feedback_mode 枚举扩展（baseline 正式化升 core contract） | scenario.js FEEDBACK_MODES 变更 | fc001_v2 scenario 兼容面 |

### 面④ fault catalog

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| TL-001 新故障族正式化 | FAULT_CATALOG v1.9 → v2.0 | TL-001 G2b 先行（前置条件） |
| 故障族参数域统一化（跨系统具名参数面标准化——bias_Hz/bias_A/bias_W_m2 统一值域语义） | FAULT_CATALOG 结构变更 | 迁移指南 |

### 面⑤ provenance

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| provenance 档位枚举正式化（fmu_l1_lumped_unvalidated 从例外升为正式档位——V312 FROZEN 修订完全化） | V312 清单结构变更 | V312 FROZEN 修订 CHG |

### 面⑥ compare

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| cross_system 谓词正式化（TL-001 RFC 方案 A 永久化） | compareRuns 面扩展 | compare.test.js 适配 |
| L2 评测面正式化（arena2-gen --l2 从扩展 → core contract） | blind_pack schema 升 v3 | L2 评测链适配 |

### 面⑦ run-g2

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| run-g2 步数面重构（37 步 → 优化/分组——parity 步 ×2 可合并） | STEPS 结构变更 | 步账 CHG |
| DEFAULT_MODELS 面重构（8 golden → 按轨分域） | DEFAULT_MODELS 结构 | verify_golden 步① 适配 |

### 面⑧ copy-guard

| 候选 breaking | 影响 | 迁移义务 |
|---|---|---|
| SCOPES 扩张（src → src + tools + docs——全域扫描） | 扫描域变更 | 全域词面审计 + ALLOW 增量 |

## 2. V3 迁移义务草案（五件套）

| # | 义务 | 估算 |
|---|---|---|
| 1 | **迁移指南**（V1→V2 迁移路径文档——config/golden/UI 逐面） | M |
| 2 | **旧输入处置声明**（v1 config/golden 在 v2 中的兼容面/弃用面） | M |
| 3 | **逐 golden 重出评估**（15 golden × v3 schema → 全量重出或按轨分批） | XL（golden 面最重） |
| 4 | **门禁全量绿**（run-g2/verify_golden/copy-guard/负例全适配 v3） | XL |
| 5 | **受影响面清单**（V1_FACES v2 版——八面冻结→九面/十面扩张——TL-001/multi-system 正式面） | M |

## 3. 用户迁移成本评估

| 维度 | v1 用户影响 | v2 迁移成本 |
|---|---|---|
| 教学用户（浏览器 file:// 打开） | **零影响**（ FaultLab.html 单文件——file:// 面零依赖不变） | 零迁移（UI 面不 breaking——v2 UI 向后兼容） |
| 评测用户（Arena L2 MCP 客户端） | arena_version 升级 → 提交格式变更 | MCP 客户端适配（arena_version 0.1 → 0.2） |
| 开发者（oracle/parity/golden 面工具链） | oracle 重出 + verify_golden 注册行变化 | 工具链适配（脚本重出） |
| Agent 作者（Arena v2 协议） | 协议版本升级 → 诊断结果格式变更 | 协议适配（AGENT_PROTOCOL.md 迁移指南） |

## 4. 推荐收敛路径

| 阶段 | 内容 | 版本 |
|---|---|---|
| 1 | TL-001 跨系统 RFC 批准 → TL-001 实现（A-10/A-11） | v1.15-v1.17 |
| 2 | v2.0.0 breaking 候选面冻结（本报告 §1 清单正式化——用户裁定逐面） | v1.18 |
| 3 | v2.0.0 五件套迁移义务执行 | v2.0.0 |
| 4 | v2.0.0 发布（major——五件套全绿） | v2.0.0 |

**推荐**：v2.0.0 不预设排程——先完成 TL-001 跨系统 RFC + 实现（A-9..A-11），TL-001 联合
golden 面为 v2.0.0 的**最大 breaking 候选源**——TL-001 落地后 v2.0.0 清单才能冻结。

## 5. 裁定留白章（用户裁定记录结构）

| # | 裁定项 | 用户裁定 |
|---|---|---|
| R-V2-01 | v2.0.0 是否排程 | （待填） |
| R-V2-02 | breaking 面优先级（§1 清单逐面） | （待填） |
| R-V2-03 | 迁移义务范围（五件套范围确认/裁减） | （待填） |
| R-V2-04 | 排程（TL-001 后 / 独立窗口 / 不排程） | （待填） |

**文件结束**。V2_CONVERGENCE_PRE_RESEARCH v0.1（2026-11-20，V1150 C-8 / CHG-20261119-09）。
本预研为零实现承诺文本；裁定留白章显式留用户。
