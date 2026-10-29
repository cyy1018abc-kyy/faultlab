# ARENA_EVAL_PROTOCOL_APPROVED — FaultLab 独立盲评测协议 v2（v1.1，已批准）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.4 V3-21（P2-02 / FL-20 展开）。
> **状态**：`APPROVED`（**G6-WS-D 关闭**，2026-10-30 用户批准，`CHG-20261030-03`；批准前名
> ARENA_EVAL_PROTOCOL_DRAFT.md）。
> **评审链**：v1 → V3-22 双路独立上下文评审（评审 C 真值隔离/对抗视角、评审 D 工程视角，
> 均 CONDITIONAL GO）→ v1.1 按「G6 关闭前必须改」清单修订 → 用户批准。
> **边界**：实现（评测轨 MVP，协议 §8 五件套）属 G6 后另批，**待用户逐次开工指令**。
> **输入**：`evidence/g6/v3-20-truth-isolation-assessment.md`（LEAK-1/LEAK-2 + 六条守卫清单），
> `docs/AGENT_PROTOCOL.md`（P2 注记版，现行页面 Arena 协议），`src/agents/arena.js`（SCORING_SPEC/
> assertSealed/blindObservables 现行口径），`src/core/schema.js`（project/exposure），V3-22 评审 C/D 记录。
> **性质声明**：本协议约束的是**合成故障评测游戏**的对外评测轨；评分不是真实诊断性能，
> 不构成任何检出率/定位能力声明。`model_validation=not_performed` 不变。
> **记录**：实现 Agent，2026-10-30；v1.1 修订同日（评审 C：F-1…F-7；评审 D：F-01…F-10）。

---

## 1. 定位与信任边界

### 1.1 双轨制（现行演示轨不变）

| 轨 | 对象 | 真值位置 | 依据 |
|---|---|---|---|
| **演示轨（现状保留）** | 页面内 Arena（六页之 06，`extension_preview`）：内置确定性 Agent、教学自测 | 页面内存 `round.truth`（G0-DEC-11 已声明 UI 开关非安全边界） | docs/AGENT_PROTOCOL.md（P2 注记版）继续有效 |
| **评测轨（本协议新增）** | 外部 Agent 作者（A2）经盲包提交、可信评测器评分 | **仅评测器进程内存**，页面与盲包零真值 | 本协议 |

### 1.2 威胁模型（承接 V3-20 §1）

防区内攻击者 = A1 内置/参赛 Agent（只见盲观测流）、A2 外部作者（只见盲包与公开协议）。
A3（本机操作者，DevTools 可读内存）**出防区**——评测轨的赛务真值（set_seed→场景映射）不在页面。
**触发架构 B 重评条件**（V3-20 §3）：对外排位/多人竞争性评测/评分被宣称为诊断能力度量——届时
本协议 §4 评测器独立模型升级为唯一允许形态，页面演示轨须禁用真值显示。

### 1.3 红线（继承 + 新增；v1.1 按评审 C F-2 改写）

1. 评分只标「**合成故障评测游戏，非真实诊断性能**」；禁「检出率/诊断准确率/工业级定位」措辞（W 表与 copy-guard 辖区）；成绩单聚合统计一律游戏化命名（§6.4）。
2. 盲包**零真值**：键名禁词（§6.1a 并集）+ 语义禁项（§5.2）+ closed-world 白名单（§5.1）三查合一。
3. 排行榜/云/账户不做（V0.2 §12）；评测轨产出仅本地成绩单文件。
4. **确定性复算 vs 观测派生估计的二分边界**（v1.1 关键改写）：
   - **禁止**：任何人（含参赛者）在赛时经种子/规则**重放生成流程**复算场景真值（LEAK-1 类，§5.2/附录 A N-B1/N-B13/N-B14 把守）；
   - **允许**：从盲观测样本**统计推断**故障家族/幅值/注入时刻——这是诊断游戏的本体，不是泄漏；
   - 因此本协议全文不出现「真值不可推导/Agent 无法得知注入时刻」类表述；观测流中的跳变（如
     sensor_drift 时 I_meas 在注入处 +10 A）是游戏输入信号，**latency 分项度量的正是栅格级变更点
     检测**（§6.4 注记），不代表超出数据的信息。

## 2. V3-20 守卫清单落位（六条逐一闭环；v1.1 更新）

