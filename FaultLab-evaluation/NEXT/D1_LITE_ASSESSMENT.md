# D1_LITE_ASSESSMENT — run-g2 步数预算与稳定化评估稿（W2-6，只评估不实施）

> **任务卡**：V060_WAVE_DESIGN §2 W2-6（D-1-lite 评估）——「run-g2 步数预算评估稿（本波后
> ≤25 步）：分拆 run-core/run-extended 或 Node worker 并行的建议稿（**不实施——v0.6.x 议题**）」。
> **状态**：评估稿 v1（2026-11-04，参考轨文档撰写人）。**本稿不修改 `tools/run-g2.mjs` 任何
> 行为、不新增/删除任何步、不构成实施授权**；任何实施均须另走 CHG + DEC 复核。
> **输入**：`tools/run-g2.mjs`（通读，行号引用以当前工作树为准）｜
> `artifacts/run-g2-report.json`（最近一次全量实测：`2026-11-02T16:24:46.828Z`，
> commit `83e782b`，ok=true failed=0，24 步）｜ `V05_ROADMAP.md` §D-1 ｜
> `V060_WAVE_DESIGN.md` DEC-E / §4 / §6 风险 5。

---

## 1. 现状盘点：24 步构成（读 `tools/run-g2.mjs` + 最近实测）

步面定义于 `tools/run-g2.mjs:57-82`（`STEPS` 数组，24 个条目）；顺序 `spawnSync` 执行循环在
`tools/run-g2.mjs:102-124`，单步超时 300 000 ms（:109），任一步失败即累计并在末尾 `exit 1`
（:166-168），报告落 `artifacts/run-g2-report.json`（:159-160）。`--skip-e2e` 开关（:28）仅作用于
② e2e 与 perf 两步（:64-65），跳过步在报告中记 `skipped`（:103-105）。

构成与最近实测时长（`artifacts/run-g2-report.json`，步时长合计 13 934 ms；含聚合器开销的
总墙钟 `execution.duration_ms` = 14 094 ms）：

| 组 | 步（cmd） | 实测 ms | 提出处的既有归属 |
|---|---|---:|---|
| ① 数值/golden（5） | `python scripts/verify_golden.py`（fl001 / fc001 / gt001） | 519 / 508 / 413 | G2 四件套之①；V3-31/G2b v1.1 |
| | `node tests/engine.test.js`、`engine-fc.test.js` | 119 / 114 | ① 601 点对 golden |
| + 接口护栏（1） | `node tests/plants.test.js` | 108 | I-11（CHG-20261030-07，19→24 步期间挂入） |
| ② E2E（2，可 skip） | `node tools/e2e.mjs`、`tools/perf.mjs` | **7 562** / 89 | G2 之②；V3-03 |
| ③ 注册表（1） | `node tests/registry.test.js` | 159 | G2 之③ |
| ④ 契约/Schema（2） | `node tests/schema.test.js`、`bundle.test.js` | 118 / 458 | G2 之④；EvidenceBundle 负例 |
| + 事件相位（1） | `node tests/event-phase.test.js` | 140 | G0-DEC-05 |
| G4 守卫（4） | `scope-guard` / `compare` / `causal-rules` / `copy-guard` | 152 / 116 / 101 / 200 | SA-24 / T-15 / 因果规则 / §6.3 禁词 |
| P1（1） | `node tests/report.test.js` | 118 | HTML 报告验收 |
| G6（1） | `node tests/arena-protocol-negative.test.js` | 319 | 盲评测协议 v2 + N-B 负例 |
| FL-19 / V3（4） | `backend-admission` / `engine-gt` / `backend-bridge` / `fmu-admission --self-check` | 1 438 / 275 / 336 / 85 | V312 准入机检 / V3-33 双 golden / 后端桥 / Q-5 |
| + 既有回归（2） | `core.test.js`、`arena.test.js` | 188 / 299 | 既有回归 |
| **合计** | **24 步** | **13 934** | — |

