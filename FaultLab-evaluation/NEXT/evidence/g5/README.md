# G5（对外发布）评审启动包 — Release Readiness Review（2026-10-28）

> **门禁状态**：🟡 **评审中**（CHG-20261028-05，用户 2026-10-28 指令「对 G5（对外发布）启动评审」）。
> **性质**：记录者**单路**评审（G0 曾采用双路独立评审；本评审如需升级双路，另行组织）。
> 评审侧结论为 **CONDITIONAL GO（建议）**；**决策侧（关闭/驳回 G5）由用户裁决**——在此之前
> 不得对外发布、不得宣称"已发布/可用于生产"。
> `model_validation=not_performed`、`hardware_verification=not_performed` 随发布材料保留；
> 本评审不构成模型验证或硬件验证。

## 1. 发布范围（建议的 G5 发布物）

| 内容 | 状态 | 说明 |
|---|---|---|
| 静态目录（仓库根，`python -m http.server` / 任意静态服务器） | **发布物** | G0-DEC-03 的 P0 交付形态；`index.html` + `css/` + `src/` + `data/golden/` + `docs/` + `tools/`（含 oracle/verify 脚本）+ `FaultLab-evaluation/`（治理与证据，透明发布） |
| FL-001 P0 主路径（3 固定 Run × 5 视图 × 事件 × 证据包 × golden） | **验收面** | 四件套 + E2E 全绿 |
| FC-001 / GT-001 / Agent Arena | 随包**扩展预览** | 携带 `scope='extension_preview'` 与「扩展系统/EXT」标签；GT 当前形态 NO-GO（仅规格草案展示）；不进入验收 |
| `FaultLab.html` 单文件 | **不发布** | 冻结原型（P1-05 未批准重做构建链）；README 已注明 |
| `artifacts/`（QA 截图与报告） | 随包 | 历史原型自检记录，已在 README 标注不作为验收证据 |

## 2. 发布就绪检查单（评审侧逐条核对，2026-10-28 实跑证据）

| # | 检查项 | 结果 | 证据 |
|---|---|---|---|
| R-01 | 验收回归全绿（四件套 + G4/P1 测试 + 既有回归 + E2E） | ✅ 16/16 | `run-g2-report.json`（本目录，2026-10-28 实跑） |
| R-02 | 双 golden 可复核且已批准（fl001/fc001） | ✅ | `python scripts/verify_golden.py [fc001]` exit 0；approval 摘要 V-03b 过；sha 侧车一致 |
| R-03 | 用户可见文案合规（29 禁止词模式扫描 src/**） | ✅ | `grep-copy.log`（PASS） |
| R-04 | 离线运行：无外部网络请求、全程 console error=0 | ✅ 40 断言 | `e2e-report.json`（E-08） |
| R-05 | README 发布说明就绪（运行步骤/模型边界/复核命令；不引用旧原型 PASS 数字） | ✅ | 根 README §2/§5/§7（git 21f82f9 起版本） |
| R-06 | 证据三级字段随发布材料保留（报告页脚/证据包/manifest） | ✅ | `tests/report.test.js` TXT-03 组断言；EvidenceBundle manifest.verification |
| R-07 | 范围守卫：Run/证据包携带 scope；扩展场景不可混入 P0 | ✅ | `tests/scope-guard.test.js` 24 断言 |
| R-08 | 证据包第三方离线复核链（校验和→Schema→重算→run_hash） | ✅ | `tests/bundle.test.js` 35 断言（N-1…N-10）+ `tools/verify_bundle.py` |
| R-09 | 浏览器矩阵：Windows 10/11 + Chrome/Edge **最近两个大版本** | 🟡 部分 | 本机 Chrome（CDP headless）自动化覆盖单一引擎；**双浏览器人工走查为开放项**（F-4） |
| R-10 | 语义边界声明（一致性检查≠模型验证≠硬件验证） | ✅ | README §5/§9、报告页脚、causal 横幅 |

## 3. 发现项（评审侧）

| # | 级别 | 发现 | 处置建议 |
|---|---|---|---|
| **F-1** | **发布阻断（用户决策）** | 仓库**无 LICENSE 文件**，README 无许可证章节；对外发布（尤其开源 Beta，DECISIONS §4 提及"开源 Beta"路径）必须先决定许可证与第三方素材义务 | 用户决定许可证（如 Apache-2.0/MIT/专有）；补 LICENSE + README 许可证节 |
| **F-2** | 条件 | 发布需要版本标识 | 已创建标签 `g5-rc1` 作为发布候选基线；正式版本号（如 v0.2.0）由用户在关闭 G5 时定 |
| **F-3** | 提示 | `FaultLab.html` 单文件为冻结原型 | 保持"不作为发布物"（README 已注明）；P1-05 批准前不承诺 file:// 双击路径 |
| **F-4** | 条件 | R-09 双浏览器人工走查未完成（自动化仅单一 Chromium 引擎） | 发布前用 `tools/qa.mjs shots/ux` 在 Edge 与另一 Chrome 大版本各跑一遍并留档 |
| **F-5** | 非阻断 | 性能阈值未冻结（T-19：先基准、经批准后冻结） | G5 关闭后按需做基准测量任务 |
| **F-6** | 提示 | 本评审为记录者单路 | 如需双路独立评审（G0 惯例），另行组织第二评审人 |

## 4. 建议裁决（评审侧）

**CONDITIONAL GO** —— 技术证据面（R-01…R-08、R-10）全部就绪；关闭 G5 前需满足：
1. **F-1 许可证决定**（用户决策，唯一硬阻断）；
2. **F-4 双浏览器走查**留档（可由记录者协助执行）。

满足后由用户作出 G5 决策（关闭 ⇒ 可对外发布；驳回 ⇒ 维持内部使用）。G5 关闭将同时满足
P2 任务（FL-19/FL-20 等）的"G5 beta 后"进入条件——但 P2 各项仍需独立 RFC/评测协议，本评审不预批。

## 5. 复跑命令

```powershell
node tools/run-g2.mjs                        # 16/16（含 E2E）
python scripts/verify_golden.py              # fl001 exit 0
python scripts/verify_golden.py fc001        # fc001 exit 0
node tools/copy-guard.mjs                    # 文案 PASS
```

## 6. 本目录证据清单

| 文件 | 内容 |
|---|---|
| `README.md` | 本评审（范围/检查单/发现项/建议裁决） |
| `run-g2-report.json` | 2026-10-28 全量聚合回归（16/16） |
| `e2e-report.json` | 浏览器 E2E fl001-min（40 断言） |
| `grep-copy.log` | 禁止词扫描输出 |
