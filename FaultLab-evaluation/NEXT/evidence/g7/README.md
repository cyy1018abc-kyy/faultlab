# G7 实施证据包（V0.3 第一批实现：盲评测协议 v2 评测轨 MVP，2026-10-30）

> **性质声明**：本目录记录 G6-WS-D 放行的**评测轨 MVP 五件套**实现与验证证据（协议
> `ARENA_EVAL_PROTOCOL_APPROVED.md` §8；评审 D F-06 MVP 清单）。全部为内部一致性与可复核性证据；
> `model_validation=not_performed`、`hardware_verification=not_performed` 保持不变。
> 页面 UI 零改动（评测轨纯 CLI）；`model_provenance`/scope/白名单语义零改动（arena.js 仅改为
> 反向调用共享模块，行为逐位等价——arena.test.js 155/155 回归佐证）。

## 1. 交付物（协议 §8 MVP 五件套）

| # | 交付物 | 说明 |
|---|---|---|
| 1 | `src/core/arena-protocol.js` | 共享模块（零 DOM、Node 可加载）：sealedProjection 键名禁词**并集**（§6.1a，含裸键 fault）+ 语义禁项（seed/noise → AE-E03；events/trigger_s/t_start_s/t_fault → AE-E04）；场景流 + 健康局覆盖保护 + deriveTruth + blindObservables + buildSamples（自 arena.js 抽出，arena.js 反向调用，杜绝双实现漂移）；盲包 v2 构造（closed-world 白名单、零墙钟字段、CSPRNG 标识符）；V-00…V-06b 校验链；提交绑定（V-07/V-08）；评分落章（V-09/V-10，score_hash = SHA256(canonical_json)，复用 Canonicalization v1 `hashObjectStrict`）；sr1 冻结常量（dt=0.1/duration=60/601 点/时刻 2–52 s）与 SCORING_SPEC_TEXT 冻结文本（spec 哈希入成绩单） |
| 2 | `tools/arena2-gen.mjs` | 组织方生成器：场景流（共享模块）→ simulate → 盲观测流 → v2 盲包（match/单轮）+ reveal（set_seed + truth 映射，组织方保管）；生成前自检 validateBundleV2；生成器不进参赛工具链（含真值构造） |
| 3 | `tools/arena2-verify.mjs` | 可信评测器 CLI：V-00…V-10 全链 + 成绩单落章；评分复用 `FL.arena.scoreDiagnosis`（单源，禁止双实现） |
| 4 | `tests/arena-protocol-negative.test.js` | 附录 A **17 条负例**冻结 fixtures（N-B1…N-B17）+ MVP smoke（确定性/零墙钟/标识符 CSPRNG/完美对局 100 分/score_hash 确定性与敏感性）+ QP-4 假候选率实测 |
| 5 | `tools/run-g2.mjs` | 挂步：`G6 arena-protocol-negative.test.js`（聚合 16→17 步） |

配套：`src/agents/arena.js` 改为反向调用共享模块（MVP-2）；`tests/core-load.js`、
`tests/arena.test.js`、`index.html` 加入 `arena-protocol.js` 加载项；`.gitignore` 增 `out/`（生成器输出目录）。

## 2. 验证结果（本轮实测）

| 验证 | 命令 | 结果 |
|---|---|---|
| 协议负例 + smoke | `node tests/arena-protocol-negative.test.js` | **42/42 PASS**（N-B1…N-B17 全数按期望 AE 码拒收；完美对局场均 100；score_hash 确定且对篡改敏感） |
| 既有 Arena 回归（确定性/隔离/评分） | `node tests/arena.test.js` | **155/155 PASS**（重构后逐位等价） |
| 措辞护栏 | `node tools/copy-guard.mjs` | **exit 0**（29 模式，src/** 命中清零；新文件无允许串扩充、无 deviations） |
| 聚合门禁 | `node tools/run-g2.mjs` | **17/17 PASS**（ok=true，failed=0，含 E2E 40 断言基线与双 golden verify）——报告 `artifacts/run-g2-report.json` |
| CLI 端到端 | `arena2-gen`（1 轮与 4 轮、含噪）→ 构造完美提交 → `arena2-verify` | 双形态通过；4 轮完美对局场均 100、score_hash 落章（`9d2be9a5…`）；单轮 bundle-round 与 match 双 schema 均过 V-01…V-06b |

## 3. QP-4 前置：deriveChangePoints（sr1）假候选率实测发布

- 算法（sr1 冻结）：逐通道一阶差分对中位数的偏离 > 5σ（σ=1.4826·MAD，稳健），相邻合并；
  定性 = **事件信息的观测派生等价物**（协议 §6.3 v1.1）。
- 实测（30 局含噪健康局 + 30 局随机场景对照，`tests/arena-protocol-negative.test.js` 尾段）：
  **健康局假候选率 0/30 = 0.00**；sensor_drift 故障局阶跃邻近（±0.3 s）检出 7/8，其中可测幅值
  （≥5 A，信噪比充足）**7/7 = 1.00**——小幅值阶跃低于 5σ 噪声阈属数据受限，不计失败。
- **结论**：QP-4 前置满足，deriveChangePoints 可按 sr1 对外提供（低门槛基线用途）。

## 4. 实现期偏差记录（接 evidence/g2/deviations.md 序列）

| # | 偏差 | 理由 |
|---|---|---|
| D-13 | 协议 §6.2 的 V-04a/V-04b/V-05/V-06/V-06b 判定顺序在实现中按「先逐轮网格/数值/观测、后 V-06/V-06b」执行；AE-E15（深度/体积）前置为 V-00 首查 | 与协议 §6.2 表一致（V-00 在表内即首步）；实现顺序注释化，无语义偏移 |
| D-14 | N-B13 的「种子材料」判定以**格式 + 批准清单**双查实现（approvedTestsetIds 注册制），不做事后反推 | 协议 §3/§5.6 原文即注册制语义；测试以注入不一致清单触发 AE-E13 |
| D-15 | `arena2-verify.mjs` 的 `blind_sha256`/`submission_sha256` 取分发文件 utf8 读入后 `hashString`（等价文件字节 SHA-256） | hash.js sha256 内部 utf8Bytes 编码，与文件字节一致；smoke 断言复算一致 |
| D-16 | 单轮生成时 gen 同时产出 `bundle-round-01.json` 与 `bundle-match.json`（同内容两种 schema） | 分发便利性；两者均过 V-01…V-06b（CLI 双形态实测） |

## 5. 复核命令

```powershell
node tests/arena-protocol-negative.test.js     # 42/42（负例 + smoke + 假候选率）
node tests/arena.test.js                        # 155/155 回归
node tools/copy-guard.mjs                       # exit 0
node tools/run-g2.mjs                           # 17/17
node tools/arena2-gen.mjs --system FL-001 --rounds 4 --seed 271828 --noise --out out/demo
node tools/arena2-verify.mjs --bundle out/demo/bundle-match.json --submission <提交> --reveal out/demo/reveal.json
```

**门禁状态**：G7-评测轨 MVP 集成验收**通过**（本目录证据）；G8（发布 v0.3.0）未启动。
Arena 评测轨仍为 `extension_preview` 定位：评分为「合成故障评测游戏，非真实诊断性能」。

**记录人**：实现 Agent，2026-10-30（V0.3 第二批实现）。
