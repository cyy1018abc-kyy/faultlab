# G8 发布证据 — v1.3.0（八面冻结下第三个 additive 波：A-5 P2 FL 容量/内阻 G2b 草案轮 + Arena exposure 三值映射验证轮入池 + MG 教学路径 + QP-4 放行 + C3 真 TESPy 挂起登记）

> **发布**：**v1.3.0**（CHG-20261113-05——MINOR：评测轨覆盖扩张（面⑤ additive，ARENA_EXCLUDED
> 收缩 []）+ 教学路径新增（path-mg-001）+ QP-4 放行登记 + P2 草案/评审面新增文档；0 新步，
> V1_FACES §3.1 additive 语义）｜ **日期**：2026-11-14 ｜ **批准链**：
> CHG-20261113-04（用户 2026-11-13 指令「下一步」——DEC-1…7 全采推荐项；沿 CHG-20261110-01/
> 20261113-01「统一采用推荐决策」指令链先例）→ 波次 `NEXT/V130_WAVE_DESIGN.md`（三阶段
> W1→W2a→W2b→W3→W4→W5→W6；本证据 = W6）→ CHG-20261113-05（本发布收口，本证据为输入件）。
> **推送状态：用户裁定暂缓延续（v0.7.1 起 v0.7.1–v1.2.0 同批——v1.2.0 已于波前本地提交
> 2b53b39；本波产出并入同批，同批口径 v0.7.1–v1.3.0）。**

## 0. 发布门状态总览（诚实口径）

- **G7：本发布轮闭合复验**——35 步 **0 新步**（run-g2 维持 35 步，V130 DEC-6；arena/teaching
  步内断言 additive 扩展），门禁判据面零变更；两次独立 `--tier all` 全量 **35/35 PASS × 2**
  （r1 81367 ms / r2 81070 ms），perf 步实测 **12235（r1）/12224（r2）ms ≪ 31500 ms**（阈值
  系 CHG-20261110-03 波前已闭合项，本波零判据变更）——对阈裕度约 61%。
- **G8：本证据**（发布门 1–8 全部真实运行全绿，明细 §2）。
- 其余门禁全绿；additive 三不承诺兑现见 §3（10 golden 字节零触碰 + 哈希零变化 +
  35 步判据零翻转）。
- **W3 残留发现与处置（诚实登记）**：首跑步 28（engine-pv.test.js）fail 3——§6 源级守卫
  三断言仍断言 ARENA_EXCLUDED 旧排除状态（W3 已同构更新 arena.test.js §8 与 e2e E-12，
  漏本文件）。处置 = 沿 W3 已批准同构先例做滞后镜像更新（3 断言判据更新到入池后状态、
  判据数 166 零变化、物理断言零触碰；详细处置记录见 §1 表 W6 行与 CHG-20261113-05 ⑥），
  修复后两轮独立 35/35 × 2（本 §0 数值即修复后轮次）。

## 1. 分工作流交付（V130 五线）