| V3-20 守卫 | 本协议落位 |
|---|---|
| ① 盲包禁 seed/noise 原始值 | §5.2 语义禁项 + §5.6 标识符纪律（**任何包内标识符不得为 set_seed 的确定性函数**）；opaque `match_id`=UUIDv4、`testset_id` 末段=独立随机串（§3）；`open_seed` 模式见 §5.4（计分轨硬拒收） |
| ② 盲包不携带事件表 | §5.2：v2 包无 `events`；变化点候选仅可来自 `deriveChangePoints()`（§6.3，**定性为事件信息的观测派生等价物**） |
| ③ 密封投影唯一实现 | §6.1a：`sealedProjection(run)` 为唯一密封出口，禁词规则=**显式并集**（评审 D F-04）：arena `FORBIDDEN_KEY` ∪ `FORBIDDEN_ID` ∪ schema `BLIND_BANNED_KEY` ∪ `BLIND_BANNED_EXACT` ∪ §5.2 语义禁项；**v2 密封投影无 events 字段，`project('blind')` 的事件输出（含 trigger_s）不进入合并**；两条旧路径废弃为内部调用方 |
| ④ 评测器独立性 | §4：Verifier 独立进程/独立工具链，唯一持真值；与被评 Agent 无共享代码路径；组织方约束同节（v1.1 新增） |
| ⑤ 负例 ≥8 含四类攻击 | 附录 A：**17 条**负例冻结规格（含 seed 重建/事件字段/config/truth 键名四类 + v1.1 增补 N-B13…N-B17）+ N-Bx→V 步→AE 码映射表 |
| ⑥ demo 包与 blind 包互斥 | §5.5：`bundle_kind` 必标；`evidence_demo` 与 `arena_blind*` 互斥校验，混发拒收（V-06） |

## 3. 固定测试集（Fixed Testset）

| 项 | 规定 |
|---|---|
| 构成 | 每测试集 = N 轮隐藏场景（默认 N=6，范围 1–12 沿用现行 clamp），**健康局占比 ≈20%**（HEALTHY_RATIO=0.2 沿用；N≥3 时零健康局则中位轮替换为健康局——沿用现行覆盖保护，含保留 feedbackMode） |
| 生成 | 组织方以 `mulberry32(set_seed)` 预生成（顺序固定：health→family→feedback→time→magnitude），**生成器不进参赛工具链分发**（它含真值构造逻辑）；注入时刻有效区间按现行代码为 **2–52 s**（`[2, min(55, duration−8)]`，0.1 s 栅格）——v1 误写 2–55 s，v1.1 更正（评审 D F-06） |
| **多样性下限（v1.1 新增，评审 C F-5）** | `scenario_rules` 要求：故障家族覆盖 ≥2 种、健康局数落在 0.2×N±1 带内；越带的测试集作废重生成并留痕——压缩 seed-shopping 空间 |
| **testset_id（v1.1 重写，评审 C F-1 [BLK]）** | `testset_id = "arena2-" + systemId + "-" + N + "-" + r8`，其中 `r8` 为 **8 个十六进制字符、由与 set_seed 无关的独立 CSPRNG 抽取**（或 keyed-H，密钥 ≥128 bit 且不入仓库/协议/盲包）。**禁止** testset_id/match_id/任何包内标识符为 set_seed 的确定性函数（含未加钥哈希截断——2^32 可枚举且观测数据是真值过滤器）。守卫负例：N-B13 |
| 版本 | 盲包内记 `testset_id` + `scenario_rules`（生成规则版本号，如 sr1），不记 set_seed 本体 |
| 冻结（v1.1 新增） | 测试集一经发放即冻结：score 与 testset_id 绑定，同场次禁止重抽（评审 C F-5） |
| 复现 | 赛后 reveal 公布 set_seed 与映射（§7），任何人可重放核对——**赛后**可复现、**赛时**不可确定性复算 |

## 4. 角色与评测器独立性（Verifier Model）

```text
参赛者（A2）          可信评测器 Verifier                组织方
  │ 盲包 v2 ───────────▶│ 输入校验（附录A负例全过）        │ 保管 set_seed→场景映射
  │ 提交 JSON ─────────▶│ 与盲包哈希绑定（V-07）           │ 预生成盲包与测试集
  │◀─── 成绩单 score_report ──┐                          │ 赛后公布 reveal 包
  └─（可第三方复算成绩单）────┘ Verifier 持有：盲包×真值映射×评分规则
```

