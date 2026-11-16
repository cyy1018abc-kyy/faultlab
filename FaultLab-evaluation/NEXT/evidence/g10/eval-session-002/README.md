# eval-session-002 — Arena L2 评测会话（R-G10-02 归档件）

> **日期**：2026-11-16 · **协议**：Arena L2（G10——G9_G10_ARCH_GATE_SPEC_DRAFT §3 逐字承接）
> **会话形态（诚实登记）**：**harness 端到端验证会话**——agent = Lead 会话以 **MCP stdio
> 协议客户端**扮演外部 Agent（`agent-mcp-client.mjs`，本目录存档可复现）。R-G10-02 的
> 第三方独立 Agent 会话面**维持开放**（后置会话可并存归档，编号顺延 eval-session-003+）。

## 1. 会话参数

| 项 | 值 |
|---|---|
| 测试集 / 场次 | `arena2-FL001-4-dae596a1` / match `9316b6a5-ec69-4b1b-acc1-581119a53a02` |
| 系统 / 轮数 / seed | FL-001 / 4（3 故障局 + 1 健康局——小样本覆盖保护）/ 20261116（noise=false） |
| 盲包 | `blind_pack.json`（schema `faultlab.arena.l2.blindpack.v1`——双层遥测：coarse_beacon 2.0 s ×31 行 / high_res_store 0.1 s ×602 行含 pre/post 边界行） |
| 预算 | B_max=180 / B_min=45（c_i = K×M） |
| agent 数据边界 | **仅 MCP JSON-RPC 响应**（盲遥测）——reveal.json 仅 verify 阶段读取，agent 进程零真值接触 |

## 2. agent 探查与判读（账本 165/180 点）

| episode | 探查路径（代价） | 判读 | 真值（赛后核对） | 一致 |
|---|---|---|---|---|
| ep1 | beacon 候选 I_bat_meas @22 → locator 8 + onset 20 + prop 20 | sensor_drift 16A t=21.1 | sensor_drift 16A t=21.1 comp=sensor | **全对** |
| ep2 | beacon 候选 I_bat_meas @46 → 8+20+20 | sensor_drift 29A t=45.8 | sensor_drift 29A t=45.8 | **全对** |
| ep3 | beacon 候选 I_bat_meas @36 → 7+20+20 | sensor_drift 4A t=34.8 | sensor_drift 4A t=34.8 | **全对** |
| ep4 | 无显著阶跃 → 稳态切片 22 | healthy（no-alarm） | none | **全对** |

判读精度说明：精确触发时刻与幅值来自 **边界行**（pre/post 左极限/采样对）——onset 切片
`includes_pre_post=true` 为 V-11a 接地要件；幅值 = 边界行 pre/post 差（闭环下物理状态在
触发瞬间 C⁰ 连续 ⇒ 差值 = 偏置精确值）。

## 3. 评分（arena2-verify --session 落章）

- **场均 82.2222**（S_diag 50 ×4 + S_anchor 30 ×4 + S_eff 2.22——账本效率加权
  (180−165)/135；agent 探查预算较粗，S_eff 为其自身成绩面，非协议缺陷）
- V-11a/b：三故障局全接地；健康局 steady_state 锚点 +30（50 = S_diag+anchor 满配）
- **score_hash = 59b0922915a52520…**（完整值见 `l2-score-report-mcp-client.json`）
- **重放一致性**：arena2-verify --session 双次执行 → 成绩单文件 SHA-256 逐字节一致
  （`2f88e6bf005eac66…`）——score_hash 可复现 ✓

## 4. 归档清单

| 文件 | 性质 |
|---|---|
| `blind_pack.json` | L2 盲包（closed-world 校验过；零真值） |
| `bundle-match.json` / `bundle-round-XX.json` | v2 盲包（同场次分层封装——L2 与 v2 共用 testset/match id） |
| `reveal.json` | 组织方保管件（含真值映射 + rule_id 增补；赛后公布） |
| `agent-mcp-client.mjs` | agent 角色脚本（MCP 协议客户端——会话可复现载体） |
| `submission-mcp-client.json` | 封存提交（query_ledger 10 条 + submission_sha256） |
| `l2-score-report-mcp-client.json` | 成绩单（score_hash 落章） |

## 5. 登记边界

- 本会话满足 R-G10-02 的「完整 L2 评测会话 + MCP Agent 提交 + score_hash 可复现」机检面；
  **第三方独立 Agent 会话仍为接受面终点**（本会话不虚称为第三方）——Lead 会话扮演 agent
  的独立性边界 = 协议边界（盲遥测 only），已在脚本头声明并由归档可复核。
- 会话过程零代码面变更（agent 脚本为证据文件非工具面改动）——V1100 版本面条件走
  「不切版本发布」分支（v1.7.0 先例）。

**文件结束**（2026-11-16，记录人：Lead Agent——V1100 承接会话）。