| 线 | 交付 | 落点/状态 |
|---|---|---|
| W1+W2a/W2b | **P2 FL 草案轮（本波唯一 G2b 名额）**：`NEXT/FL001_CAPACITY_G2B_SPEC_DRAFT.md` v0.1（η_cap(T) 进 SOC 积分 + R_int 二次项 β·θ²；两核心裁定点 =「SOC 定义不动」重开请求 + 键形态三选一；Q1…Q11 全候选+推荐不定案）+ 双路独立评审 **A:PASS_WITH_CONDITIONS(9) / B:PASS_WITH_CONDITIONS(6)**（互不可见）；**§10 已回填**（评审记录 + 条件登记追记 A-1…A-9/B-1…B-6 原样登记不处置）——**状态仍 DRAFT，批准留待用户（v1.4.0 轮 FLCAP-G2b-02）**；评审报告全文随波次记录归档（2026-11-13 W2a/W2b） | DRAFT（本波收口回填 §10） |
| W3 | **Arena exposure 三值映射验证轮**：`NEXT/ARENA_EXPOSURE_VERIFICATION_ROUND.md` v1——PV（17 信号）/WT（22）/MG（18，计数勘正见该文档 §3）逐信号核对表 × 盲包程序化验证（TEMP 脚本 386 断言全过用后即删；19 场景泄漏扫描零命中、通道集逐场景全等、V-01…V-06b 全过、MG island_event 零参数族/双事件快照无缺口）→ **三系统全过入池，ARENA_EXCLUDED → []**（显式 CHG 面）；arena.test.js 扩池断言（155→198）、e2e E-12 镜像更新（六系统）、arena.js 守卫注释链更新；非阻塞观察项 O-1…O-4 登记（§4 待办） | 入池（三系统全过） |
| W4 | **MG 教学路径**：src/core/teaching.js PATHS additive 第 8 条 path-mg-001（并网→孤岛→重连三段功率平衡重整，I-5 句式「脱离主馈线的功率平衡重整」+ mg001_v1 锚点：钳位 8 kW / P_shed 2 kW / t_clear 35 s）+ exportTeachingPath 信封 + teaching.test.js（235→283）+ e2e E-19 教学页五断言（76→81）——零既有路径改动 | 落地 |
| W4→W6 | **QP-4 放行登记（V130 DEC-4）**：deriveChangePoints 首发放行——门槛已测量并公布（健康局假候选率实测 **0（0/30 局）** ≤ 0.2 + 可测幅值（≥5 A）故障局邻近检出 **12/12 = 1.00** ≥ 0.9，tests/arena-protocol-negative.test.js :278-284 实测机制，实测值随 run-g2 步 19 发布）；V1_FACES 面⑤ 放行注记落文档（§10 修订记录）——**首发前置解除，盲包生成侧按既有协议面使用、判据零扩张** | 放行 |
| W5→ | **C3 真 TESPy：挂起登记（不执行不重试）**——用户于派发时中断；**硬前置已解除**（LICENSE=MIT 已核实 + REFERENCES R-TESPy 已回填，v1.2.0 清偿）、待后续波次执行；**本波不含其交付**，tespy-independent-case.md 维持 v2（§8 附录三点口径 (a) 面） | 挂起（登记） |
| W6 | **门禁与证据路（本路）**：发布门 1–8 全部真实运行（§2）+ file-smoke E-12/E-19 镜像同步（80→85：六系统池镜像 + E-19 教学页五断言追加 + 计数引用/头注同步）+ src/ui/pages/teaching.js :4 头注「7 条预设」→「8 条」滞后注释一行勘正 + **engine-pv.test.js §6 W3 残留滞后镜像更新**（见 §0 诚实登记；3 断言判据更新、判据数 166 零变化）+ P2 草案 §10 回填 + V1_FACES additive 修订（面⑤ ×2/面① ×1/§10）+ 本证据 + CHG-20261113-05 | 落地 |

## 2. 验证（发布门 1–8 全表，全部真实运行）