关键结构性事实（影响方案选择的全部事实）：

1. **时长高度集中于单步**：e2e 一步占步时长合计的 54.3%（7 562 / 13 934），且依赖 Chrome
   与本地端口（报告记录 `base=http://127.0.0.1`，见 RFC I-11 §9.5 同款执行方式）；
   其余 23 步合计 6 372 ms，无单步 > 1.5 s（最大 backend-admission 1 438 ms）。
2. **步间无共享可变状态**：每步是独立子进程、只读工作区（除各自产物文件），顺序执行
   （:102-124）是唯一串行点——「可并行面」客观上很大。
3. **门禁语义是单点聚合**：G2 = 全量 24 步全绿（任一失败 exit 1，:166-168）；报告一次性
   写出（:160）。`--skip-e2e` 是既有的「合法部分执行」先例（记 skipped、不记 fail）。
4. **步数增长史**：18 → 19（plants，CHG-20261030-07）→ 24（G2b/V3 系列与回归挂入）；
   DEC-E（V060_WAVE_DESIGN §3）已就「步数须有预算」形成推荐裁定。

## 2. 本波后步数预算（DEC-E ≤ +1）

| 时点 | 步数 | 变动 | 依据 |
|---|---|---|---|
| 当前（本稿撰写时，基线 f1e5e78 工作树） | **24** | — | `tools/run-g2.mjs:57-82` |
| 波次 1（W1-1…W1-5）交付后 | 24 | **0**（D-2a 规格与 oracle 接入不改 run-g2 步面；FC oracle RUNS 3→5 在既有 verify_golden fc001 步内） | V060_WAVE_DESIGN §2 波次 1 各项产出面 |
| 波次 2（W2-1…W2-7）交付后 | **25** | **+1**：W2-4 的 Python 侧 property harness（`tools/oracle/properties/property_harness.py`）为 run-g2 单一新增步；Node 侧 hash 不变量并入既有 `registry.test.js`、**不加步** | DEC-E（推荐已采纳：「Python 侧 harness 作为 run-g2 单一新步（24→25）」） |

**预算制度建议**（本稿建议，实施另走 CHG）：步数的每次增删在 CHG 中登记「步数账」（删几步、
增几步、理由、归属卡）；预算线沿用 DEC-E 口径（单波 ≤ +1）。照此制度，25 步后若再增步，
须先触发本稿 §5 的稳定化方案，而非继续线性加步。

## 3. 维护阈值判定（D-1 的两条压力维度）

`V05_ROADMAP.md:108` D-1 原文：「**run-g2 步数稳定化**：24 步已接近维护阈值；引入 test-suite
并行（Node worker）或分拆为 run-core/run-extended 两层」。两条压力维度实测如下：

- **步数维度（主要压力）**：25 步（本波后）意味着新增工作项的默认挂载成本 = 改聚合器 +
  CHG 登记 + 评审面 +1；接近阈值指的是**维护面增长**，不是运行时长。
- **时长维度（次要）**：全量墙钟 14.1 s（其中 e2e 7.6 s）——对人类反馈循环无感，对 CI
  也远未成瓶颈。**并行化能买回的上限约 9 s**（把 6 372 ms 的非 e2e 步与 e2e 重叠），收益
  有限且伴随失败归因复杂化（§5 方案 B）。

结论：D-1 的「接近阈值」应理解为**步数维护面**压力；因此低风险、小步子的「标签层」方案
（§5 方案 C）优先于结构性重构（A）或并发化（B）。

## 4. 方案评估（只评估，均不实施）

### 方案 A：run-core / run-extended 两层分拆

- **形态**：把 STEPS 划分为 core（数值/golden + 引擎 + 契约 + G4 守卫 + 接口护栏 +
  engine-gt + fmu-admission + 既有回归 = 18 步）与 extended（e2e / perf / report /
  arena-protocol-negative / backend-admission / backend-bridge = 6 步）；CLI 提供
  `--core` 过滤；**默认仍全量**。
