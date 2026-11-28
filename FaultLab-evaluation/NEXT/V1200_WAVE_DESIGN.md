# V1200_WAVE_DESIGN — v1.20 波设计（v1 批准——TL 联合轨 v2 规格 + C-6 参考 agent；两批）

> **性质**：阶段设计文档（Lead 起草，2026-11-28）——v1.19.x 治理波收口（d1fbeb1）后首波。
> **状态**：**v1 批准（CHG-20261128-03）**——用户 2026-11-28 指令「以文档为准，我想将候选项中的产品线 C-3 到 C-6 作为下一次任务的实施对象」→
> 「采纳 S-1 到 S-3，拆分成两波两批次；进入方案设计」→ 第一轮「1.同意；2.同意；3.同意；4.同意使用；5.同意」。
> **输入**：`NEXT/ROADMAP.md` §2（C-3…C-6）｜ TL001_FMU_G2B_SPEC_APPROVED v1.0 ｜ CHG-20261125-02 / 20261126-01（F-1）｜
> eval-session-003 归档。

---

## 0. 范围裁定（2026-11-28）

| # | 项 | 裁定 |
|---|---|---|
| R0-1 | 实施对象 | ROADMAP §2 **C-3**（TL-001 升 approved）/ **C-4**（联合模式下垂调速器）/ **C-5**（线路故障新族）/ **C-6**（GT 参考 agent + 新盲包内部场次）——C-6 按 ROADMAP 属运营线 |
| R0-2 | 补充项 | **S-1** C-4 + C-5 合为一份 G2b 规格（「TL 联合轨 v2」——一轮评审/批准、一次 golden 换代）；**S-2** C-5 先定义（推荐「双回线单回跳闸」，列 Q 点）；**S-3** TL-001 教学路径（随 C-3）。S-4（TL 入 L2 盲测池）不采纳 |
| R0-3 | 批次 | **两波两批**：第一批 = v2 联合规格（C-4+C-5）草案 → 评审 → 批准 + C-6；第二批 = v2 规格实现 + C-3 升 approved + S-3 教学路径 |
| R0-4 | 依赖序 | C-4 → C-5 → C-3（升 approved 前先消除 F-1 并定下族集）；C-6 独立 |

## 1. 第一轮裁定（2026-11-28）——v2 联合规格技术方向（规格草案按此起草，参数值留批准轮）

**实读依据**：v1 golden `joint_sensor_drift` u_end 1.205 / P_gen_end −5.123 kW（F-1）；其余 Run governor 终值 ≈25；
`joint_line_fault` 末 10 s δ 峰峰 0.0000——电池下垂 P_bat = 5 − 24·(f−50) 已为转子提供阻尼（无需 D 项）；
规格恒等式 u_end = 25 − (δ_end−δ₀)/π ⇒ 积分调速器在联合模式下等价于功角反馈（F-1 成因）。

