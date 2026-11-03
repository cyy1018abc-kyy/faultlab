# EVAL_TRACK_GUIDE — 评测轨外部 Agent 接入指南（v2，协议 v2/v1.1）

> **定位**：参赛者（Agent 作者）的完整接入指南；v2 追加组织方视角的「对外公开场次」章（§6）。
> 评分 = 合成故障评测游戏，非真实诊断性能。
> **前置**：FaultLab 仓库（含 `tools/arena2-verify.mjs`）、Python 3.9+ / Node 18+。
> **v2（2026-11-04，工作项 W1-4 / 路线图 C-1）**：追加 §6「对外公开场次」；v1 §1–§5 原文保留，
> 个别表述以「v2 勘误」补注（§6.7），不删原文。§6 全部命令示例已逐条对照工具源码核对并实跑验证
> （`tools/arena2-gen.mjs` / `tools/arena2-verify.mjs` / `tools/arena2-session.mjs`）。
> **不变式**：**I-1 零安装·零网络·零构建**——本指南全部流程均为本地文件流转，不做云/账户/在线服务；
> **I-5 合成定位**——评测为教学游戏，不承诺任何真实诊断能力（措辞受 UI_COPY_GUARDRAILS §6.3 与
> copy-guard 辖区约束，成绩单页脚固定声明见 §6.4）。

## 1. 获取盲包

盲包由组织方（`tools/arena2-gen.mjs` 或 `arena2-session.mjs`）预生成并分发。
盲包含 `bundle-match.json`（match.v2）或 `bundle-round-XX.json`（单轮 round.v2），
内含 `observables`（通道白名单）与 `samples`（601 行 × 通道数）。

## 2. 编写 Agent

参赛 Agent 实现 `create(meta) → { observe(sample, meta), diagnose() }` 接口：
- `meta`：{ systemId, duration_s, dt_s, observables, components, faultFamilies }
- `sample`：{ t, s: { signalId: value } }（逐采样点）
- `diagnose()` 返回：
  `{ faultDetected, faultType, component, magnitude: {value,unit}, detectTime_s, confidence }`

## 3. 组装提交 JSON

```json
{
  "protocol": "v2",
  "agent": { "name": "my-agent" },
  "testset_id": "<盲包中的 testset_id>",
  "match_id": "<盲包中的 match_id>",
  "results": [
    { "round": 1, "diagnosis": { … } },
    { "round": 2, "diagnosis": { … } }
  ]
}
```

## 4. 评分与复核

```bash
node tools/arena2-verify.mjs --bundle bundle-match.json \
  --submission submission.json --reveal reveal.json
```

成绩单含 score_hash（SHA-256 canonical_json），第三方可离线复算。

## 5. 禁则

- 不得读取 reveal.json（真值映射——赛后公布）
- 不得修改盲包数据
- 评分 = 合成故障评测游戏，非真实诊断性能

---

## 6. 对外公开场次（v2 新增）

> 依据：路线图 C-1（公开场次 = 多 Agent 报名 + 统一盲包 + score_hash 公示）、
> `ARENA_EVAL_PROTOCOL_APPROVED.md` v1.1（§3 测试集冻结、§4 组织方约束与 Verifier 独立性、
> §5 盲包 schema、§6.2 校验链、§7 reveal、§9 裁定、附录 B AE 码）。
> 评测轨为纯 CLI（协议 §8：页面 UI 零改动即可发布），本章所有流程零网络、零账户（I-1）。

### 6.0 场次角色一览