- **独立性**：Verifier 与参赛 Agent 无共享代码/进程/真值读取路径；Verifier 唯一能同时见到
  truth 与 diagnosis；页面 UI 不参与计分。Verfier 形态（QP-1）：倾向 Node 单实现首发
  （复用 `arena.js` 评分与 `Canonicalization v1`；Python 仅作赛后第三方复算脚本）。
- **组织方约束（v1.1 新增，评审 C F-5）**：
  1. 计分轨测试集的 set_seed **每场新抽**；禁用演示默认 seed（20261027）及一切与 open_seed 演示集共享的种子（§5.4 种子空间不相交）；
  2. 组织方关联 Agent 参赛须在成绩单披露，且该场次 Verifier 角色回避（以第三方复算为准）；
  3. 测试集发放即冻结（§3），同场次禁止重抽（防 seed-shopping）。
- **评分规则单源**：评分语义以现行 `scoreDiagnosis` 实现为基准、数值规格冻结于 §6.4；实现期以
  共享模块单源化，页面与 Verifier **禁止双实现漂移**（§8 MVP-1）。
- **成绩单哈希链（v1.1 规范化，评审 D F-02 [BLK]）**：
  `score_hash = SHA256( canonical_json{ blind_sha256, submission_sha256, scoring_rules_spec_hash, rounds[]{index, subitems(十进制串), round_score} } )`
  ——canonical_json 沿用 **Canonicalization v1**（`hashObjectStrict`：键序排序、数值十进制化、
  NaN/−0 禁）；各轮分项入哈希前固定为 4 位小数十进制串（规避 JS/Python 指数记法分歧）；
  `blind_sha256` = **分发文件原始字节**的 SHA-256（v2 盲包不含任何墙钟字段，故字节稳定）；
  `submission_sha256` = 提交文件原始字节；`scoring_rules_spec_hash` = §6.4 全文内容摘要。

## 5. 盲包 v2 Schema（`faultlab.arena.round.v2` / `match.v2`）

### 5.1 字段白名单（closed-world：未列字段一律拒收；键精确匹配，不做大小写/Unicode 归一化）

```jsonc
{
  "schema": "faultlab.arena.round.v2",       // match.v2 同构，round→rounds[]
  "bundle_kind": "arena_blind",              // §5.5 互斥声明，必填
  "arena_version": "2.0",                    // 确定版本串（非 "2.x" 占位）
  "systemId": "FL-001",                      // 公开信息零泄漏；部件枚举校验数据源
  "testset_id": "arena2-FL-001-6-9f2c1a7b",  // 末段=独立随机串（§3）
  "match_id": "<UUIDv4>",                    // opaque；禁 v1 式 "Arena-...-S<seed>-R<n>" 值格式
  "scenario_rules": "sr1",                   // 生成规则版本号（非参数本体）
  "round": {
    "index": 1,                              // ★ 1-based（v1.1 更正，评审 D F-03），与提交 round 对齐
    "dt_s": 0.1, "duration_s": 60,           // sr1 冻结常量：dt=0.1 ∧ duration=60 ∧ n=601
    "observables": [{ "id", "label", "unit" }],   // §5.3 白名单通道，列序即 samples 列序
    "samples": [[t, v1, v2, ...], ...]        // 601 行；可选通道缺失记 null（§6.2 V-04b null 政策）
  },
  "scoring_rules": "v2"                      // 指向 §6.4 冻结规格（reveal 内嵌全文）
}
```

> 注（v1.1，评审 D F-10）：现行导出包 samples 本就是行数组（`buildSamples`→`roundBundlePart`
> 透传），**无迁移成本**；`{t, s:{id:v}}` 仅是内部 `agent.observe()` 形态。t 为最短往返十进制表示。

### 5.2 语义禁项（v1.1 按评审 C F-3 改写：按来源可派生性定义）

**定义**：盲包禁止携带**不能由白名单字段与 samples 计算得到**的场景本体信息。显式禁字段（键名
禁词之外的补强）：`seed`/`set_seed`/`noise` 原始值、`events` 及任何含 `trigger_s`/`t_start_s`/
`t_fault` 语义的字段、`config` 对象、fault 家族/参数/模式字段、一切未在 §5.1 白名单的字段。

### 5.3 观测通道白名单

