# L2_SESSION_OPERATIONS_RUNBOOK — Arena L2 评测场次组织方运营手册（B-5 / V07_ROADMAP 主线 B）

> **性质**：运营文档（Lead 起草，2026-11-18；V1120_WAVE_DESIGN S4 / CHG-20261118-08）。
> **定位**：组织方（用户）视角的 L2 评测场次**全流程操作手册**——EVAL_TRACK_GUIDE §6
> 「对外公开场次」在 L2 主动探查协议下的兑现载体；eval-session-003+ 的就绪面。
> **先例**：eval-session-002（in-repo MCP 客户端 harness 验证会话——
> `evidence/g10/eval-session-002/`，判读 4/4 全对、score_hash 双次重放一致）。
> **安全边界**：盲包零真值（键名禁词+closed-world）；reveal 为组织方保管件**绝不入盲包**；
> bridge/评测全程零网络（本地文件流转——I-1）。

---

## 1. 角色与物料

| 角色 | 持有物 | 职责 |
|---|---|---|
| 组织方（用户） | reveal.json（真值映射）+ token | 生成盲包、管理评测、赛后公布 reveal |
| 参赛 Agent（外部） | 盲包（blind_pack.json）+ MCP 客户端 | 经 `tools/arena-mcp-server.mjs` 盲观测探查 → 封存提交 |
| Verifier（本仓工具） | 盲包 + 提交 + reveal | `arena2-verify.mjs` 校验链 + 评分落章（唯一三方汇合点） |

## 2. 场次生成（组织方侧，一条命令）

```bash
node tools/arena2-gen.mjs --system FL-001 --rounds 4 --seed <自有种子> \
     --out FaultLab-evaluation/NEXT/evidence/g10/eval-session-003 --l2
```

产出（同一目录）：
- `blind_pack.json`——**分发物**（L2 双层遥测：coarse_beacon 2.0s ×31 行 / high_res_store
  0.1s ×602 行含 pre/post 边界行；closed-world 校验过、零真值零墙钟）
- `bundle-match.json` / `bundle-round-XX.json`——v2 盲包（同场次分层封装，可选分发）
- `reveal.json`——**组织方保管件**（真值映射 + rule_id；赛后公布，绝不入盲包）

自检内置：gen 落盘前过 `validateL2Pack` + `validateBundleV2` 双校验（失败即退出不产出）。

## 3. 服务参赛 Agent（MCP 面一条命令）

```bash
node tools/arena-mcp-server.mjs --pack <盲包路径>
```

- stdio JSON-RPC 2.0（MCP：initialize → tools/list → tools/call）；
- 三工具：`arena_get_telemetry_summary`（coarse 层，零预算）/
  `arena_slice_telemetry`（high-res 层，c=K×M 计费、B_max=180 硬帽、边界行永不跳过）/
  `arena_export_submission`（嵌 query_ledger + submission_sha256 封章）；
- 每场独立进程/独立账本；Air-Gap 守卫（零网络模块）；
- 自检：`node tools/arena-mcp-server.mjs --self-check --pack <盲包>`（MS-1…7）。

**外部 Agent 接入**：将 `blind_pack.json` 交付 Agent 作者 + 本手册 §3 命令；Agent 只需
实现 MCP stdio 客户端（参考实现 = `evidence/g10/eval-session-002/agent-mcp-client.mjs`）。
**禁止**向 Agent 提供 reveal/token 之外的任何组织方物料。

## 4. 提交回收与校验落章（组织方侧，一条命令）

```bash
node tools/arena2-verify.mjs --session FaultLab-evaluation/NEXT/evidence/g10/eval-session-003
```

- 自动批校验目录内全部 `submission-*.json`（封章 → N-B20 无据锚点 → N-B21 预算 →
  N-B22 账本重放 → N-B23 词面 → V-11a/b 接地 → S_diag+S_anchor+S_eff 评分 → score_hash）；
- 通过者写 `l2-score-report-<agent>.json`（score_hash 可重放——双次执行逐字节一致）；
  拒收者打印 L2-E-* 错误码与修复建议；
- **归档纪律**：`blind_pack.json` / `reveal.json` / `submission-*.json` /
  `l2-score-report-*.json` 全部留存原文件（不重生成——score_hash 复现锚）。

## 5. 场次纪律（协议红线速查）

| # | 红线 | 机检 |
|---|---|---|
| 1 | 盲包零真值/零种子/零事件字段 | V-02/V-03（closed-world） |
| 2 | Agent 只经 MCP 盲遥测（不见 reveal） | 协议边界（Agent 进程物理上无 reveal 访问） |
| 3 | 预算硬帽 B_max=180（c=K×M） | N-B21 / 服务端 L2-E19 |
| 4 | 锚点须有账本据（时窗重叠 ≥80%） | N-B20 |
| 5 | 账本重放哈希一致 | N-B22 |
| 6 | 观测词面禁词（水位/液位/water level/liquid level/验证通过/硬件已验证） | N-B23 |
| 7 | 封章防篡改 | verifySealedSubmission（L2-E22） |

## 6. 场次编号与归档约定

- `eval-session-002` = in-repo MCP 客户端 harness 验证会话（已归档——**不虚称第三方**）；
- `eval-session-003+` = 后续场次（第三方独立 Agent 会话为接受面终点——并存归档编号顺延）；
- 每场一份 README（本手册 §2–§5 命令的实际值 + score_hash + 判读摘要）。

## 7. 系统扩张面（预留）

`--system GT-001|FC-001` 即可生成对应系统盲包（arena2-gen 通用）；FMU 轨入池 =
A-8 裁定面（V07_ROADMAP v1.13）——本手册不预设。

**文件结束**。L2_SESSION_OPERATIONS_RUNBOOK v1（2026-11-18，V1120 S4 / CHG-20261118-08）。