| 角色 | 持有 | 不持有 | 关键纪律 |
|---|---|---|---|
| **组织方** | set_seed→场景映射（reveal）、盲包生成器 `arena2-gen.mjs` | — | 赛前不泄露 reveal；计分场种子每场新抽（§6.1） |
| **可信评测器 Verifier** | 盲包 × 提交 × reveal（唯一同时持三者） | — | 与被评 Agent 无共享代码路径；评分单源复用 `FL.arena.scoreDiagnosis`（`tools/arena2-verify.mjs:39-42`） |
| **参赛者（A2）** | 盲包文件、公开协议 | set_seed、reveal、真值 | 只从盲观测流统计推断（§2/§5 禁则） |
| **第三方复核人** | 盲包 + 提交 + 赛后公布的 reveal、公开协议 | — | 用同一 verify 命令复算 score_hash（§6.4） |

演示轨（页面内 Arena，六页之 06）与本评测轨相互独立；评测轨计分不经过页面（协议 §1.1/§8）。

### 6.1 组织方角色与 reveal 管理流程

组织方是场次唯一的真值保管人：

1. **赛前生成**：用 `arena2-gen.mjs` 生成测试集与盲包（§6.3），同时产出组织方保管件
   `reveal.json`（schema `faultlab.arena.reveal.v1`，含 `set_seed` 与 `match_id→truth` 映射、
   `scenario_rules`、`scoring_rules_spec`、`engine_version`/`model_version`；
   `src/core/arena-protocol.js:417-430`）。
2. **赛中保管**：reveal.json 绝不进分发清单、绝不入参赛工具链——生成器含真值构造逻辑，
   不向参赛者分发（`tools/arena2-gen.mjs:10`；协议 §3「生成器不进参赛工具链分发」）。
3. **截止后公布**：reveal 公布时点 = 该场次截止后（协议 §7）；公布前组织方不得泄露映射。
   reveal 自身含 `generated_at` 墙钟字段（`arena-protocol.js:428`），但它不是 score_hash 的
   输入；计分哈希只绑盲包/提交字节与各轮分项（§6.4）。
4. **公布后复核**：任何第三方用 §6.4 命令离线复算并比对 score_hash。

组织方四条硬约束（协议 §4，违反任一条该场次计分无效）：

| # | 约束 | 工具层面的注意点 |
|---|---|---|
| O-1 | 计分场次 set_seed **每场新抽**；禁用演示默认 seed（20261027）及与 open_seed 演示集共享的种子 | `arena2-gen.mjs`/`arena2-session.mjs` 的 `--seed` 缺省值恰为 20261027（`arena2-gen.mjs:28`、`arena2-session.mjs:27`）——**计分场次必须显式传新 seed** |
| O-2 | 组织方关联 Agent 参赛须在成绩单/场次档案披露，且该场次 Verifier 回避（以第三方复算为准） | 在场次 README（§6.6）中披露关联关系 |
| O-3 | 测试集发放即冻结：score 与 testset_id 绑定，同场次禁止重抽（防 seed-shopping） | 一场只跑一次 `arena2-gen.mjs`；对全员分发**同一组** bundle 文件 |
| O-4 | 赛前不泄露 reveal 映射（协议 §7） | 分发清单只含 `bundle-*.json`（§6.3 末条核对） |

当前工具链只产 `bundle_kind:"arena_blind"` 计分包（`arena-protocol.js:403`）；`open_seed`
演示包属页面导出后续项（协议 §5.4/§8），且计分轨对其**硬拒收**（AE-E03），不在本章命令范围。

### 6.2 报名与 Agent 接入

报名与提交均为**本地文件流转**（I-1：无账户、无在线注册、无上传服务）：

1. **报名**：参赛者向组织方登记 Agent 名与作者署名（线下任意渠道约定）；组织方维护一份本地
   报名清单（建议 `entrants.md`：序号 / agent.name / 作者 / 关联披露项）。
2. **发放**：组织方把统一盲包的 `bundle-*.json` 文件交付参赛者（文件复制即可，工具链零网络）。
3. **接入**：参赛者按 §2 接口实现 Agent（Node 18+，`create(meta) → { observe, diagnose }`），
   本地跑通后按 §3 组装提交 JSON——必须携带 `protocol:"v2"` 与 `testset_id`/`match_id`
   绑定字段（缺失或不一致会被 V-07 拒收，AE-E14）。
