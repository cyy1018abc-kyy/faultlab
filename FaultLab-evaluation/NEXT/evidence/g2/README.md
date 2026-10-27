# G2 实施证据包（2026-10-28）

> **性质声明**：本目录记录 P0a 链路（I-01…I-08 最小版）的实施与验证证据，覆盖 `MODEL_VALIDATION_SPEC.md`
> §10.2 的可执行子集。全部证据为**内部一致性与可复核性**证据：`model_validation=not_performed`、
> `hardware_verification=not_performed` 保持不变；本证据**不构成**模型验证、物理守恒验证或硬件验证。
> G2 关闭裁决仍需 Lead/用户按 §10 复核（含 E2E 的完整手测清单与证据包审阅）。

## 复跑命令（Windows 10/11 + Python 3.9 + Node 26；全部离线、零第三方依赖）

```powershell
python tools/oracle/fl001_oracle.py --self-check    # oracle 自检（SC-1…SC-6），exit 0
python tools/oracle/emit_golden.py --check          # 重算并与 golden 比对
python scripts/verify_golden.py                     # 一键校验（exit 0/1/2）
node tools/run-g2.mjs                               # 四件套聚合（任一失败非零退出）
```

## 证据清单

| 文件 | 内容 | 通过判据 |
|---|---|---|
| `run-g2-report.json` | 四件套聚合结果（9 步全 PASS，含命令与退出码） | `ok=true` |
| `verify_golden.log.json` | oracle 重算 vs golden 逐项比对（V-01…V-09 + V-03b 批准摘要） | 全部 pass |
| `e2e-report.json` | 浏览器 E2E fl001-min（40 断言） | `ok=true` |
| `golden-sha256.txt` | golden 文件 SHA-256（内容校验和，非签名；**2026-10-28 approval 字段已回填**，CHG-20261028-01） | `6a0c751f…c31ede2` |
| `deviations.md` | 实现相对规格文本的偏差登记 | 逐条可追溯 |

## 对应关系（BACKLOG_APPROVED §2.1）

| 任务 | 交付物 | 证据 |
|---|---|---|
| P0a-02 | `src/core/schema.js`（SignalCatalog/ScenarioConfig/TimeSeries/EventSnapshot/DerivedMetric/QualityChecks/RunManifest 校验 + `project()`） | `tests/schema.test.js` 114 断言 |
| P0a-03 | `tools/oracle/`（独立 oracle + emit_golden）+ `data/golden/fl001_v1.json` + `scripts/verify_golden.py` | verify_golden exit 0；oracle 不 import `src/**`（独立硬编码 §1.3 方程） |
| P0a-04 | `src/core/registry.js`（Canonicalization v1 + run_hash + 深冻结） | `tests/registry.test.js` 33 断言（PHY-09/SA-21） |
| P0a-05 | engine/metrics/checks 对齐 golden（契约指标 ID、method 标注、1e-12 定义自洽） | `tests/engine.test.js` 166 断言（601 点×3 Run + PHY-01/01b/02/03/04/05） |
| P0a-06/07 | 单一时钟、事件相位、五视图深链、回放不变 | `tools/e2e.mjs` fl001-min 40 断言（PHY-08/SA-22 冒烟） |
| P0a-08 | `src/core/bundle.js` EvidenceBundle v1（7 文件+SHA256SUMS，导入=哈希→Schema→重算→run_hash） | `tests/bundle.test.js` 35 断言（N-1…N-10 负例）+ `tools/verify_bundle.py` 交叉验证 |
| P0b-03 最小 | 因果节点 rule_id / rule_version / EvidenceLink 字段（run_id+signal_id+time_window_s+layer） | `tests/event-phase.test.js` + E2E E-06 |

## 已知边界（不虚报）

1. **E2E 为 CDP headless Chrome 冒烟**（G0-DEC-16 允许的降级路径）；Playwright 体系与完整
   手测清单走查仍属 G4（P0b-01/02/05）。
2. **UI 导入按钮已接入对比页**（`src/ui/pages/compare.js`），下载为逐文件保存（浏览器无法
   无依赖打包 zip）；导入以多选文件方式读取。
3. `docs/CONTRACT.md`/`README.md` 的正文刷新属 P0b-06（未在本轮展开，避免文档漂移）；
   本目录为准实现记录。
4. FC-001 / GT-001 / Agent Arena 未按新契约重基线（P1/P2 范围，SCOPE_SPLIT_MEMO 处置不变）；
   其页面回归由既有 `core.test.js`/`arena.test.js` 适配后保持绿。
