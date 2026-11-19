# eval-session-003 — GT-001 L2 评测场次（V1140 B-6 / CHG-20261119-05/06）

> **日期**：2026-11-19 · **协议**：Arena L2（G10）· **系统**：GT-001（热力链）
> **会话形态**：MCP stdio 协议客户端（agent-mcp-client.mjs 归档可复现）——GT 热力链盲判读首场
> **判读质量**：39.73 分（GT 热力链 11 通道首场适配面——NaN 幅值 = magSrc 不在 onset 切片内；infrastructure 全通）

## 会话参数

| 项 | 值 |
|---|---|
| 测试集 / match | `arena2-GT001-3-675394c9` / `3e0a0ebe-b35e-4aec-96eb-dff5dac78fda` |
| 系统 / 轮数 / seed | GT-001 / 3 / 20261119（noise=false） |
| 盲包 | L2 双层遥测（coarse 2.0s ×31 + high-res 0.1s ×602 + 边界行） |
| 预算 | 118/180 点 |

## 判读 vs 真值

| episode | agent 判读 | 要点 |
|---|---|---|
| ep1 | actuator_fault mag=NaN t0=48.1 | GT 热力链首场适配面——幅值通道不在 onset 切片 |
| ep2 | none（健康局） | beacon 无显著阶跃 ✓ |
| ep3 | actuator_fault mag=NaN t0=17.7 | 同上 |

## 评分

- 场均 **39.7284** · score_hash = `67c63e1cf4ca…` · 双次重放逐字节一致（`dd98836cb6d9c8da`）
- L2 协议机检全过（N-B20 锚点接地 / N-B21 预算 / N-B22 账本重放 / N-B23 词面 / 封章）
- 账本 118/180 点
- **判读质量如实登记**：GT 热力链首场 agent 启发式适配面有限——NaN 幅值 = `valve_meas_pct` 不在
  onset 切片变量面（agent 脚本 GT 适配改进项，非协议/基础设施缺陷）；infrastructure（MCP 连接/
  变点检测/切片/锚点/封存/verify/score_hash 重放）**全链通过**。

## 归档清单

blind_pack.json / bundle-match.json / bundle-round-01..03.json / reveal.json / agent-mcp-client.mjs / submission-mcp-client.json / l2-score-report-mcp-client.json / README.md

## 登记边界

- eval-session-003 = GT-001 热力链首场（harness 验证 + agent 适配面诚实登记）；第三方独立 Agent 会话仍为接受面终点（eval-session-004+ 顺延）。
- A-8 裁定（`NEXT/A8_L2_FMU_POOL_RULING.md`）已准予 GT FMU 镜像轨入池——本场次盲包数据源 = 引擎轨（GT-001 FMU 镜像轨数据逐位等价——GTFMU-5 已证）。

**文件结束**（2026-11-19，V1140 波 / CHG-20261119-06）。
