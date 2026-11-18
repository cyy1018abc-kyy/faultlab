# v1.10.1 发布验收记录（G7→G8 — 2026-11-18，CHG-20261118-06）

> **门禁**：G7→G8（patch——全 additive 零 breaking）。
> **性质**：内部一致性与可复核性证据，不是模型验证/物理守恒验证/硬件验证；FMU 轨声明保留
> （fmu_l1_lumped_unvalidated / synthetic / not_performed ×2——数值与实现自洽 only）。
> **授权**：V1111_WAVE_DESIGN v1（CHG-20261118-05——CHG-20261118-02 ④ v1.10.x 待办首项）。
> **验收日期**：2026-11-18 · 记录人：Lead Agent（V1110 承接会话）。

## 1. 门禁全表（全部真实运行）

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1768.0 KiB**（adapter bridgeRun 面） |
| 2 | `node tools/run-g2.mjs` ×2 独立 | **均全部 PASS exit 0**（113079 / 113385 ms——36 步维持，backend-bridge.test.js 为 extended 步载体） |
| 3 | **FC 桥 E2E**（tests/backend-bridge.test.js **26/26**） | ① `/capability` 能力面 200（model_id=fc.pem.fmu_l1 / ready=true / fmu_sha256=V312 钉值）+ 无令牌 403（安全边界同构）；② `/simulate-fc001-fmu` 委托实调 200 → **桥服务 C Run 序列 ≡ fc001_fmu_v1 golden（21 列逐位全等——R-G9-02 parity 0.0 的 HTTP 面复证）**；③ adapter probeBridge/bridgeRun 注入式实跑（fetchImpl 浏览器契约形状适配）+ V312 钉 hash 回传 |
| 4 | copy-guard | **PASS 43 patterns 0 命中** |
| 5 | verify_golden fc001_fmu | exit 0（V-03 oracle 字节哈希一致——oracle/adapter 双冻结面零触碰） |

## 2. 交付清单

1. **bridge.py additive 两端点**：`GET /capability`（FMU 能力面——ready=false 结构化：32 位
   解释器/产物缺位显式暴露不静默）+ `POST /simulate-fc001-fmu`（run_fc001_shell 委托——
   64 位解释器内进程导入，V1111 DEC-1 无子进程回退）；既有 /capabilities、/simulate、
   安全边界（回环/Origin/Sec-Fetch-Site/token）零触碰；
2. **adapter additive**：`bridgeRun(fetchImpl, runKey)`（fetch 注入式——core 零网络 API
   直调纪律维持；X-Bridge-Token 头对齐 bridge._guard；capability 契约对齐
   {ok, capability:{...}} 嵌套面——兼容平铺）；
3. **E2E 断言段**（backend-bridge.test.js——run-g2 步账 36 维持）：64 位解释器起第二桥
   实例（--port 0 + discovery 隔离）+ 上述三面断言；无 64 位环境 skip（§9⑥）。

## 3. additive 三不承诺兑现

五类哈希既有输入零变化；既有 13 golden 字节零触碰；36 步判据零翻转（backend-bridge 步
断言 additive——既有 23 断言零改动全绿）。

**文件结束**（2026-11-18，记录人：Lead Agent——V1110 承接会话）。
