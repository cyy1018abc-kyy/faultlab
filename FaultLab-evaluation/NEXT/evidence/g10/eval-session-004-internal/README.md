# eval-session-004-internal — GT-001 L2 内部参考 agent 场次（ROADMAP C-6 / V1200 B1-4）

> **性质**：**内部参考 agent，非第三方**——验证 L2 基础设施并给出可复现基线分；「合成故障评测游戏，非真实诊断性能」。
> 第三方独立 Agent 会话仍为接受面终点（D-13）。
> **日期**：2026-11-28 · 记录人：Lead Agent（云端会话 claude/gallant-fermat-1d24pe）。

## 会话参数

| 项 | 值 |
|---|---|
| 系统 / 轮数 / seed | GT-001 / 3 / 20261128（noise=false；`node tools/arena2-gen.mjs --system GT-001 --rounds 3 --seed 20261128 --l2`） |
| agent | `tools/arena-ref-agent.mjs` @ **`5de8a72`**（名 `arena-ref-agent@5de8a72`） |
| 协议 | L2 MCP stdio（`tools/arena-mcp-server.mjs`）；评分 `node tools/arena2-verify.mjs --session <本目录>` |

## 评测纪律（V1200 §2——防自我拟合）

1. agent 改动依据 = eval-session-003 **已公开**的失效模式：按绝对跳变排序（rpm 量级压过 kW 阶跃 ⇒ 两局 load_step 误判 actuator）；
   幅值以全观测表下标索引 3 列切片（⇒ NaN）；分类「否则 actuator」兜底；
2. 开发测试只用 scratchpad 自生成的 dev 盲包（seed 1101–1107，共 15 轮全部判对；未入库）；
3. **agent 代码先提交冻结（`5de8a72`），之后才生成本场盲包**；
4. 本场 reveal **在评分完成后才读取**；session-003 归档原样保留、不重评。

## 结果

| 轮 | agent 判读 | 真值（评分后读取） | s_diag / s_anchor / s_eff |
|---|---|---|---|
| ep1 | sensor_drift 0.85 Hz @ 6.4 s | sensor_drift 0.85 Hz @ 6.4 s | 50 / 30 / 12.74 |
| ep2 | none | none | 50 / 30 / 12.74 |
| ep3 | sensor_drift 0.15 Hz @ 5.8 s | sensor_drift 0.15 Hz @ 5.8 s | 50 / 30 / 12.74 |

- 场均 **92.7407** · score_hash = `1533855842abd237e351a98ac50d889153a8934f2326494193b8afe13b67ee7e` · 账本 94/180 点；
- 两次独立 verify 评分报告**逐字节相同**（`verify-run-1.log` / `verify-run-2.log`）；L2 协议机检全过；
- 对照：eval-session-003（归档脚本，seed 20261119）39.7284 分 / 118 点。

## 诚实边界

- **n = 3，且本场三轮只覆盖 sensor_drift 与 none**——session-003 失效的 load_step 未在本场出现（仅在 dev 盲包中验证 4 轮）；
  actuator_fault 亦仅在 dev 盲包验证（3 轮）。本场分数不能外推为各族表现；
- 参考 agent 为启发式规则，非学习模型；对 noise=true、多故障叠加等未测试；
- 内部场次：agent 作者与盲包生成者为同一方（已以「先冻结后生成 + 评分后读 reveal」约束）。

## 归档清单

blind_pack.json / bundle-match.json / bundle-round-01..03.json / reveal.json / submission-arena-ref-agent.json /
l2-score-report-arena-ref-agent.json / agent-run.log / verify-run-1.log / verify-run-2.log / README.md