| # | 命令 | 退出码 | 关键数值 |
|---|---|---|---|
| 1 | `python tools/build.py` | **0** | FaultLab.html **1687.8 KiB**（css=10 js=33；1679.7→1687.8——teaching 路径第 8 条 + arena 池文案 additive） |
| 2 | `node tools/run-g2.mjs` × 2（中间零改动） | **0 / 0** | **35/35 PASS × 2**；r1 总耗时 **81367 ms**（started 2026-11-14T10:26:10.383Z）、r2 **81070 ms**（10:27:39.420Z）；tier 分解 r1 = core 28 步 28 pass 77094 ms + extended 7 步 7 pass 4102 ms / r2 = core 28/28 76754 ms + extended 7/7 4129 ms；**perf 步实测 12235（r1）/12224（r2）ms ≪ 31500 ms**；e2e 步 25208/25154 ms、file-smoke 步 27142/27104 ms；**0 新步**（35 维持；步① 三 golden 顺序验证 fl001→fl001_l1→fc001_l1、步 19 QP-4 实测随步发布、步 25 arena 198、步 32 teaching 283） |
| 3 | `python -I scripts/verify_golden.py`（默认 + 逐模型 ×8） | **9 × 0** | default **三 golden 80 checks**（fl001 25 + fl001_l1 25 + fc001_l1 30）/ fl001 25 / fl001_l1 25 / fc001 30 / fc001_l1 30 / gt001 35 / pv001 25 / wt001 30 / mg001 30——合计 **310 checks，0 fail**（全 8 注册行；与 v1.2.0 时点全同） |
| 4 | `python -I tools/oracle/oracle_base.py` | **0** | 机制自测 T-1…T-8 全 pass + conformance ok |
| 5 | `node tools/copy-guard.mjs` | **0** | **PASS 39 patterns，0 命中**（词表 39/14 基线维持——本波零增词） |
| 6 | `node tools/file-smoke.mjs --rounds 3` | **0** | **3 轮 × 85 = 255 PASS / 0 FAIL**（单轮 26849/26801/26854 ms）——**镜像后 85/85 确认**（E-12 六系统池 + E-19 教学页，重打包产物复验） |
| 6a | `node tools/ui-walkthrough.mjs` | **0** | **63/63**（31568 ms；走查面无 arena 排除引用、零触碰——本波 63 维持） |
| 6b | `node tools/e2e.mjs` | **0** | **81/81**（25243 ms——76→81 为 E-19 教学页五断言 additive，W3/W4 落地面；另 run-g2 两轮内 e2e 步各 1 次全过） |
| 7 | golden 零变化终检 | — | `git status --short data/golden/` = **空**（10 golden + 10 sidecar 全 tracked、零改动）；`git diff --stat -- data/golden/` = **空**；字节复核见下表（与 v1.2.0 时点逐字节零变化） |
| 8 | 测试面汇总（W3/W4 数 + 抽查复跑） | — | **23 文件全绿**（今日 run-g2 两轮覆盖全部 23 个 .test.js；下表）；抽查复跑 arena.test.js **198/0** ✓、teaching.test.js **283/0** ✓、core.test.js **11363/0** ✓（与 W3/W4 汇报一致）、engine-pv.test.js **166/0** ✓（镜像更新后，判据数与 v1.2.0 全同）、arena-protocol-negative **42/0** ✓（QP-4 实测 0 ≤ 0.2、检出 12/12 ≥ 0.9） |

**10 golden 字节复核（2026-11-14 ls -l 实测，与 v1.2.0 时点零变化——git diff 空）**：

| golden | 字节 | golden | 字节 |
|---|---|---|---|
| fc001_v1 | 1,093,755 | gt001_v3 | 2,372,494 |
| fc001_v2 | 1,363,737 | mg001_v1 | 1,051,804 |
| fl001_v1 | 659,299 | pv001_v1 | 788,738 |
| fl001_v2 | 930,796 | wt001_v1 | 1,461,288 |
| gt001_v1 | 1,449,900 | gt001_v2 | 1,452,353 |
| （sidecar：gt001_v1/v2 81 字节，余均 80 字节） | — | — | — |

**23 测试文件断言汇总（★ = 本轮抽查复跑实证一致；arena/teaching = W3/W4 汇报数，余沿 v1.2.0 数；23 文件今日 run-g2 两轮内全绿）**：

| 文件 | 断言 | 文件 | 断言 |
|---|---|---|---|
| ★core.test.js | **11363** | engine-mg.test.js | 382 |
| ★arena.test.js | **198**（v1.2.0 时点 155——W3 扩池断言） | engine.test.js | 428 |
| ★teaching.test.js | **283**（v1.2.0 时点 235——W4 path-mg-001） | engine-gt.test.js | 451 |
| ★engine-pv.test.js | **166**（§6 三断言镜像更新、判据数零变化） | engine-fc.test.js | 484 |
| engine-wt.test.js | 228 | ★arena-protocol-negative.test.js | **42** |
| scenario.test.js | 437 | plants.test.js | 83 |
| schema.test.js | 317 | event-phase.test.js | 46 |
| registry.test.js | 60 | bundle.test.js | 35 |
| leaderboard.test.js | 78 | report.test.js | 32 |
| causal-rules.test.js | 149 | scope-guard.test.js | 30 |
| compare.test.js | 27 | backend 两件（admission+bridge） | 全绿 |

## 3. additive 三不承诺兑现声明（V130_WAVE_DESIGN DEC-7，V1_FACES §3.4 边界）