4. **提交**：把 `submission.json` 文件交回组织方（本地文件）。
5. **多提交**：裁定为「取最高 + 全次留痕」（协议 §9 QP-3）；当前 MVP 工具链按「一份提交一份
   成绩单」处理，多提交由组织方归档多份 `submission-*.json`/`score-report-*.json` 实现，
   聚合比较为人工步骤（多场聚合属路线图 C-4，§6.5）。
6. **命名纪律**：`agent.name` 建议 ASCII；归档文件名会把非 `[A-Za-z0-9]` 字符替换为 `_`
   （`arena2-session.mjs:95`），如 `builtin/sensor-limit` → `builtin_sensor_limit`。

### 6.3 统一盲包生成（closed-world）

一场次一次生成、全员同一盲包（O-3）。命令与参数逐一对应 `tools/arena2-gen.mjs:21-32`：

```bash
node tools/arena2-gen.mjs --system FL-001 --rounds 6 --seed <每场新抽整数> --noise --out out/arena2-<场次代号>
```

| 参数 | 缺省 | 说明 |
|---|---|---|
| `--system` | `FL-001` | 系统标识 |
| `--rounds` | `6` | 隐藏轮数，clamp 1–12 |
| `--seed` | `20261027` | 场次种子（取绝对值）；**计分场次必须显式指定新值，不得用缺省**（§6.1 O-1） |
| `--noise` | 关 | 测量噪声开关（flag，不接值） |
| `--out` | `out/arena2-<时间戳>` | 输出目录（目录名含墙钟，但包内容零墙钟字段） |

产出（`arena2-gen.mjs:82-89`，均已实跑确认）：

- `bundle-match.json` —— 主分发件，match.v2（多轮）；N=1 时为 round.v2 单轮包
- `bundle-round-XX.json` —— 逐轮副本（round.v2，XX 两位零填充），可选分发
- `reveal.json` —— 组织方保管件，**不入分发清单**（§6.1 O-4）

sr1 冻结常量：`dt=0.1 s`、`duration=60 s`、每轮 601 点（`arena-protocol.js:26`）。
closed-world 三查合一（协议红线 2）：键名禁词并集 + 语义禁项 + 白名单外字段拒收；
生成器落盘前自跑 `validateBundleV2` 全量校验，未过即退出非零（`arena2-gen.mjs:74-79`）。

**分发前核对清单**：① 分发目录只有 `bundle-*.json`；② 每份包 `bundle_kind:"arena_blind"`、
`arena_version:"2.0"`、零墙钟字段；③ testset_id/match_id 记入场次档案（§6.6 README）。

**端到端演练（组织方赛前自测，可选）**——一条命令走完 生成→内置 Agent 盲测提交→评分落章
（`tools/arena2-session.mjs:1-10`）：

```bash
node tools/arena2-session.mjs --rounds 3 --sessions 2 --agents all --out evidence/_selftest/dry-run
```

| 参数 | 缺省 | 说明（对应 `arena2-session.mjs:25-33`） |
|---|---|---|
| `--system` / `--rounds` / `--seed` / `--noise` | 同 gen | 语义同 §6.3 表 |
| `--sessions` | `1` | 场次数，clamp 1–10；N>1 时输出到 `<out>/session-XX/`，第 i 场 seed = `seed + i×7919`（`arena2-session.mjs:107-110`），每场独立 testset_id |
| `--agents` | 前 3 个内置 Agent | 逗号分隔 id（如 `cusum,bayes`）或 `all`；内置 id：`sensor-limit`/`residual`/`cusum`/`bayes`/`fusion`（`src/agents/builtin-agents.js:760-800`） |
| `--out` | `out/arena2-session` | 归档根目录 |

演练产物即 §6.6 档案结构；演练目录不作为公开场次归档（避免与正式场次混淆）。

