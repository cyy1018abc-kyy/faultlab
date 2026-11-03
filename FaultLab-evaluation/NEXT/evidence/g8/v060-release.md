# G8 发布证据 — v0.6.0（FL actuator + 白名单 + R-3 property + 参考轨 + FC/FL 正式化）

> **发布**：v0.6.0（CHG-20261104-07）｜ **授权链**：CHG-20261104-05（V060_WAVE_DESIGN，
> DEC-A…E 按推荐）→ 用户「统一采用推荐决策，采用并发多个子智能体来加速任务」。
> **执行方式**：动态工作流并发子智能体（dwfrun-76ed11ef）；v0.5.1 内容之外的全部波次交付。

## 1. 交付物

| 工作项 | 交付 |
|---|---|
| W2-1 FL-G2b-01/02 | `fl001_oracle.py`：actuator 闭式（13.75+11.25·e^(−u/0.4)、SOC 全窗 1054.5 A·s → 59.7070833%）、**monitor 按 family 守卫**（修正 :82-83 无条件 25A 陷阱）、RUNS 3→4（+actuator_closed_loop 55%@20s）、SERIES_IDS 增 I_bat_cap_A（老 Run null 列与引擎一致）、SC-7/8/9；**fl001_v1 重出（4 Run）**：sha256 `f4e852aa271c…afbe25`（旧 6a0c751f… 退役）、approval 重签引 CHG-20261104-07、V-03b 摘要 538b4412…；EV-001 actuator_limit 事件入 golden（事件面完整性补充）；`emit_golden.py` 写盘/批准委托 oracle_base（字节级探针证明零行为差）；`scripts/verify_golden.py` **最小 null 感知修补**（V-07 对 null 列 TypeError 崩溃——双 null 一致/单侧失配；fc001/gt001 回归 exit 0 证明零扰动。偏离 FCEXT §4「无需改动」字面，属启用 null 列的前置，登记为勘误） |
| W1-3/W2-2 登记面 | `systems.js`：FC EQ-6/A-fc-dispatcher/级联 closedLoopEffect/I_fc_ref_A 一般式/越界域 limitations；FL A-fl-clamp/A-l0 双轨 τ（「经过验证」句式）/EQ-A/EQ-B/I_ref_A 一般式/退化域+手拼配置 limitations；`checks.js:138` 采样消息双分支订正；`docs/FAULT_CATALOG.md` v1.1（实现事实/scope 按代码快照/勘误表 +2 行） |
| 引擎测试 | `tests/engine.test.js` 4 Run + **actuator 闭环 vs monitor 逐位等价断言**（16 信号+16 指标全 ===，排除 label/role/effective_mode；166→339 断言）；`tests/registry.test.js` §8 config_hash 键序不敏感 + §9 run_hash 冻结 |
| W2-3 白名单（DEC-C） | `scope.js`：SA-24 families 增 actuator_fault（actuator_magnitude_pct=55 钉扎）；FC approved_fc 分支扩四族；B-1 `fl001_analytic.py` actuator 闭式（对 golden max\|Δ\|=0.0 逐位同）、B-5 `fl001_ode_rk4.py` RK4 同 ODE（max\|ΔI\|=1.66e-4，声明档 rtol 1e-3 预算内）、两后端自检 +AC-5/RK-4；`tests/backend-admission.test.js` 4 Run + actuator 断言；`tests/scope-guard.test.js` actuator 放行 + 越界负例（60%/t_start=30/负载 35）仍拒收。**SA-24 白名单扩大由本 CHG 显式解除**（CHG-20261104-03 §4 预留的实现期裁定） |
| W2-4 property（R-3） | `tools/oracle/properties/property_harness.py`（stdlib、种子 20261104）：P1 能量平衡/P2 r_true≡0/P3 事件相位，FL 240 组 + FC 交叉 27 组，ddmin-lite 最小化 + 检测力阴性自检 D-1..D-4，运行前后 oracle 文件 sha 不变（V-03 安全）、无 src 模块导入自证 |
| 参考轨 | `NEXT/Q5_ADMISSION_FIELD_TABLE.md`（R-2a：FMI 字段表 × V312 三态 28 条，行号经 FMPy main@e42e288f 逐行核对）、`RFC_MODEL_INTERFACE_I11_APPROVED.md` §11 对照附录（R-4）、`docs/METRICS_P1.md`（R-5，P1 隔离标注）、`NEXT/D1_LITE_ASSESSMENT.md`（W2-6：24 步盘点/预算 24→25/分拆方案评估）、`docs/REFERENCES.md` 执行记录 |

## 2. 验证

- `node tools/run-g2.mjs` **全量 PASS**（工作流内 + 主流程复验两次独立运行，17198 ms）；
  全库 16 测试文件回归全绿（含 engine 339/0、engine-fc 294/0、scope-guard、backend-admission
  4 Run、backend-bridge、registry）；
- `python scripts/verify_golden.py` fl001（4 Run）全过、fc001/gt001 回归零扰动；
- `python -I tools/oracle/properties/property_harness.py` → ok=true，no_src_module_imported=true；
- 老 3 Run（13 列×601 点+scalars+metrics+events）与备份逐位一致；引擎 4 Run vs golden worst
  相对差 2.58e-15；actuator 闭环/monitor series+metrics 逐位一致（仅元数据差）。

## 3. 已知事项（诚实登记）

1. `verify_golden.py` 获 null 感知最小修补（见 W2-1 行）——DEC-R2 的「不 property 化」禁令
   不适用于该修补（非 property 化、为 null 列硬验收前置），已登记；
2. FL healthy Run `I_meas_20post_A` golden=25 vs 引擎 null（metrics 对非故障 Run 置 null 的
   既有可用性语义）——基线即如此，测试按可用性差异处理不判数值失配，维持现状；
3. `python -I tools/oracle/fl001_oracle.py --self-check` 在 GBK 控制台重定向下有
   UnicodeEncodeError（既有问题，PYTHONIOENCODING=utf-8 下 9/9 过）——遗留待清（下次
   FL oracle 变更轮顺手修）；
4. FL golden SOC 末位 ulp 与评审实机差 3.4e-8 pp（平台舍入，≪±0.001 pp 容差）；
5. FC golden E_bat_est_kWh 指标无引擎对应 metric_id，测试内注释声明跳过（series 层已全点覆盖）。

## 4. 预期失效面

fl001_v1 字节/sha 变更（6a0c751f…→f4e852aa…）、approval 重签；SA-24 白名单扩大
（actuator_fault 入 P0 服务域——后端两适配器同步支持并自检）；FC/FL 新族 classify 正式化；
历史盲包/归档局零影响（引擎零改动）；族池现状（actuator 已在池）与本版本 scope 对齐。

**发布门**：G7（run-g2 24/24）✅ → G8（本证据）✅。批准人：用户（CHG-20261104-05 授权链 + CHG-20261104-03 §4 白名单裁定）；记录人：实现 Agent。
