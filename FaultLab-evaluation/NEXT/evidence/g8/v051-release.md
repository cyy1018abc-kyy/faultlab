# G8 发布证据 — v0.5.1（D-2a 接口统一 + FC 扩展 golden 链 + C-1 指南）

> **发布**：v0.5.1（CHG-20261104-06）｜ **授权链**：V060_WAVE_DESIGN v1（CHG-20261104-05，
> DEC-A…E 按推荐）→ 用户「统一采用推荐决策，采用并发多个子智能体来加速任务」。
> **执行方式**：动态工作流并发子智能体（dwfrun-76ed11ef，三阶段并行 + run-g2 修复环），九路工作项。

## 1. 交付物（本版本范围）

| 工作项 | 交付 |
|---|---|
| W1-1 D-2a（DEC-A 分层） | `tools/oracle/oracle_base.py`（OracleInterface 归一契约 + approval/sidecar/emit 助手 + V-03「oracle 文件自身字节 sha」语义 docstring + __main__ 契约自检 T-1..T-8）；`NEXT/ORACLE_INTERFACE_D2.md`（golden schema v2 规格 + 三 oracle 事实差异清单 F-1..F-8 + **GT-001 文档化符合/迁移挂起**裁定） |
| W1-2 FC-G2b-02 | `fc001_oracle.py`：load_step 级联子步递推复刻（foStep 逐字，禁连续闭式——尾差实测 5.4e-6/2.8e-6 ≤6e-6 域）、actuator 闭式、RUNS 3→5（+load_step_closed_loop/+actuator_closed_loop）、SERIES_IDS 增 I_fc_ref_A/I_fc_cap_A/valve_cmd_pct/valve_meas_pct（I_fc_cap_A 按 gt001 先例不入 golden series，null 列会破 V-07）、SC-8/9/10（锚点+尾差域）、model_version→1.1.0、method→analytic_flux.2、**approval 重签引 CHG-20261104-06**；**fc001_v1 重出（5 Run）**：sha256 `b073d2df7ad4…79d1e0`（旧 f518c7bc… 退役）、sidecar 重签、V-03b 批准摘要 af93e5aa… |
| W1-3（FC 数值面） | `tests/engine-fc.test.js` Run 键面按 golden.runs 遍历扩到 5 Run（126→294 断言）；批准引用断言 CHG-20261028-04→CHG-20261104-06（golden 元数据断言，重签之必要同步） |
| W1-4 C-1 | `EVAL_TRACK_GUIDE.md` v2：§6 对外公开场次（组织方 reveal 管理 O-1..O-4/报名/盲包生成/verify+score_hash 公示/成绩单导入导出/归档规范），全部命令与 arena2-* 实跑核对，I-1/I-5 落实 |

## 2. 验证

- `node tools/run-g2.mjs` **全量 PASS**（24 步含三系统 verify_golden、engine/engine-fc 对 golden、
  e2e、perf、copy-guard 33 模式 0）；本证据对应两次独立运行：工作流内 + 主流程复验
  （17198 ms，commit=f1e5e78 基线、全树两波并集）；
- `python scripts/verify_golden.py` fl001 20/20、fc001（5 Run）全过、gt001 35/35（**gt001_v2 零变更**，sha c50315c9… 维持）；
- 老 3 Run 序列与备份逐位一致（备份 sha=f518c7bc…，Temp 留档）；新增 2 Run 与引擎 diff=0；
  老 Run 对引擎 worst 1.3e-13~3.9e-13（plant 路径 fp 噪声，基线即如此，rtol 1e-12 内）；
- `python -I tools/oracle/oracle_base.py` → ok=true，T-1..T-8 8/8，契约探针 3/3。

## 3. 覆盖口径声明（CHG-20261104-05 §3 预登记）

并发批次使两波文件共存于工作树；本 tag 的树状态 = 基线 f1e5e78 + 本表交付物（FC 数值链 +
基座 + 指南），其余文件保持基线（基线全绿）。G7 以全树 run-g2 PASS 为准；v0.5.1 侧凭
文件级隔离论证传递有效。FC-G2b-04 的 systems.js 登记面（EQ-6/A-fc-dispatcher/文案/越界域）
因文件级纠缠随 CHG-20261104-07 落地——本版本内 FC 新两族 classify 仍为扩展预览
（scope.js 未扩），与「证据链就绪、族未正式化」的版本语义自洽。

## 4. 预期失效面

fc001_v1 字节/sha 变更（f518c7bc…→b073d2df…）、oracle_source_sha256 更新、approval 重签；
历史盲包/归档局不引用 golden 字节，重放零影响（引擎零改动）；无 FC 盲包存在。

**发布门**：G7（run-g2 24/24）✅ → G8（本证据）✅。批准人：用户（CHG-20261104-05 授权链）；记录人：实现 Agent。