### 6.4 verify 与 score_hash 公示

**Verifier 命令**（参数与 `tools/arena2-verify.mjs:34-37` 一致；实跑通过）：

```bash
node tools/arena2-verify.mjs --bundle <bundle-match.json> \
     --submission <submission.json> --reveal <reveal.json> \
     [--out <score-report.json>]
```

- `--bundle`/`--submission`/`--reveal` 必填，缺任一立即退出码 1（`arena2-verify.mjs:26-33`）；
- `--out` 可省略，缺省写到盲包同目录 `score-report.json`（`arena2-verify.mjs:37`，实跑确认）；
- 相对路径按**仓库根**解析（`path.resolve(ROOT, …)`），从仓库子目录运行亦然（实跑确认）；
- 退出码：`0` = 校验链 V-00…V-10 全过并落章；`1` = 拒收（AE-* 错误，协议附录 B；
  拒收时输出错误码 + 字段路径 + 修复建议，`arena2-verify.mjs:82-87`）。

**成绩单**（schema `faultlab.arena.score.v2`）字段：`bundle_kind`、`testset_id`、`match_id`、
`scoring_rules:"v2"`、`notice`、`rounds[]`（`index` + `detection`/`family`/`component`/
`magnitude`/`latency`/`calibration`（4 位小数十进制串）+ `falseAlarm` + `round_score`）、
`avg_score`、`score_hash`；`notice` 固定为「合成故障评测游戏，非真实诊断性能」
（`arena-protocol.js:692`，I-5 落点）。

**score_hash 构成**（协议 §4；`arena-protocol.js:680-695`）：

```
score_hash = SHA-256( canonical_json{ blind_sha256, submission_sha256,
                                      scoring_rules_spec_hash,
                                      rounds[]{index, 分项十进制串, round_score} } )
```

`blind_sha256`/`submission_sha256` = 盲包/提交**分发文件原始字节**的 SHA-256
（v2 盲包零墙钟字段，字节稳定，故可离线复算；`arena2-verify.mjs:66-67`）。

**公示流程**：

1. **截止时**：组织方公示每份成绩单文件本体（含 score_hash 与全部轮分项）——本地文件交付或
   线下张贴均可，无在线服务（I-1）；
2. **截止后**：公布 `reveal.json`（协议 §7）；
3. **第三方复核**：用与公示**相同字节**的 bundle/submission/reveal 跑同一条 verify 命令，
   比对 `rounds` 各分项、`avg_score` 与 `score_hash` 完全一致即复核通过——这正是场次档案
   README 的固定复核方式（§6.6；eval-session-001 已按此归档）。复核不通过的公示件标注
   「复核未过」，不得计入场次结论。

### 6.5 成绩单导入/导出

成绩单是**自包含 JSON 文件**（`faultlab.arena.score.v2`）：导入/导出即本地文件的复制与归集，
无格式转换、无网络上传、无账户（I-1）。

- **导出**：`verify --out <路径>` 指定落点（§6.4），或 `arena2-session.mjs` 自动写
  `score-report-<agent>.json`（`arena2-session.mjs:97`）。对外发布**保留原文件**；
  score_hash 绑定两份输入文件字节与全部轮分项，任何一方改动提交或盲包都会使复核失配。
- **导入**（组织方归集参赛者自评成绩单、或第三方回传复核成绩单时）：
  1. 核对 `schema:"faultlab.arena.score.v2"` 且 `testset_id`/`match_id` 与本场一致；
  2. 用 §6.4 命令对该导入件对应的 submission 重跑 verify，比对 `score_hash`——不一致者标记
     「复核未过」，不进公示结论；
  3. 导入件与本场盲包字节绑定：把成绩单挪用到其他 testset 的提交上无法通过 V-07/V-08
     绑定校验（AE-E14，实跑确认：篡改 testset_id 后 verify 以退出码 1 拒收）。
