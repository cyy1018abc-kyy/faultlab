# V1111_WAVE_DESIGN — v1.10.1 波设计（bridge→fmu_runner HTTP 端到端接线深化）

> **性质**：阶段设计文档（Lead 起草，2026-11-18）——承接 CHG-20261118-02 ④ v1.10.x 待办
> 首项「bridge.py→fmu_runner 端到端接线深化（HTTP 面实调——adapter bridge 模式实跑）」。
> **授权记录（CHG-20261118-05）**：用户 2026-11-18 指令「推送/继续」——推送兑现
> （CHG-20261118-04）+ v1.10.x 待办继续——**DEC-1…3 全采推荐项**。

---

## 0. 本波边界

**做**：
1. **bridge.py additive**：`GET /capability`（FMU 专用能力面——model_id/fmu_sha256/ready）
   + `POST /simulate-fc001-fmu`（run_fc001_shell 委托——64 位解释器内进程导入；32 位/产物
   缺位 ⇒ 结构化 503 fmu-unavailable 不静默）；既有 /capabilities、/simulate、安全边界
   （回环 + Origin 白名单 + Sec-Fetch-Site + token）零触碰；
2. **adapter additive**：`bridgeRun(fetchImpl, runKey)`（POST 委托 + fmu_sha256 回传）——
   fetch 注入式（core 零网络 API 直调纪律维持）；
3. **E2E 测试**（并入 tests/backend-bridge.test.js——run-g2 步账 36 维持）：64 位解释器
   起 bridge 实例 → /capability 能力面 → /simulate-fc001-fmu 实调 → **桥服务 C Run 序列
   与 data/golden/fc001_fmu_v1.json 全等断言**（parity 0.0 的 HTTP 面复证）；无 64 位
   解释器环境 ⇒ 断言段 skip（SKIP 语义——V312 §9⑥）。

**不做**：linux64 平台矩阵（重钉须 CHG）、第三方 L2 会话（开放面）、C3（挂起维持）、
既有端点/安全边界变更。

**版本**：v1.10.1（patch——bridge 端点 + adapter 方法 + 测试段全 additive；零 breaking）。

## 1. 决策点（全采推荐项）

### DEC-1：FC 桥实现 = 64 位解释器内进程导入（无子进程回退）
**采纳（推荐）**：bridge 启动解释器位宽决定 FC 面可用性（32 位 ⇒ /capability ready=false
+ /simulate-fc001-fmu 503 结构化原因）——显式暴露不虚设；子进程回退不做（HTTP 面实调
本波目标为端到端验证，非多解释器编排）。

### DEC-2：E2E 断言强度 = 桥服务 C Run ≡ golden 全等
**采纳（推荐）**：R-G9-02 parity 0.0（CHG-20261118-02）的 HTTP 面复证——bridge 返回序列
与 fc001_fmu_v1 golden 序列逐位全等断言（21 列全等）。

### DEC-3：步数账 + additive 三不承诺
**采纳（推荐）**：run-g2 36→36 零增步（E2E 断言并入既有 backend-bridge.test.js 步）；
既有 13 golden 字节零触碰；五类哈希既有输入零变化。

## 2. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | 32 位 bridge 起 FC 面 | ready=false + 503 结构化——显式不静默 |
| 2 | E2E 端口/token 冲突 | --port 0 随机 + discovery 文件（既有机制） |

**文件结束**。V1111_WAVE_DESIGN v1（2026-11-18，CHG-20261118-05 批准，按推荐执行）。
