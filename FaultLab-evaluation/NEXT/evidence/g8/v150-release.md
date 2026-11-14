# G8 发布证据 — v1.5.0（八面冻结后第五个 additive 波：P3 GT 燃烧延迟草案轮 + O-1 盲包诊断族枚举扩展）

> **发布**：**v1.5.0**（CHG-20261114-05——MINOR：诊断提交族枚举 4→9 值 additive 扩展 +
> P3 GT 评审面新增文档（草案 + 双评审结论代录）；0 新步——run-g2 维持 35 步）｜
> **日期**：2026-11-14 ｜ **批准链**：CHG-20261114-04（用户 2026-11-14 指令「下一步」——
> DEC-1…4 全采推荐项）→ 波次 `NEXT/V150_WAVE_DESIGN.md` → CHG-20261114-05（本发布收口，
> -04 ④ 预留号）。
> **推送状态：用户裁定暂缓延续（v0.7.1 起 v0.7.1…v1.4.0+v1.5.0 同批——本波产出并入同批；
> 实测本地 ahead 1：origin/main 现指 v1.3.0 `27c5e22`，v1.4.0 commit `229a15d` 待随同批推送——如实登记）。**

## 0. 发布门状态总览（诚实口径）

- **G7**：run-g2 `--tier all` **35/35 两次独立 PASS**（r1 **109848 ms** / r2 **110185 ms**，
  中间零改动；core 28/28 + extended 7/7；0 新步——FIRST-35 机检既有 35 步顺序/判据/命令
  零改动；步 19（arena-protocol-negative）42→**80**、步 25（arena.test）198→**218** 断言数
  additive 增长（O-1），既有断言零删改）。perf 步实测 **12725/12568 ms ≪ 71500 ms**
  （CHG-20261114-02 阈值维持，本波零判据变更）。
- **build 体量诚实登记**：`python tools/build.py` 两次构建幂等 **1736.7 KiB**（1,778,360 B，
  css=10 js=33）——**≠ 派发预期 1735.8 KiB**。差异 +943 B 已逐字节归因：v1.4.0 工件
  FaultLab.html（1,777,417 B = 1735.8 KiB，构建于本波 W3 落地前）→ 本波重打包含 W3 O-1
  `src/agents/arena.js` 枚举扩展（28,110→29,053 B = **+943 B**，FaultLab.html 增量逐字节相等）
  ——「本波 UI 页面零改动」成立（UI pages 无一触碰），1735.8 KiB 系 v1.4.0 时点数值；v1.5.0
  时点画像以实测 **1736.7 KiB** 为准。
- **P3 GT 草案轮：完成**（v1.5.0 首项兑现——v1.4.0 顺延登记的清算）：草案 v0.1 + 双路独立
  评审（互不可见）+ 结论代录草案 §10（**状态维持 DRAFT，批准留待用户 v1.6.0**）。
- **O-1 诊断族枚举扩展：完成**（V130 W3 观察项 O-1 → V150 DEC-2 显式 CHG 面）——
  枚举 4→9 值、既有 4 值路径零变化探针、附录 A 17 负例零删减、协议批准文档不改。
- 其余门禁全绿，明细见 §2；additive 三不承诺兑现见 §3。

## 1. 分工作流交付

### 1.1 P3 GT 草案轮（GTCMB-G2b-01，CHG-20261114-04 授权；本波唯一 G2b 草案名额）