沿用现行三重过滤并收编为协议定义：`exposure==='blind_observable'` ∧ `sourceKind ∉ {FAULT_EVENT,
MODEL_STATE}` ∧ id 禁词（并集，§6.1a）；通道目录随 `scenario_rules` 版本冻结（AGENT_PROTOCOL §3.5 继续有效）。

### 5.4 `open_seed` 例外模式（v1.1 收紧，评审 C F-4）

仅用于可复现教学演示：盲包显式 `bundle_kind:"arena_blind_open_seed"` 并携带 seed。
**约束**：① 计分轨**硬拒收** open_seed 包（V-03 分支，非「标注不计分」的软声明）；② open_seed
演示集与计分轨测试集的种子空间**必须不相交**，且禁用演示默认 seed 20261027 于任何计分集。

### 5.5 与 demo 证据包互斥

`bundle_kind ∈ {arena_blind, arena_blind_open_seed}` 的包**不得**包含 `run_manifest`/`timeseries.csv`
等 EvidenceBundle v1 成员键；反之 EvidenceBundle v1 导出不得携带 arena 字段。双查双向（V-06，
**先于 closed-world 兜底判定**，评审 D F-05）。

### 5.6 标识符纪律（v1.1 新增，评审 C F-6/F-14 关联）

`match_id` 必须匹配 UUIDv4 格式（正则校验）；`testset_id` 末段校验为独立随机串；两者与 set_seed
无任何确定性函数关系（§3）；v1 式值格式（内嵌 seed）禁止。

## 6. 评分、提交与复核

### 6.1 提交格式

沿用 AGENT_PROTOCOL §4 字段面（`round/detected/detectTime_s/faultType/component/magnitude/
confidence`），增加：`"protocol":"v2"` 锚定 + **`testset_id`、`match_id` 必填绑定字段**（v1.1 新增，
评审 C F-4——V-07 校验与所附盲包一致，天然给出跨包重放防护 N-B15）；校验规则沿用 §4.4 并加：
未知 family/部件枚举拒收（枚举源=系统静态目录，随 scenario_rules 冻结）、confidence ∈ [0,1] 拒外。

### 6.1a 密封投影并集规则（v1.1 新增，评审 D F-04 [BLK] 关联）

`sealedProjection` 禁词规则为以下四组的**显式并集**（实现期以单源模块固化，清单随实现评审）：
arena `FORBIDDEN_KEY`（`(^|_)(truth|true|bias|cap)(_|$)|^config$|(^|_)fault($|_)config$`，i）∪
arena `FORBIDDEN_ID`（`(^|_)(true|bias|cap)(_|$)`，i）∪ schema `BLIND_BANNED_KEY`
（`(^|_)(true|truth|bias|cap|fault)(_|$)`，i）∪ schema `BLIND_BANNED_EXACT`
（bias_A/faultFamily/faultId/faultActiveFrom_s/peakMagnitude）。**注意**：并集含裸键 `fault`
（schema 组有、arena 组无）；v2 密封投影无 events 字段，`project('blind')` 的事件输出不进入合并。

### 6.2 Verifier 校验链（v1.1 修订：含结构上限、绑定校验与判定顺序）

| 步 | 校验 | 失败码 |
|---|---|---|
| V-00 | 结构上限：嵌套深度 ≤64、包体 ≤1 MB（防递归扫描栈溢出，评审 C F-6） | AE-E15 |
| V-01 | schema/bundle_kind/arena_version（v2 轨专用；v1 包不属本协议，不走此轨） | AE-E01 |
| V-02 | 键名禁词扫描（§6.1a 并集；键精确匹配） | AE-E02 |
| V-03 | 语义禁项（§5.2；含 open_seed 计分轨硬拒收分支） | AE-E03/04/05 |
| V-04a | 网格与点数：sr1 常量（dt=0.1/duration=60/n=601）、时间单调、`t[i] ≈ i·dt`（**1e-9 容差**，评审 D F-07——引擎时间轴为 IEEE 乘积） | AE-E07 |
| V-04b | 数值完整性：NaN/Infinity/字符串数字/\|v\|>1e9 拒收；**可选通道缺失的 `null` 允许**（与现行 buildSamples 一致） | AE-E10 |
| V-05 | 观测白名单复核（§5.3） | AE-E06 |
| V-06 | 互斥校验（§5.5，先于 V-06b） | AE-E09 |
| V-06b | closed-world 未知字段兜底（键精确匹配） | AE-E08 |
| V-07 | 提交 JSON 校验 + `testset_id`/`match_id` 绑定一致性 | AE-E11/AE-E14 |
| V-08 | round/index 匹配（1-based 对齐） | AE-E14 |
| V-09 | 评分（§6.4 冻结规格） | — |
| V-10 | 成绩单哈希链落章（§4 规范化） | AE-E12 |

