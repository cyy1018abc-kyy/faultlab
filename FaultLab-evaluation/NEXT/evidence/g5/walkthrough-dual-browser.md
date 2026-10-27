# G5 F-4 双浏览器走查记录（2026-10-28）

> **目的**：关闭 G5 评审发现项 F-4（BACKLOG §6.1 / G0-DEC-03 的支持矩阵：
> Windows 10/11 + Chrome/Edge 最近两个大版本）。执行方式：同一 E2E 旅程
> （`tools/e2e.mjs`，40 断言，覆盖五视图/事件相位/单时钟/回放不变性/golden/
> 因果/证据包/离线无报错）分别驱动 Chrome 与 Edge 无头实例。
> 用户通过目标指令授权执行（CHG-20261028-06）。

## 结果

| 浏览器 | 版本（ProductVersion） | E2E fl001-min | 证据文件 |
|---|---|---:|---|
| Google Chrome | **156.0.8078.48** | **PASS 40 / FAIL 0** | `e2e-report-chrome.json` + `e2e-chrome.png` |
| Microsoft Edge | **156.0.4314.42** | **PASS 40 / FAIL 0** | `e2e-report-edge.json`（`environment.chrome`=msedge 路径、`base`=:4322，归档前已逐字段核实）+ `e2e-edge.png` + 原始日志 `edge-e2e.log` |

两份报告均含：五视图深链与跨页 Run 共享、pre/post 事件契约（pre.t_s=20.0 left_limit、
post I_meas=35）、单时钟跨页保持、回放前后 Run 数据与 run_hash 不变（PHY-08 冒烟）、
指标对解析 golden 关键值、因果 rule_id、证据包浏览器内构建→导入→run_hash 一致、
全程无 console error、无外部网络请求（纯浏览器离线）。

> **证据归档核实说明**：首轮 Edge 归档曾误将 Chrome 的报告（端口 4321）存为
> `e2e-report-edge.json`（Edge 重跑输出被管道截断，未写出报告即退出）。已用**独立输出目录
> `--out artifacts-edge` + 端口 4322 + cdp-port 9355 重跑**，报告内 `environment.chrome` /
> `environment.base` 双字段核实浏览器与端口归属后覆盖归档，完整退出码 0。

## 过程中发现并修复的工具缺陷（不影响产品，仅影响测试工具）

Edge 无头模式的**首个创建 target 的 DevTools 会话可能无响应**（页面 agent 静默，
浏览器级会话正常）；现象为 `Runtime.enable` 超时，重连同 target 无效，
`Target.createTarget` 新建页的会话可靠。处置：`tools/e2e.mjs` 改为统一
「浏览器级 WS + Target.createTarget + attachToTarget(flatten) + sessionId 路由」，
并加自愈（enable 失败自动换新 target 重试，≤3 轮）与 30 s 发送超时防护。
Chrome 在同一最终脚本版本下复跑 40/40（两条证据同版本工具产出）。
另：旧工具 `qa.mjs` 的页面直连模式不适用于 Edge（同缺陷），其 14/14 结果
（默认 Chrome，2026-10-28）作为 UX-01…12 的补充走查记录保留。

## 版本口径说明

R-09 要求"Chrome/Edge 最近两个大版本"。本机实测为 Chrome 156 与 Edge 156
（撰写时两者的当前稳定大版本）；"最近两个大版本"的滚动回归属发布后持续项，
不作为 G5 关闭前置。