- **`NEXT/GT001_COMBUSTION_G2B_SPEC_DRAFT.md` v0.1**（起草 448 行；§10 代录后 473 行）：
  τ_comb 燃烧延迟二阶状态——状态向量 y=[f,T3,x_comb] **2→3 维 ODE**（x_comb 新动态 ODE
  状态、其余效率链代数——I-2 诚实区分；GT 无 SOC 定义面显式登记防先例错配）；
  **键面张力三形态八维对照 + 推荐形态 a 可推翻**（a=inertia_model 枚举扩值〔GTL1 §2.4
  三值枚举先例〕/ b=正交二键 combustion_model〔FL capacity 先例——成立前提 GT 侧不存在〕/
  c=thermo 原地深化=**被排除形态**（A5 §3.2 :182-184 硬伤——emit 过的轨语义不得原地变更）；
  四理由：语义耦合度判别、涟漪面最小、golden 一一对应维持、键名漂移增量有限——批准轮裁定）；
  **稳态不变性结构推论**（一阶滞后 d/dt=0 ⇒ Q_f,d ≡ Q_f 精确 ⇒ 延迟不改变稳态值、只改变
  暂态路径——设计点/sensor 稳态/u=40 钳位三点稳态不变，GTL1 §5 TESPy 三点口径 (a) 参照）；
  **零新信号提案 Q10a**（教学面经既有 T4_out_K × P_gen_cmd_kW 相位差承载；x_comb 为 ODE
  内部状态不出信号）；τ_comb 整定依据五项判据框架（数值零编造——精确式/域/锚点数值批准轮
  定案）；§4 golden 计划十项（gt001_v4 新 id/四代 supersedes 链/GCMB-1…8/6 Run 镜像/
  T-B+降 T-C 双向预案）；§11 Q1…Q13 全候选+推荐**不定案**；R-1…R-11 风险。
- **双路独立评审结论代录 §10（W4，2026-11-14；评审报告全文随波次记录归档——W2a/W2b）**：
  **评审人 A（物理/数值）：PASS_WITH_CONDITIONS(6)**（1 P1 + 3 P2 + 2 P3）——稳态不变性/
  量纲/RK4 三维分区更新序独立重推全部通过；1 P1（A-1）= §3.2/§3.3 须按 GTL1 A-3 口径体例
  **逐锚点登记「渐近稳态 vs t=60 采样」两口径**（v4 全部 t=60 采样锚点将随暂态路径变化偏离
  v3 冻结值——18.266/1044.16 等在 golden 中是采样值非稳态值）；3 P2 = 「逐位同」措辞与
  T-B 制度一致化 / τ_comb 判据框架增闭环收敛+网格可辨性两条 / GCMB 增 GL-6 同构 gap 检查；
  2 P3 = engine.js:320-322 字面三值守卫勘正 / gt001_v3 波次归属未核实。
  **评审人 B（治理/口径）：PASS_WITH_CONDITIONS(5)**（2 P2 + 3 P3）——八面声明/先例对照
  公允性/步数账/体例全部属实；2 P2 = 三处字面守卫须 additive 编辑（engine.js:320-324/
  schema.js:231-234/scenario.js:401-402）「自动覆盖」表述订正 / config_hash 投影行失实订正
  （**inertia_model 现状在投影内 schema.js:144——修正后强化形态 a**；B-3a 局限只适用形态 b
  且 healthy 局 run_hash 跨轨同值碰撞须补登）；3 P3 = 行号精度五处 / 「P0 验收路由」措辞
  失配（GT 无 approved_p0 面）/ sensor 采样锚点逐点点名补登记。
  **用户批准行：待 v1.6.0（批准留待用户）**；条件 A-1…A-6/B-1…B-5 原样登记不处置
  （§10.2——处置归 GTCMB-G2b-02 批准轮）。

### 1.2 O-1 盲包诊断族枚举扩展（V130 O-1 → V150 DEC-2；显式 CHG 面 = CHG-20261114-05）

- **src/agents/arena.js 诊断提交族枚举 4→9 值**：既有 [sensor_drift/load_step/actuator_fault/
  none] + **shading_step/gust_step/shading_link/gust_link/island_event**（入池六系统目录活跃
  族全集 + none；枚举=族名全集非按系统——MG load_step 与既有 load_step 同名共用；错误文案
  同步 additive）；
- **族名收口——名实差修正**：pv_shading_link/wt_gust_link 为 FAULT_CATALOG v1.7 **目录项
  id**，族名为 **shading_link/gust_link**——枚举收族名不收 id（N-B19 越界负例承载：目录项
  id 与空族仍拒收 AE-E11）；
- **既有 4 值路径零变化探针**（W3 登记）：TEMP 隔离同输入同输出——既有 4 值校验/评分路径
  字节零变化（arena.test §1–§8 全量回归零变化覆盖）；