### 6.3 变化点候选（观测派生；v1.1 重新定性，评审 C F-3）

`deriveChangePoints(samples)`：仅由白名单观测序列派生的候选突变点（|Δv|>k·σ 类，算法随
`scenario_rules` 冻结为 sr1）。**定性：事件信息的观测派生等价物**——故障轮输出逼近 {注入时刻}
（SNR≈28 时栅格级精确），健康轮输出假候选；「健康局同样可能产出」是否成立是 k 的函数，sr1 冻结时
**必须测量并公布健康局每轮假候选率**，该率公布前 QP-4（首发提供）不予放行。供低门槛 Agent
基线使用（v1.1 措辞更正）。

### 6.4 评分数值规格（v1.1 冻结，评审 D F-01 [BLK]；与现行 scoreDiagnosis/SCORING_SPEC 同源）

| 项 | 冻结值 |
|---|---|
| scale | 100 |
| weights | detection 0.20 · family 0.25 · component 0.10 · magnitude 0.15 · latency 0.15 · calibration 0.15（Σ=1.00） |
| falseAlarmPenalty | 10（误报一局扣 10 分） |
| latencyWindow_s | 12 |
| healthyRatio | 0.2 |
| detection | 二值：报警=1 / 未报警=0（健康局见 healthy_policy） |
| family / component | 二值匹配：`d.faultType===truth.faultFamily`、`d.component===truth.component` |
| magnitude_rule | `max(0, 1 − |估计值 − 真值| / |真值|)`，单位必须一致；缺失幅值记 0 |
| latency_rule | `1 − max(0, detectTime_s − t_fault) / 12`（未报警记 0；窗口 12 s）。**注记（§1.3-4）**：度量的是栅格级变更点检测，不代表超出观测数据的信息 |
| calibration_rule | `1 − (confidence − 是否故障)²`（Brier 分量） |
| healthy_policy | 健康局：未报警时 detection/family/component/magnitude/latency 均记 1（calibration 照常计算）；误报记 falseAlarm=1 并扣 10 分 |
| round_score | 单轮 = `round( 100 × Σ(weights×分项) − falseAlarm×10, 1 )`，下限 0；场总分 = 各轮平均 `round(…,1)`；**舍入 = 十进制半向上（Math.round 语义），分项先 4 位小数十进制串再入哈希** |
| 展示名 | 报警/家族/部件/幅值/时刻/校准；聚合统计游戏化命名，成绩单页脚固定「合成故障评测游戏，非真实诊断性能」 |

> 实现期把本表固化为共享模块常量并跑「页面 × Verifier」一致性向量；reveal 包内嵌本表全文
> （而非版本号指针，评审 D F-01）。

### 6.5 复核与重放

- 第三方复核：reveal 包（set_seed + match_id→truth 映射 + **§6.4 规格全文** + `engine_version`/
  `model_version`/生成器规则哈希——v1.1 增补，评审 D F-06）+ 本协议 → 离线重算 score_hash 一致即通过；
  Python/Node 伪代码沿用 AGENT_PROTOCOL §6 风格（零依赖）。
- 重放：同 testset_id 重赛必须逐轮 bit 级一致——**v2 盲包不含任何墙钟字段**（无 exported_at）；
  剩余平台差异源（浮点序列化、Unicode、CRLF）由 §4 canonical_json 与「分发文件字节」口径吸收。

## 7. 真值 Reveal（赛后）

`faultlab.arena.reveal.v1`：`{ testset_id, set_seed, mapping:[{match_id, round, truth{...}}],
scenario_rules, scoring_rules_spec(§6.4 全文), engine_version, model_version, generator_rules_hash,
generated_at }`。公布时点=该场次截止后；reveal 前组织方不得泄露映射。reveal 包自检：必须含
truth（反向断言，供复核脚本自检）。

## 8. 实现边界与 MVP（v1.1 增补，评审 D F-06）