- **边界**：多场次聚合/排序表属路线图 C-4（v0.7.0）范围，本章不提供聚合命令；当前一切汇总
  由人工在本地文件上完成。不做云排行榜/在线对战/账户（路线图「架构」红线，I-1）。

### 6.6 场次归档目录规范

单场目录命名 `eval-session-NNN`（三位序号递增）；系列演练/多场一次跑可用工具原生的
`session-XX/` 子目录（`--sessions N`，§6.3）。目录内容与既有归档
`FaultLab-evaluation/NEXT/evidence/g8/eval-session-001/` 一致：

```
eval-session-NNN/
  bundle-match.json          # 统一盲包（主分发件，closed-world，零墙钟字段）
  bundle-round-XX.json       # 逐轮副本（gen 产出；可选归档）
  reveal.json                # 组织方保管件——仅在场次截止后进入公开档案
  submission-<agent>.json    # 每份提交（agent 名非 [A-Za-z0-9] → '_'；可加序号前缀排序）
  score-report-<agent>.json  # 每份成绩单（verify 落章，与 submission 同名对应）
  README.md                  # 场次说明（必填项见下）
```

`README.md` 必填项（沿用 eval-session-001 模板）：

1. 生成命令原文（含 `--seed` 以外的完整参数）与生成日期；
2. `testset_id` 与 `match_id`；
3. 参赛与成绩表（游戏分，场均为各轮平均）；
4. 复核方式三条：读 `reveal.json` + `bundle-match.json` → 对每份 `submission-*.json` 运行
   §6.4 verify 命令 → 核对 `score_hash` 与 `score-report-*.json` 一致；
5. 页脚定位声明：「评分=合成故障评测游戏，非真实诊断性能」（`arena2-session.mjs:114` 同款）；
6. 组织方关联 Agent 披露项（§6.1 O-2，如适用）。

纪律：`reveal.json` 在场次截止前**不得**出现在任何公开档案或分发目录（§6.1 O-4）；归档入
git 时沿用仓库现有 evidence 目录惯例（`FaultLab-evaluation/NEXT/evidence/g8/`）。

### 6.7 v2 勘误与 v1 差异（补注，不改 v1 原文）

- **§4 命令**：v1 示例缺 `--out`——非错误（可省略，缺省写到盲包同目录 `score-report.json`），
  v2 在 §6.4 补全为含 `--out` 的完整形态并注明缺省行为。
- **§1 表述精确化**：N>1 时主分发件为 `bundle-match.json`（match.v2）；`bundle-round-XX.json`
  是生成器额外产出的逐轮副本（round.v2），二者同源（`arena2-gen.mjs:82-88`）。
- **§5 禁则补充**：计分轨对 `open_seed` 包硬拒收（AE-E03，非「标注不计分」的软声明）；
  提交必须携带 `testset_id`/`match_id` 绑定（缺失/不一致 AE-E14）——v1 未列，v2 经 §6.2/§6.4 补全。
- **前置精确化**：评测轨命令均为 Node CLI（Node 18+ 即可，Python 非必需；Python 3.9+ 仅
  AGENT_PROTOCOL §6 伪代码参考所需）。

---

**修订记录**：v1（协议 v2，2026-10-30 起）→ **v2（2026-11-04，W1-4 / 路线图 C-1）**：追加
§6「对外公开场次」（组织方角色与 reveal 管理、报名与 Agent 接入、统一盲包生成、verify 与
score_hash 公示、成绩单导入/导出、场次归档目录规范）+ §6.7 勘误补注；v1 §1–§5 原文保留。
§6 全部命令示例与 `tools/arena2-gen.mjs` / `tools/arena2-verify.mjs` / `tools/arena2-session.mjs`
实际 CLI 参数逐一核对并实跑验证（gen/session/verify 各形态 + 拒收路径）。
评分 = 合成故障评测游戏，非真实诊断性能。**文件结束**。
