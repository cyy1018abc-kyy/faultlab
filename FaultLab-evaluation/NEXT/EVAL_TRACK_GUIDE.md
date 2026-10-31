# EVAL_TRACK_GUIDE — 评测轨外部 Agent 接入指南（v1，协议 v2）

> **定位**：参赛者（Agent 作者）的完整接入指南。评分 = 合成故障评测游戏，非真实诊断性能。
> **前置**：FaultLab 仓库（含 `tools/arena2-verify.mjs`）、Python 3.9+ / Node 18+。

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