1. **不改既有合法输入的任何哈希输出**：本波 **零 SystemDef/scenario 声明面改动**（P2 只草案、
   零代码触碰；arena.js `ARENA_EXCLUDED` 为 **UI 名单不入哈希声明面**；teaching.js PATHS
   追加不入 run/config 哈希——W4 探针证明）；机检 = registry.test.js 60（规范哈希/不可变）+
   scenario.test.js 437（roundtrip/执行等价）+ schema.test.js 317（投影面）全绿（run-g2 两轮
   覆盖）+ 引擎↔golden 全量比对绿（engine 428/engine-fc 484/engine-gt 451/engine-pv 166/
   engine-wt 228/engine-mg 382）——全库五类哈希（scenarioHash/config_hash/model_hash/run_hash/
   score_hash）输入清单零改动；
2. **既有 10 golden 字节零触碰**：`git status --short data/golden/` 空 + `git diff --stat
   -- data/golden/` 空 + verify_golden 全 8 注册行 exit 0（V-02 sidecar 绑定实际字节复验）+
   §2 字节表逐字节同 v1.2.0 时点；本波零新 golden（P2 fl001_v3 属 v1.4.0 批准轮）；
3. **既有 35 run-g2 步判据零翻转**：**0 新步**（V130 DEC-6——arena 断言并入步 25、teaching
   并入步 32、QP-4 实测随步 19、exposure 验证为证据面不入门禁）+ 本轮 35 步全部 pass × 2
   （perf 步判据文本零改动，31500 ms 阈值系 CHG-20261110-03 已闭合项非本波动作）。附注：
   步 28 内 3 条 UI 名单守卫断言（engine-pv.test.js §6）随 ARENA_EXCLUDED 收缩做滞后镜像
   更新——**判据数 166 零变化、物理断言零触碰**，与 W3 对 arena.test §8/e2e E-12 的已批准
   同构处置一致（§0 诚实登记；不构成步判据翻转——步级 PASS/FAIL 判据与步账零改动）。

## 4. v1.3.x 待办（沿 CHG-20261113-05 ④）

1. **P2 FL 批准轮 + 实现 = v1.4.0 首项**（FLCAP-G2b-02…04）：评审条件 9+6 落正文（§10.2
   登记面逐项处置）+ 两裁定点（「SOC 定义不动」重开 / 键形态三选一）+ Q1…Q11 定案 +
   η_cap/β 数值定案（域扫描证据）→ 更名 APPROVED（MG/FC 体例）→ 实现；**批准留待用户**；
2. **C3 真 TESPy 挂起待执行**：用户于派发时中断——硬前置已解除（LICENSE=MIT + REFERENCES
   已回填），隔离 venv + 三点六量对照 + 「变比热豁免的已解释偏差」登记，待后续波次；
3. **O-1 盲包诊断提交枚举族扩展**：v1 协议 faultType 枚举不含 PV shading_step / WT gust_step /
   MG shading_link/gust_link/island_event——扩展须显式 CHG（协议 v1 文本 + 枚举面，
   ARENA_EXPOSURE_VERIFICATION_ROUND.md §6 O-1）；
4. **O-4 arena 页文案滞后清扫**：「三系统均有独立故障目录与盲观测通道」「三系统可用」两串
   在六系统池下语义滞后（W3 许可面仅 ARENA_EXCLUDED 与注释，文案勘正留显式 CHG）；
5. **步①/步 31/步 32 描述标签固化**：步① label「verify_golden fl001」（实覆盖三 golden）/
   步 31 label「61 断言」（实际 85）/ 步 32 label「7 路径」（实际 8）——随下次
   tools/run-g2.mjs 触碰统一同步（避免 FIRST-35 机检扰动，维持登记不修）。

## 5. 发布门行

**G7**：run-g2 `--tier all` 35/35 两次独立 —— **维持闭合**（CHG-20261110-03 阈值 31500 ms
维持；本波 0 新步零判据变更，本轮复测 35/35 × 2、81367/81070 ms、perf 步 12235/12224 ms）。
**G8**：本证据（发布门 1–8 全部真实运行全绿，§2）。

**批准人：用户（CHG-20261113-04 指令链——本证据为 v1.3.0 收口登记输入件）；记录人：W6 门禁与证据路。**
**推送按用户裁定暂缓（同批 v0.7.1–v1.3.0 延续，本波产出并入同批；本地提交随收口轮决定，V130 DEC-7 同口径）。**

**文件结束**。v130-release（2026-11-14，W6 门禁与证据路；体例沿 v120-release.md）。