- **MVP 最小实现集**（G6 后另批，不入 V0.3 承诺）：
  1. `src/core/arena-protocol.js`（零 DOM、Node 可加载）：`sealedProjection`（§6.1a 并集）、v2 包构造、V-01…V-06b 校验；**把场景流 + 健康局覆盖保护从 `createMatch` 抽成共享模块，arena.js 反向调用**——杜绝组织方生成器与页面双实现漂移；
  2. `tools/arena2-gen.mjs`：组织方测试集/盲包/reveal 生成器（v2 包 + 映射保管件，零墙钟字段）；
  3. `tools/arena2-verify.mjs`：Verifier V-01…V-10 + 成绩单落章（复用 `FL.arena.scoreDiagnosis`、`validateDiagnosis`、`FL.core.hashObjectStrict`）；
  4. `tests/arena-protocol-negative.test.js`：附录 A 17 条 fixtures（照 bundle.test.js `expectCode` 范式）；
  5. `tools/run-g2.mjs` 增挂协议测试步。
  页面 UI 零改动即可发布 MVP（评测轨纯 CLI）；页面 v2 导出入口/open_seed 为后续项。
- AE 错误统一用 `contractError('AE-Exx', field, message, next)` 构造（复用既有测试范式）；
  AE-E 前缀仅评测轨使用。

## 9. 开放问题裁定（**已随 CHG-20261030-03 生效**；下表倾向列即生效裁定，双路评审建议见
 `evidence/g6/v3-22-protocol-review.md`）

| # | 问题 | 倾向（评审 D 工程侧 / 记录人） |
|---|---|---|
| QP-1 | Verifier 语言：Node vs Python | Node 单实现首发（评分/校验/规范化全复用，一致性风险为零）；Python 仅赛后复算脚本 |
| QP-2 | 测试集公开粒度 | 场次独立 + 一个入库共享基准集（负例/重放 fixture 可冻结进仓库）；与 §4 种子隔离规则联动 |
| QP-3 | 多提交策略 | 取最高 + 全次留痕（score_report 附 attempts；哈希链绑提交序号） |
| QP-4 | deriveChangePoints 首发与否 | 可首发，**前置=§6.3 健康局假候选率测量并公布**（评审 C F-3）；Node 单实现下无交叉测试负担 |
| QP-5 | 赛后调试赛 | 允许，成绩单永久标「post-reveal·不计分」；其 set_seed 亦受 §4 种子空间隔离约束 |

## 附录 A：盲包负例冻结规格（17 条；实现期为 `tests/arena-protocol-negative.test.js` fixtures，冻结后不得删减只可增补）

### A.1 负例 → V 步 → AE 码映射（v1.1 新增，评审 D F-05；判定顺序随 V-00→V-06b）