| # | 裁定点 | 裁定 |
|---|---|---|
| R1-1 | C-4 调速器形态 | **(a) 按线路状态切换**：线路接通 ⇒ 纯下垂 `u = clamp(u_ref − K_d·(f_gov − 50), 0, 40)`（瞬时，与电池下垂建模口径一致）；`line_open` ⇒ 保留积分（等时孤网——GLJ-5 standalone ≡ gt001_v3 守卫不变）。推荐参数 R = 5%、K_d = 25/(0.05×50) = 10 kW/Hz（批准轮定值）。governor 归 host ⇒ **C 内核 / FMU 包零改动** |
| R1-2 | C-5 新族定义 | **双回线单回跳闸**（族 `line_trip`）：X_line = 3.2 Ω 重新解释为两回 6.4 Ω 并联等值（数值不变，规格登记）；t = 20 s 一回永久跳开 ⇒ `p_elec_scale = 0.5`（现有输入——**内核零改动**）；**1 个 Run** `joint_line_trip`（出口基线 demand = 20：P_max 50→25 kW，δ 11.5°→≈23.6°） |
| R1-3 | golden / oracle / 已发布面 | 新 golden **`gt_tl_joint_v2`**（supersedes v1；9 Run = v1 八局按新调速器重出 + joint_line_trip）；**新 oracle 文件**（v1 oracle 受 V-03 源哈希锚定，零改动）；v1 golden / oracle / verify 注册冻结保留（mg001_v1→v2 先例）；第二批切换引擎 / engine-tl.test / host 壳 / parity 参照至 v2；**FMU 不重钉** |
| R1-4 | 双路评审 | **(a) 两个独立子 agent**（A 线物理/架构、B 线治理/八面——互不可见）；Lead 逐条处置；用户明确同意使用子 agent |
| R1-5 | C-6 与版本 | `tools/arena-ref-agent.mjs`（内部参考 agent）：幅值通道入切片 + 兜底、actuator 须正证据（valve_meas 与 valve_cmd 背离）；新 GT 盲包内部场次 `eval-session-004-internal`；session-003 原样保留。**第一批不切产品版本**（规格文档 + tools/ 开发工具，不进 FaultLab.html）；**第二批发布 v1.20.0（MINOR）** |

## 2. 第一批执行规格（串行，各段独立提交）

```text
B1-1 规格草案 NEXT/TL001_V2_G2B_SPEC_DRAFT.md v0.1（体例同 TL001_FMU_G2B_SPEC_APPROVED：§0 边界 / §1 调速器
     切换形态与参数表 / §2 line_trip 族与 Run 矩阵（9 Run）/ §3 锚点与包络（oracle 预演实测值，非预填）/
     §4 golden 计划（v2 新 id + 新 oracle 文件 + v1 冻结）/ §5 八面影响 / §6 排期 / §7 红线自查 / Q 点全候选 /
     用户裁定留白章）——**起草时以临时脚本预演关键 Run（scratchpad，不入库）给出实测锚点**
B1-2 双路独立评审：子 agent A（物理/架构）+ 子 agent B（治理/八面），互不可见；评审记录入
     NEXT/evidence/g2b/TLV2_G2B_REVIEW_A.md / _B.md；Lead 逐条处置 → v0.2（必要时再审一轮）
B1-3 用户批准轮：提交 Q 点清单与评审结论 → 用户裁定 → 规格更名 APPROVED v1.0（第一批终点；第二批据此实现）
B1-4 C-6：arena-ref-agent.mjs（**先提交冻结 agent 代码，再生成新盲包**——见纪律）→ eval-session-004-internal
     （GT-001 L2，新种子）→ 评分 + score_hash 双次重放 → 归档 evidence/g10/eval-session-004-internal/
B1-5 收口：ROADMAP §2 更新 + 短 CHG
```

**C-6 评测纪律**（防自我拟合）：agent 改动以 session-003 已公开的失效模式为依据；**agent 代码先提交冻结（记提交
哈希），之后才生成新盲包**；新盲包 reveal 在评分前不读取；结果如实登记，标注「内部参考 agent，非第三方」。

**第一批门禁**：规格与评审为文档面；C-6 = arena 协议机检全过（L2 verify / score_hash 双次一致）+ copy-guard +
run-g2 全量（确认 tools/ 新文件零回归）。零产品代码、零 golden。

## 3. 第二批概要（规格批准后另行开工——届时以 APPROVED 规格为准细化）

v2 新 oracle + `gt_tl_joint_v2` emit + verify 注册 → 引擎 simulateTL001 调速器切换 + `line_trip` 族（SystemDef /
FAULT_CATALOG）→ host 壳 + parity 切 v2（FMU 不重钉，期望仍逐位一致）→ C-3 TL-001 升 approved（scope additive +
验收轮）→ S-3 TL 教学路径 → 门禁 + v1.20.0 发布（按 ROADMAP §4 四处同步）。

**文件结束**。V1200_WAVE_DESIGN v1（2026-11-28，CHG-20261128-03 批准）。