- **负例套件 additive**：arena-protocol-negative 42→**80**（附录 A 冻结 N-B1…N-B17 **零删减**
  + N-B18 新族合法正例 ×5 + N-B19 越界负例 ×3 + O-1 新族可达 smoke + QP-4 既有段）；
  arena.test 198→**218**（§8c：新族提交面合法接受 ×5 + 越界镜像 ×2 + MG-001 真族轮评分冒烟
  ——family/component 等值匹配可达）；e2e **94 零变化**（tools/** 本波零触碰——V150 §3
  预期表「e2e 94→N」未兑现为变化，如实登记为零偏差）；
- **ARENA_EVAL_PROTOCOL_APPROVED.md 不改裁定**：协议批准文本无枚举清单载面（枚举生于 MVP
  实装 src/agents/arena.js），实现侧 additive 扩展更贴合其规则句——面⑤「规则代演进 =
  additive」口径；协议文档与附录 A 17 负例冻结规格零触碰（git 实证未修改）；
- **新观察项登记**：island_event 零参数族幅值不可达 → round_score **85.0 上限**（真值幅值
  {value,unit:''} 不满足既有提交侧非空 unit 规则、按「缺失幅值记 0」冻结口径提交 null——
  tests/arena-protocol-negative.test.js :240/:273 实测机制）；**family/component 可达性不受
  影响**（N-B18/§8c 冒烟承载——本波 O-1 目标即此）；幅值可达化 = 后续显式 CHG 候选，本波
  不处置。

### 1.3 小清算

步①（label「verify_golden fl001」）/步 31（file-smoke「61 断言」）/步 32 描述标签滞后维持
登记不修（V120 DEC-5 处置延续——本波 tools/** 零触碰）；C3 真 TESPy 挂起维持（用户前轮
中断，不自动重试）；G9/G10 维持「须用户明示」（v1.4.0 隔离件不预设存在）——**如实登记**：
本波收口时点工作树现存未跟踪 `NEXT/G9_G10_ARCH_GATE_SPEC_DRAFT.md` 与 DECISIONS.md 尾部
一条重复编号（CHG-20261114-03 重号）的 G9/G10 落档记录，均非本波文件面、零触碰，归后续
用户明示处置。

## 2. 验证全表（发布门 1–7，全部真实运行 2026-11-14）

| # | 命令 | 退出码 | 关键数值 |
|---|---|---|---|
| 1 | `python tools/build.py` × 2 | 0/0 | FaultLab.html **1736.7 KiB**（css=10 js=33；1,778,360 B 两次构建幂等；+943 B vs v1.4.0 = O-1 arena.js——归因见 §0） |
| 2 | `node tools/run-g2.mjs` × 2 | 0/0 | **35/35 PASS × 2**（r1 109848 ms / r2 110185 ms；r2 tier 分解 = core 28 步 104686 ms + extended 7 步 5308 ms；0 新步）；perf 步 **12725/12568 ms ≪ 71500 ms** |
| 3 | `python -I scripts/verify_golden.py` 默认 + 逐模型 ×9 | **10 × 0** | default 四 golden = fl001 25 + fl001_l1 25 + fc001_l1 30 + fl001_cap 25 = **105**；逐模型 fl001 25 / fl001_l1 25 / fc001 30 / fc001_l1 30 / fl001_cap 25 / gt001 35 / pv001 25 / wt001 30 / mg001 30 = **255**——**合计 360 checks / 0 fail**（与 v1.4.0 基线全同） |
| 4 | `python -I tools/oracle/oracle_base.py` ＋ `node tools/copy-guard.mjs` | 0/0 | T-1…T-8 全 pass + conformance ok ／ **PASS 39 patterns 0 命中**（词表 39/14 维持，本波零增词） |
| 5 | `node tools/file-smoke.mjs --rounds 3` ／ `node tools/ui-walkthrough.mjs` ／ `node tools/e2e.mjs` | 0/0/0 | **3×98=294/0** ／ **67/67** ／ **94/94**（run-g2 两轮内亦各含 e2e 步全过 36251/36098 ms） |
| 6 | golden 零变化终检 | — | `git status --short data/golden/` **空** ＋ `git diff --stat -- data/golden/` **空**（11 golden + 11 sidecar = 22 文件全 tracked 零改动）；11 golden 字节复核与 v1.4.0 时点逐字节全同（表见 §3 ②） |
| 7 | 测试面 | — | **23 文件全绿**（run-g2 两轮全覆盖 + 逐文件实跑计数）：core **11365** / engine 589 / scenario 493 / schema 329 / teaching 283 / engine-fc 484 / engine-mg 382 / engine-gt 451 / engine-pv 166 / engine-wt 228 / arena **218** / arena-protocol-negative **80** / registry 60 / leaderboard 78 / bundle 35 / causal-rules 149 / plants 83 / event-phase 46 / report 32 / compare 27 / scope-guard 30 / backend-admission 81 / backend-bridge 13；抽查复跑 arena-protocol-negative（80/0）、arena（218/0）、core（11365/0）各一次实证一致 |

## 3. additive 三不承诺兑现（V1_FACES §3.4）

1. **既有合法输入五类哈希零变化**：本波**零 SystemDef/scenario 声明面改动**（P3 为草案轮
   零代码触碰；O-1 为诊断提交面 faultType 校验值域——提交侧枚举不入 run/config/scenario
   哈希，W3 探针证明）＋ verify_golden 360 checks 全过（引擎↔golden 全量比对绿）＋
   registry 60/schema 329/scenario 493 机检全绿佐证；
2. **既有 11 golden 字节零触碰**：git status/diff 空 ＋ V-02 sidecar 复验全过 ＋ 字节表——
   fc001_v1 1,093,755 / fc001_v2 1,363,737 / fl001_v1 659,299 / fl001_v2 930,796 /
   fl001_v3 971,314 / gt001_v1 1,449,900 / gt001_v2 1,452,353 / gt001_v3 2,372,494 /
   mg001_v1 1,051,804 / pv001_v1 788,738 / wt001_v1 1,461,288 字节（＋11 sidecar），
   与 v1.4.0 时点逐字节全同（本波零新 golden）；
3. **既有 35 run-g2 步判据零翻转**：0 新步（35 维持，FIRST-35 机检）＋ 本轮 35 步全 pass
   × 2——步 19/25 断言数增（42→80/198→218）为 additive 值域扩展（既有 4 值路径零变化
   探针 ＋ 既有断言零删改），非判据翻转。

## 4. v1.5.x 待办

**首项：P3 GT 批准轮 + 实现 = v1.6.0 首项候选**（GTCMB-G2b-02…04：双评审条件 A-1…A-6/
B-1…B-5 落正文（A-1 两口径逐锚点登记为 P1 硬项）＋ 键形态裁定（推荐形态 a 可推翻——
B-2 修正后强化形态 a）＋ Q1…Q13 定案 ＋ τ_comb/EQ-GTL2 精确式/锚点数值批准轮定案（域
扫描证据）；**批准留待用户**）；
O-1 后续：island_event 幅值可达性显式 CHG 候选（零参数族 round_score 85.0 上限——待用户
裁定）；C3 真 TESPy 挂起维持（待用户明示）；G9/G10 须用户明示（v1.4.0 隔离件；现存未
跟踪落档件与重号 CHG 记录如实登记 §1.3）；步①/步 31/步 32 描述标签固化随下次 tools
触碰（维持登记）。

## 5. 发布门行

**G7**：run-g2 `--tier all` 35/35 两次独立 PASS（109848/110185 ms；perf 步 12725/12568 ms
在阈 71500 ms 内）——**闭合**。**G8**：本证据（CHG-20261114-05）。

**批准人：用户（CHG-20261114-04 指令链——本证据为 v1.5.0 收口登记输入件）；记录人：
W4 门禁与证据路。**
**推送按用户裁定暂缓（同批 v0.7.1–v1.5.0 延续，本波产出并入同批；实测 ahead 1 如实登记 §0）。**

**文件结束**。v150-release（2026-11-14，W4 收口；体例沿 v140-release.md）。