| # | 负例 | 构造 | 拦截步 | 期望 |
|---|---|---|---|---|
| N-B1 | **seed 重建攻击** | 合法包 + 顶层 `"seed":20261027`（或 `set_seed`/嵌套变体） | V-03 | 计分轨硬拒收 AE-E03「盲包携带种子类字段（LEAK-1）」；open_seed 模式仅 §5.4 例外 |
| N-B2 | noise 标志 | `"noise":{"enabled":true,"seed":1,"level":1}` | V-03 | 拒收 AE-E03 |
| N-B3 | 事件字段 | `"events":[{"trigger_s":20.0}]` / 任意键含 `trigger_s`/`t_start_s`/`t_fault` | V-02/V-03 | 拒收 AE-E04「携带事件/注入时刻类字段（LEAK-2）」 |
| N-B4 | config/fault 配置 | `"config":{...}` 或 `"fault":{"family":"sensor_drift"}`（裸键 `fault` 由并集规则命中，评审 D F-04） | V-02/V-03 | 拒收 AE-E02/E05 |
| N-B5 | truth 键名 | 任意层级 `"truth":...` / `I_bat_true_A` 作为 observable/samples 键 | V-02 | 拒收 AE-E02（并集禁词） |
| N-B6 | 通道越权 | observables 含 `MODEL_STATE`/`FAULT_EVENT` 通道或未注册 id | V-05 | 拒收 AE-E06 |
| N-B7 | 网格违规 | 601→600 点 / t 非单调 / \|t[i]−i·dt\|>1e-9 / dt=0.2 | V-04a | 拒收 AE-E07（sr1 常量 + 1e-9 容差） |
| N-B8 | 未知字段 | 顶层 `"metadata":"x"`（白名单外） | V-06b | 拒收 AE-E08（closed-world，键精确匹配） |
| N-B9 | 版本/缺失 | `"schema":"faultlab.arena.round.v1"` 或缺 `bundle_kind` | V-01 | **v2 轨一律拒收 AE-E01**；v1 演示轨不属本协议管辖（v1.1 消歧，评审 D F-05） |
| N-B10 | 互斥违规 | arena_blind 包内嵌 `run_manifest`/`timeseries.csv` 等 EvidenceBundle 成员键 | V-06（先于 V-06b） | 拒收 AE-E09（§5.5） |
| N-B11 | 数值完整性 | samples 含 NaN/Infinity/字符串数字/\|v\|>1e9（**null 不在此列**——可选通道缺失允许） | V-04b | 拒收 AE-E10 |
| N-B12 | 提交侧越界 | diagnosis：confidence=1.5 / faultType 未知枚举 / round 越界（round 为 ≥1 整数） | V-07 | 拒收 AE-E11 |
| N-B13 | **测试集标识夹带种子材料**（v1.1 新增，评审 C） | `testset_id` 末段 = set_seed 的 hex/前 8 位十进制，或未加钥 `H(set_seed)[:8]` | V-01/§5.6 | 拒收 AE-E13「测试集标识含可枚举种子材料（LEAK-1）」 |
| N-B14 | **match_id 值内嵌种子**（v1.1 新增） | `match_id="Arena-FL-001-S20261027-R6"`（v1 式值格式） | V-01/§5.6 | 拒收 AE-E13/AE-E14「match_id 非 opaque UUID」 |
| N-B15 | **跨包重放提交**（v1.1 新增） | 提交 JSON 缺 `testset_id`/`match_id` 绑定，或与所附盲包不一致；同一提交对多个 match_id 重放 | V-07/V-08 | 拒收 AE-E14「提交与测试集绑定缺失/不一致」 |
| N-B16 | **深度/体积炸弹**（v1.1 新增） | 白名单外字段嵌套深度 >64 或包体 >1 MB | V-00 | 拒收 AE-E15「结构超限」（防递归扫描栈溢出） |
| N-B17 | **open_seed 混入计分轨**（v1.1 新增） | `bundle_kind:"arena_blind_open_seed"` 进入计分流程 | V-03 | 计分轨硬拒收 AE-E03；成绩单落不计分轨且 score_hash 输入含 bundle_kind |

## 附录 B：协议层错误码（`contractError` 构造，中文消息 + 字段路径 + 修复建议）

`AE-E01` schema/bundle_kind/版本不符 · `AE-E02` 键名禁词命中 · `AE-E03` 种子/噪声字段（LEAK-1）·
`AE-E04` 事件/注入时刻字段（LEAK-2）· `AE-E05` 场景配置字段 · `AE-E06` 观测通道越权 · `AE-E07`
网格/点数违规 · `AE-E08` 未知字段（closed-world）· `AE-E09` 包类型互斥违规 · `AE-E10` 数值完整性 ·
`AE-E11` 提交格式越界 · `AE-E12` 哈希链落章失败 · `AE-E13` 标识符含种子材料/非 opaque（v1.1）·
`AE-E14` 提交绑定缺失/不一致或 id 非法（v1.1）· `AE-E15` 结构深度/体积超限（v1.1）。
AE-E 前缀仅评测轨使用，防 UI 层混淆。

---

**修订记录**：v1（2026-10-30 初稿）→ V3-22 双路评审（C：F-1…F-7 + N-B13…17；D：F-01…F-10）→
**v1.1（2026-10-30）**：已吸收全部「G6 关闭前必须改」项——testset_id 重写（C F-1）、红线二分改写
（C F-2）、禁项可派生性定义与 §6.3 重新定性（C F-3）、提交绑定与种子空间隔离（C F-4）、组织方
约束（C F-5）、N-B13…N-B17 增补；评分数值规格冻结（D F-01）、score_hash 规范化（D F-02）、
1-based 更正（D F-03）、sealedProjection 显式并集（D F-04）、负例映射表与 null 政策（D F-05）、
生成器 MVP 与时刻区间更正 2–52 s（D F-06）、sr1 常量与容差（D F-07）、systemId/版本串（D F-08）。
推迟到实现期：递归扫描实现细节、sealedProjection 单源模块、AE 码接入 contractError。
**批准记录（2026-10-30，CHG-20261030-03）**：用户批准，QP-1…QP-5 裁定生效（§9），G6-WS-D 关闭；
文档更名 ARENA_EVAL_PROTOCOL_APPROVED.md。**文件结束**。