- **量化**：core 步时长合计 4 072 ms（18 步，占 29.2%），迭代反馈约 **3.4×** 提速
  （13 934 → 4 072 ms）；extended 六步 9 862 ms。
- **风险**：门禁语义是本聚合器的存在理由（G2 = 全量绿；G7/G8 发布门按全量计）。分拆的
  真正风险不是代码，是**流程**——出现「core 绿即宣称门禁关闭」的路径即事故。缓解：报告
  记录 profile 与 skipped 清单（`--skip-e2e` 先例），发布门（G7/G8）与 CHG 验收句强制引用
  全量运行；文档（README/发布清单）同步。
- **成本**：中（STEPS 加 tier 字段 + CLI 过滤 + 报告字段 + 门禁文档面）。

### 方案 B：Node worker / 进程并行

- **形态**：以 `worker_threads` 或 `child_process` 并发执行无依赖步（如 ①数值 与 ③④契约
  与 G4 并行），e2e/perf 因 Chrome 单实例与端口约束单独排他。
- **量化上限**：墙钟从 14.1 s 压至约 e2e 主导的 8–9 s；**节省 < 6 s**。
- **风险**：失败归因与输出交错（现实现按步串行打印、失败即打印末尾若干行，:117-124）；
  Python 步与 Node 步混排的进程管理；报告聚合逻辑重写。收益/成本比在当前量级下**不划算**。
- **结论**：**缓行**。挂起条件（满足其一再评估）：全量墙钟 > 60 s、步数 > 30、或出现
  CPU 密集步群（如 property harness 扩容后）。

### 方案 C（推荐）：标签层 + 步数预算制度（A 的低成本形态，B 挂起）

1. `STEPS` 条目加 `tier: 'core' | 'extended'` 标签，CLI 加 `--tier core`（**默认全量，
   门禁语义零变化**——不产生任何「部分执行 = 门禁通过」的新路径）；
2. §2 的步数账制度入 CHG 模板（DEC-E 先例制度化）；
3. 方案 B 按其挂起条件封存。

该组合在不触碰门禁语义的前提下取得 D-1 的主要收益（迭代提速 + 步数压力显性化），
且实现面小（一个字段 + 一个开关），适合作为 v0.6.x 的第一个 D-1 清偿步。

## 5. 附：D-2 分层遗留的清偿建议（V060_WAVE_DESIGN §6 风险 5 的随附交付）

波设计风险 5 要求本评估稿含清偿建议：D-2a 分层落地（DEC-A）后，`gt001_oracle.py` 以
「文档化符合」登记接入 `oracle_base.py` 契约，物理 import 挂起至 **GT golden 下次重出时点**
（V-03：任何 oracle 字节变更强制 golden 重出，见 V060_WAVE_DESIGN §1.1）。建议：该清偿
时点与触发条件（GT golden 重出）在 D-2a 的规格文档中登记为显式待办；本稿不预设时间表。

## 6. 实施前置（不构成授权）

- 任一方案实施 = `tools/run-g2.mjs` 行为变更 → 独立 CHG + DEC 复核（V060_WAVE_DESIGN W2-6
  「不实施——v0.6.x 议题」原句）；
- 实施波次建议：随下一波首个需要触碰 run-g2 步面的工作项同轮执行（避免独立开门禁）；
- 实施验收：`--tier core` 与默认全量两种运行各出一份 `artifacts/run-g2-report.json` 对照、
  门禁文档同步、copy-guard 0 命中（如涉及 src/** 文案，本稿不涉及）。

---

**文件结束**。D1_LITE_ASSESSMENT v1（2026-11-04，W2-6）。只评估不实施；推荐组合 = 方案 C
（标签层 + 步数账），worker 并行封存至挂起条件触发。
