# GTFMU_G2B_REVIEW_B — GT-001 L1-FMU 规格草案独立评审 B（治理/契约面）

- **评审人身份**：独立评审 B——治理/契约面（V1120 波 W2b；与 W2a 物理/数值评审互不可见，独立形成结论）
- **评审日期**：2026-11-18
- **评审对象版本**：`FaultLab-evaluation/NEXT/GT001_FMU_G2B_SPEC_DRAFT.md` **DRAFT v0.1**（2026-11-18，560 行 wc -l 实测；起草授权 CHG-20261118-08——DECISIONS.md 台账实读）
- **评审性质**：只读审计 + 仅写本报告文件；未修改仓库任何其他文件

## 实读文件清单（全部为评审期内直接打开核验，非转述）

| 文件 | 核验面 |
|---|---|
| `FaultLab-evaluation/NEXT/GT001_FMU_G2B_SPEC_DRAFT.md` | 评审主对象（全文 560 行） |
| `docs/V1_FACES.md` §2 八面（:50-388）+ §17/§18（:705-733） | 八面 additive 核对的契约基准；v1.10.x 记录（36 步/43 词/13 golden/provenance 例外行/compare 谓词） |
| `FaultLab-evaluation/NEXT/V07_ROADMAP.md`（全文 123 行） | I-8/I-9 原文（:21/:22）、A-6/A-7/A-8 行（:48-50）、v1.11.x/v1.12.0 波行（:77-78） |
| `src/core/scope.js`（全文 119 行） | APPROVED 白名单 :17-30（无 GT 分支）、classify :42-83、后端 Run 强制 extension_preview :95-102 |
| `src/core/registry.js`（:30-100/:107-127/:246-264） | runHashInput :46-58（fmu_sha256 不入 run_hash）、provenance 两枚举 :111/:253-254 |
| `scripts/verify_golden.py`（:100-130/:215-320/:330-460） | MODELS 表（fc001_fmu :199 / gt001 :222 / gt001_comb :239）、DEFAULT_MODELS :311、KEY_POINTS :313、T-B 分派链 :333-405、metric_within :421+ |
| `src/core/scenario.js`（grep 定位 + :355-370/:520-560） | FEEDBACK_MODES :40、EVENT_KEYS :52、INERTIA_MODELS :56（四值含 thermo/thermo_comb）、电化学显式键先例 :430-447、hashProjection |
| `src/core/schema.js`（:129/:134/:144/:231-234） | inertia_model 入 config 投影 :144、四值守卫 |
| `tools/oracle/oracle_base.py`（grep 定位 :47-57/:100-150/:179/:209-249） | APPROVAL_FIELDS 三字段 :49、六成员 :57、write_golden_with_sidecar :179、emit approval 语义 :209-238 |
| `tools/oracle/gt001_l1_oracle.py`（:1-16/:56-105/:120-215/:364-378/:461-514/:520-547/:745-765） | 冻结常量（K_F :145 等）、N_SAMPLES=601 :152、SERIES_IDS 27 列 :178-188、RUNS 6 :191-210、记账口径 :56-60/:366-376、事件快照 i_pre=199/i_post=200 :79-80/:461-462、GL-1 :536 区、TOLERANCES gate 十键 :748-762 |
| `tools/oracle/gt001_comb_oracle.py`（grep 定位 + :1240-1256） | TAU_COMB=0.5 :173、SERIES_IDS 27 列 :215、RUNS :228、TOLERANCES :1223、包络冻结界 T3 [735.3,1524.9]/T4 [486.68,1001.25] + X_CROSS_TOL=1.3e-8 :1246-1253、series_note :103 |
| `data/golden/` 目录 ls + `data/golden/fc001_fmu_v1.json`（:1-15/:9/:12/:91）+ gt001_v3.json（inertia_model 结构位） | **13 golden + 13 sidecar 实存**；fc001_fmu_v1 先例字段（supersedes=null :9 / model_provenance 顶层 :12 / run 级 :91 / model_version 1.0.0 :4）；gt001_v3 gate 十键 + inertia_model 三落位（顶层/config/run 级×6） |
| `FaultLab-evaluation/NEXT/ORACLE_INTERFACE_D2.md`（§3 :117-190） | §3.1 新 id 判据（模型/方法变更→新 id；保 id 重出仅 DEC-B 原地扩容）、§3.3 approval 三值非 null 纪律、§3.4 backend 留位 |
| `FaultLab-evaluation/NEXT/V312_BACKEND_ADMISSION_CHECKLIST.md`（全文 131 行） | FROZEN :6、§7 例外行现值（:86-88——**FC-001 限定文本**）、§10 钉 hash 表 :117-126（5f60ca78…/fc.pem.fmu_l1/fmu_l1_lumped_unvalidated/重钉须 CHG） |
| `tools/backend/py/fmu_admission.py`（全文 155 行） | A-1…A-5 docstring :8-16、A-3 docstring :11（**「禁借用 FL-001 目录清单」**）+ admit() 机检 :68-70（**仅拒 fl001/FL-001**）、A-4 docstring :12-15（**FC-001 限定例外注记**）、PLATFORM_DIRS 五平台 :30-31 |
| `tools/backend/py/fmu_runner.py`（grep 定位 + :300-312/:381-386） | D-27 关闭 :5/:383-385、_define_fmi2 :74、FC_FMU_SHA256_PINNED :136、run_fc001_shell :183、钉值校验 RuntimeError :198-200、run_hash 零墙钟 :302-309 |
| `tools/oracle/fc001_fmu_parity.py`（:1-20） | parity 独立机检 + 环境缺位 SKIP exit 3 语义（:14-15 区）+ R-G9-02 ≤1e-9 数值容差定性 |
| `tools/backend/fmu/fc001_l1.c`（wc -l）/ `modelDescription.xml`（wc -l）/ `data/fmu/fc001_l1_v1.fmu`（stat） | 344 行 / 99 行 / **18117 字节**——草案头部工件规模引用逐一相符 |
| `tools/run-g2.mjs`（:1-10/:57-59/:102/:138/:176-215） | 头注 :4「36 步全量」、STEPS :102 **36 条实数**（awk 计数）、第 36 步 fc001 parity extended + skipFmu SKIP :138、I-7 步数账纪律块（增删步须 CHG 登记归属层与理由） |
| `tools/copy-guard.mjs`（全文 105 行） | SCOPES=['src'] :15、BANNED :30-51 **43 模式逐条计数**（:37「FMU 结果」/ :35「逐位一致」/ MG 六词 / FC 四词 :48-51）、ALLOW 14 条 :55-68（首条「非机组/电网动态验证」）、D-11 标识符剥离 :77 |
| `tests/teaching.test.js`（:255-275） | :264 `eq(BANNED.length, 43, …)` 镜像断言实读（section 标签串仍写「39 模式」——测试面陈旧标签，断言本身为 43） |
| `src/core/plants/fc001-fmu-adapter.js`（grep 定位 :23/:27/:64/:127-131） | 轨锚定校验三面先例（golden_id :23 / model_provenance :27 / model_id :64）——`gt001-fmu-adapter.js` 确不存在（Create 面正确） |
| `tools/backend/py/bridge.py`（:6-10/:116-122） | 127.0.0.1 回环 + Origin 白名单 + token 安全边界实读 |
| `src/ui/pages/arena.js`（:10/:96/:103/:106）+ grep ARENA_EXCLUDED src/** | **ARENA_EXCLUDED 活性常量已不存在**——仅历史注释行（v1.3.0 收缩为 [] 记录） |
| `FaultLab-evaluation/NEXT/GTL1_G2B_SPEC_APPROVED.md`（grep 定位 :34/:51/:107-110/:146-158/:166/:174/:196-201/:258-259） | 引用保真：601 点库口径（:34/:51）、分区结构「u 不是 RK4 状态——每子步按 L0b 更新序显式推进」:110、k_f=4.070531454334211 :146 / ṁ_a :147 / C_3+ṁ_g0 :148、EQ-GTL1-11 残差 4.3e-14 kW :174 |
| `FaultLab-evaluation/NEXT/GT001_COMBUSTION_G2B_SPEC_APPROVED.md`（grep 定位 :12/:76/:185/:194/:199/:204-232/:243） | 引用保真：τ_comb=0.5 :221、x_comb(0)=k_f·u(0)（Q11）:185/:232、Q10 零新信号 :194/:199、EQ-GTL2-3 冻结式 :221 |
| `FaultLab-evaluation/NEXT/FC001_FMU_G2B_SPEC_APPROVED.md`（grep 定位 :21-99/:103-107/:121/:132/:171-174/:207-214/:224-233/:266-273） | 治理面先例：勘误头七项承接表 :99-107、Q1(A) 601 点定案 :211、B-1a 校正锚 :231、Q13 model_id/adapter 绑定 :132/:233、§2.3 白名单哈希面 :271-273、§2.4 FC_RULE_01..06 = G9 原文转写（GT 无对应上游——草案声明属实） |
| `FaultLab-evaluation/NEXT/V1120_WAVE_DESIGN.md`（:1-8） | CHG-20261118-08 授权记录 :5（草案头部引用相符） |
| `FaultLab-evaluation/DECISIONS/DECISIONS.md`（:1850-1862） | CHG-20261118-07/-08 台账实读（S1 授权链 + DEC-1…4 + 「run-g2 36→36 零增步 + 三不承诺」） |

**实跑命令**（摘录）：
1. `ls data/golden/` → **13 .json + 13 .sha256 = 26 文件**（fc001_fmu_v1、fc001_v1/v2、fl001_v1/v2/v3、gt001_v1…v4、mg001_v1、pv001_v1、wt001_v1）；
2. `node tools/copy-guard.mjs` → `PASS: no banned copy in src/** (43 patterns)`，exit=0；
3. `python -I` 复刻 verify_golden.py:333-405 T-B 分派链 + 自 data/golden/gt001_v3.json 实读 gate 十键，对 gt001_l1_oracle.py 提取的 27 列逐键路由追踪，输出：
   ```
   t_s -> 1  (t)
   _Hz -> 3  (f_true_Hz, f_meas_Hz, f_channel_diff_Hz)
   _rpm -> 1 (n_meas_rpm)
   _kW -> 11 (P_gen_true_kW, P_gen_meas_kW, P_gen_cmd_kW, P_bat_true_kW,
              P_bat_meas_kW, P_load_demand_kW, P_load_served_kW, P_rotor_kW,
              Q_fuel_kW, P_comp_kW, P_turb_kW)
   f_Hz_atol_FALLBACK -> 1 (V_bus_V)
   SOC -> 2  (SOC_true_pct, SOC_est_pct)
   r_true_sub -> 1 (r_true_kW)
   _pct -> 3 (valve_cmd_pct, valve_meas_pct, eta_cycle_pct)
   _K -> 3   (T3_out_K, T2_out_K, T4_out_K)
   _kPa -> 1 (p2_out_kPa)
   ```
   ——27 列全覆盖既有支、零 _mL/_kWh/dim 条件支激活、唯一兜底键 V_bus_V；
4. `grep "水位\|液位\|water level\|liquid level" GT001_FMU_G2B_SPEC_DRAFT.md` → 草案 :123 自身命中（见 P3-2）；
5. `python -I` 解析 gt001_v3.json inertia_model 结构位 → 顶层 1 + config 1 + run 级 6 = 8 处 3 落位（草案「三落位惯例」表述相符）；
6. wc -l/stat 工件规模六件（fc001_l1.c 344 / modelDescription.xml 99 / fc001_fmu_parity.py 147 / fc001_fmu_oracle.py 687 / fc001_l1_v1.fmu 18117 B）。

---

## verdict

**`PASS_WITH_CONDITIONS(3)`** —— 治理/契约面主线断言经实读与实跑全面相符（八面 additive 七项全过：scope 白名单/键面/哈希面/golden 新 id 判据/run-g2 步账/provenance 枚举/compare 零触碰；T-B 分派链 27 列逐键路由实跑零缺口；V312 §10 钉 hash 表与 fmu_admission A-1…A-5 现值相符；copy-guard 43 模式实跑 PASS），但存在 1 项基线计数断言失实（golden 14→实存 13）、1 项 V312 例外行覆盖面主张不完整（FC-001 限定文本 vs GT 复用）、1 项 A-3 转写超出机检实况（仅拒 FL-001），须在批准轮（GTFMU-G2b-02）收口前按条件 B-1…B-3 修正后方可冻结。

---

## 发现清单

### P1（阻断级）

（无——本轮实读/实跑未发现与实现不符的阻断级断言。草案 §4 项 8 的 T-B 分派链逐键路由断言（GT 链最高风险项）经 python -I 逐列复刻**全部成立**，与 FC 轮 P1-1 形态的失实风险在 GT 列面不存在：GT 27 列无 `_mL` 键、无裸 `_cmd`/`_true`/`_est` 尾缀键（P_gen_cmd_kW/valve_cmd_pct 均带量纲后缀先命中既有支）。）

### P2（应修）

**P2-1 草案基线计数断言失实：「data/golden/ 现值 14 golden 实读」——实存 13 golden（+13 sidecar），且草案自列枚举恰为 13 项、V1_FACES §17/§18 v1.10.x 记录两处均写「golden 13 维持」。**

- 草案原文：:31-32（头部）「`data/golden/` 现值 **14 golden** 实读（gt001_v1…v4、fc001_v1/v2、fc001_fmu_v1、fl001_v1/v2/v3、mg001_v1、pv001_v1、wt001_v1——2026-11-18 实读 `ls data/golden/`）」；:89-90（§0 不做 2）「既有 **14 golden**……字节冻结零变更」；:419（§4 项 12）「既有 14 golden 字节零变更」；:495（R-4）「全量回归兜底（14 golden verify 全绿）」。
- 实读证据：`ls data/golden/` 实跑 = 13 个 .json + 13 个 .sha256；草案自身括号枚举（4+2+1+3+1+1+1）= **13 项**；docs/V1_FACES.md:712（v1.10.0）与 :731（v1.10.1）均登记「面② golden **13** 维持」；face② :156 计数快照链（9→10→11→12）+ §16 :693（12→**13**，fc001_fmu_v1 入库）。
- 影响面：该计数被四处复用（基线登记/冻结面/预期失效面/风险兜底），且以「实读」名义登记——按现文冻结，批准文本将携带与目录实况不符的基线数；golden 语义主张（全部既有 golden 字节冻结、新 id 并列）不受影响，纯计数事实面错误。Q2(a) 两新 golden 落地后正确目标计数 = 13+2=**15**（与任务面「golden 13→15」一致），按草案现值 14 将误导为 16。
- 落点：条件 B-1。

**P2-2 草案 Q8/§1.8/§7⑤ 的「Q8 复用档位则零新增 provenance CHG 例外面」主张与 V312 §7 例外行 + fmu_admission A-4 docstring 的 FC-001 限定文本不一致——GT manifest 落 `fmu_l1_lumped_unvalidated` 所依赖的例外授权现值仅覆盖 FC-001，复用须对 FROZEN 清单作扩域修订（属 CHG 面），「零新增例外面」不成立。**

- 草案原文：:281（§1.8）「fc001 Q2 张力面（fmu_admission A-4 vs 专用档位）随复用一并沿袭既有 V312 CHG 例外处置（**零新增例外面**）」；:477（§7⑤）「Q8 复用档位则零新增 provenance CHG 例外面」；:529（Q8 推荐）「枚举零新增 + V312 CHG 例外零新增面」。
- 实读证据：
  - `V312_BACKEND_ADMISSION_CHECKLIST.md` :86-88：「不新增 provenance 档位（**例外——FC-001 已批 FMU 轨**（FCFMU-G2b-02 批准轮，CHG-20261115-10）：Q2(A) 裁定 additive 新档位 fmu_l1_lumped_unvalidated——V312 本行按黑盒准入轨作用域限缩解释，**FC-001 批准轨显式 CHG 例外**（CHG-20261118-01 ④ 授权修订））」——例外行授权主体显式限定 FC-001；
  - `tools/backend/py/fmu_admission.py` :12-15（A-4 docstring）：「例外（CHG-20261118-01 ④）：**已批 FC-001 FMU 轨** manifest provenance = fmu_l1_lumped_unvalidated……」——同为 FC-001 限定；
  - V312 :5-6：「FROZEN……任何修改走 CHG」——对 §7 行的任何扩域（含把「FC-001 批准轨」改写为「已批 FMU 轨」或增补 GT-001 行）均属该 FROZEN 文件的 CHG 修订面。
- 判定：**枚举零新增**成立（registry.js:111/:253-254 两枚举 + fc001_fmu_v1 已立值实读——GT 复用不增值）；但**例外覆盖零新增**不成立：严格读法下，V312 §7/A-4 现文本对 GT-001 轨使用该值并无授权记载，批准轮若不扩域，将出现「准入纪律文本说 FC-001 例外、GT manifest 落同值」的未授权缺口（与 fc001 评审 B P3-6 处置过的「纪律文本 vs 机检现状」漂移同类，但方向相反——那次是机检缺失，这次是授权文本范围）。草案 §7⑤ 的批准 CHG 打包清单已点名「V312 钉 hash CHG/步账 CHG」——扩域修订与钉 hash 同文件同轮，边际成本为零，但**必须显式列入**而非以「零新增」排除。
- 落点：条件 B-2。

**P2-3 草案 §1.2/Q3 对 fmu_admission A-3 的转写「禁借用既有系统 id」超出机检实况：admit() 现值仅拒 `fl001`/`FL-001` 两个值（:68-70），docstring :11 亦自述「禁借用 FL-001 目录清单」——`model_id="GT-001"` 的占用不会被机检拒绝。**

- 草案原文：:150-152（§1.2）「model_id 自述（A-3 禁借用既有系统 id——「gt.sync.fmu_l1」不撞引擎 SystemDef id「GT-001」……）」。
- 实读证据：
  - `fmu_admission.py` :11（docstring）：「A-3 model_id 必须自述（**禁借用 FL-001 目录清单**——engine.js:1407 语义失真防护）」——纪律文本本身即 FL-001 限定；
  - :68-70（admit() 机检）：`mid = str(manifest.get("model_id", ""))` → `if mid == "fl001" or mid == "FL-001": reasons.append("A-3 model_id 不得占用 FL-001…")`——**无 GT-001/gt001 判别**；
  - `self_check()` FS-3（:117-126）同以 fl001 为唯一负例。
- 影响面：fc001 轮时 A-3 机检与 FC 需求恰好同域（禁 FL-001 即所需全部）；GT 作为第二例，「GT-001」占用的防线只剩（i）规格自选自述 id（gt.sync.fmu_l1——草案推荐值本身不撞 systemId「GT-001」/model_id「gt.sync.l0」，V1_FACES 面① :85 实读）与（ii）engine.js model-hash 比对检查（现行位 :3356 附近——「model_hash 不一致，禁止因果表述」实读；fc001 轮已确认原引 :1407 为陈旧锚）。按现文冻结，批准文本将固化「A-3 禁借用既有系统 id」的一般化机检描述，与实现不符。
- 落点：条件 B-3。

### P3（建议）

**P3-1 草案头部/§0 引 `V07_ROADMAP:23`（I-9）偏一行——I-9 表行实际在 :22（:21 I-8 引用正确）。**
- 实读：grep 定位 `V07_ROADMAP.md` :21 = I-8 行、:22 = I-9 行（「golden 入库后其 oracle 源文件字节不可变更……」原文在 :22）。草案 :92 引「V07_ROADMAP:23」、:34-35 引「:21（I-8）」——前者偏一行。语义锚唯一（I-9 表行全文），按草案行号基准说明「批准轮实读复核后加注」机制修正即可。

**P3-2 草案 §0.1⑥「本草案全程规避该四词词面」与同行自列四词字面自涉（:123 实跑 grep 命中水位/液位/water level/liquid level 四词）。**
- 实跑：`grep -n "水位\|液位\|water level\|liquid level" GT001_FMU_G2B_SPEC_DRAFT.md` → :123 命中（该行即登记行本身，四个词面全部出现）。
- 判定：无机检实害——本文件位于 `FaultLab-evaluation/**`，不在 copy-guard 扫描域（`SCOPES=['src']` copy-guard.mjs:15、头注 :7「docs/** 与 FaultLab-evaluation/** 是证据引用，不扫描」实读），且四词系登记性引用（定义面）非文案转写面；但「全程规避」作为字面自述为假。建议措辞校准为「GT 链转写面/实现期文案全程规避该四词词面（本文件登记行自列词面系定义性引用）」。

**P3-3 草案 §2.2 盲包面「GT 在盲测池（ARENA_EXCLUDED=[]——arena.js:10 实读沿袭）」的锚点为历史注释行——`ARENA_EXCLUDED` 活性常量已不存在于 src/**。**
- 实读：`grep -rn ARENA_EXCLUDED src/**` → 仅 4 处注释（arena.js:10/:96/:103/:106——v1.3.0 收缩为 [] 的历史记录语）+ signals.js:1711-1712 注释；无活性常量/变量声明。
- 判定：语义主张成立（六系统全入池——V1_FACES 面⑤ v1.3.0 入池登记 :284-290 实读同源），但「ARENA_EXCLUDED=[]」作为代码现值的「实读」引用指向已移除形态的注释。按行号基准纪律加注（「语义锚 = v1.3.0 收缩为空的历史记录 + 六系统全池现状；原常量已移除」）。

---

## 条件清单（B-1…B-3——批准轮 GTFMU-G2b-02 收口前落正文）

**B-1 golden 基线计数修正（对应 P2-1）**
- 条件：四处「14 golden」改为「13 golden」（:31-32 头部基线、:89-90 §0 不做 2、:419 §4 项 12、:495 R-4），并同步 Q2(a) 目标态表述（13+2=15）；如保留「实读」措辞，补 ls 输出计数注记（13 .json + 13 .sha256）。
- 为什么：P2-1——以「实读」名义登记的基线数与目录实况不符，冻结文本的基线数是批准轮与实现轮回归兜底的对照面。
- 落点建议：四处逐一改数 + §4 项 12 预期失效面行（「新增 2 golden 后 13→15」）。

**B-2 V312 例外行扩域 CHG 打包项显式化（对应 P2-2）**
- 条件：§1.8/§7⑤/Q8 三处的「零新增 provenance CHG 例外面」改写为「枚举零新增；V312 §7 例外行 + fmu_admission A-4 docstring 的适用面扩域（FC-001 限定 → 已批 FMU 轨通用或增列 GT-001）随批准轮 CHG 打包（与 §10 钉 hash CHG 同文件同轮）」，并在 §4 项 12 预期失效面增列该扩域行。
- 为什么：P2-2——V312 为 FROZEN 文件，例外授权文本现值限定 FC-001；不扩域则 GT manifest 落档位值时与准入纪律文本存在未授权缺口，扩域则属 CHG 修订面——两种读法下「零新增例外面」均不成立。
- 落点建议：§1.8 Q8 行、§7⑤ 行、§11 Q8 行、§4 项 12 行。

**B-3 A-3 表述校准与 GT 防失真依赖面登记（对应 P2-3）**
- 条件：§1.2/Q3 的 A-3 引述校准为「A-3 机检现值仅拒 fl001/FL-001（fmu_admission.py:11/:68-70——纪律文本自述 FL-001 目录清单范围）；GT-001 占用的防失真依赖 = 规格自选自述 id（gt.sync.fmu_l1 不撞 systemId/model_id 两域）+ engine.js model-hash 比对检查（现行位 :3356 附近）」，并在 §8 GTFMU-G2b-04 或 §11 Q3 登记「A-3 机检扩集（拒收全部既有 systemId/model_id 两域值）为实现轮 additive 收紧可选项」。
- 为什么：P2-3——批准文本不得固化超出机检实况的一般化禁令描述；第二例三层夹心的身份防失真面须显式落依赖记载。
- 落点建议：§1.2 模型身份行 + §11 Q3 依据列 + §8 GTFMU-G2b-04 可选项。

（P3-1/P3-2/P3-3 为加注级修正，随条件 B-1…B-3 的落正文动作一并处置，不单独设条件。）

---

## Q 点独立意见表（Q1…Q12 逐条——独立形成，未参照评审 A 结论）

| Q | 草案推荐 | 评审 B 意见 | 依据（实读） |
|---|---|---|---|
| Q1（控制积分器 u 层归属——架构纪律面） | (B) u 归 host（子步粒度 doStep 驱动） | **同意草案推荐 (B)** | I-3 认知分离 = 架构硬边界：fc001_l1.c 头注原文（内核内嵌壳职责 = 违反架构——fc001 轮批准口径）+ GTL1 :110 分区冻结文本「u 不是 RK4 状态——每子步按 L0b 更新序显式推进」实读，双层佐证成立。候选 (A) 的输入面扩张（b_Hz/monitor/u_cap/窗标志 + 记账累计器入内核）= 传感污染参数跨测量层/控制层双域渗透 + 记账职责越层——与三层分离直接冲突，草案的架构偏差登记预案（R-2）完备。候选 (B) 的 doStep@0.01/n=1 形态为 FMI 2.0 CS 合法形态（通信步粒度≠积分步长；canHandleVariableCommunicationStepSize=false 钉死固定粒度——与 fc001 Δt=0.1 形态差异属接口排程差异非架构违反，显式登记满足）。ZOH 降级变体排除理由成立：0.1 s 积分步幅 = 10 倍离散语义变更，将破坏与 gt001_v3/v4 的镜像恒等判据面——治理面支持排除并要求「如坚持须重走裁定」的双向登记（草案 :252-253 已登记）。附注：Q1(B) 定案后，§1.3 表 FMU 化标注列即成批准文本组成部分，批准轮应逐行复核「host（Q1 推荐 (B)）」标注与 §1.5 映射合成的一致性 |
| Q2（模型变体面） | (a) thermo 基准 + comb 深化双轨并列 | **同意草案推荐 (a)** | V07_ROADMAP A-6 行 :48 原文域面「EQ-GTL1-1..12/EQ-GTL2 域，gt001_v3/v4 oracle 为 Python 侧权威」实读——双轨点名系上游授权文本原文；DECISIONS.md CHG-20261118-08 DEC-1 实读（「GT-001 FMU 物理域 = thermo（EQ-GTL1）基准 + comb（EQ-GTL2）深化变体两案并列」）——波级已预定向。双包各自钉 hash 与 V312 B-4「各自另批」兼容（§10 表现值 = 每包一行钉值结构，fc001 先例可复制）；两 golden 并列（gt001_fmu_v1/gt001_fmu_comb_v1）不撞名（ls 13 id 实存）、各自 supersedes=null、各自 approval 首签——台账/golden 治理一致性成立。附注：两钉值两 golden 使批准轮 CHG 打包清单须逐项点名（草案 §4 项 12 已点名——确认）；DEFAULT_MODELS 一次追加两成员为库内首例（此前均一波 +1），无先例禁例、无语义增量风险，步① label 滞后说明已沿先例登记 |
| Q3（model_id/model_version/包命名） | gt.sync.fmu_l1 + '1.0.0' | **同意草案推荐（附条件 B-3 表述校准）** | 推荐值不撞两域：systemId「GT-001」（V1_FACES 面① :85）与 model_id「gt.sync.l0」（scope.js 无 GT 分支——新 id 天然落 extension_preview，与 §2.1 backend 路径登记自洽）；fc.pem.fmu_l1 句式先例（V312 §10 :123 实读）+ fc001_fmu_v1 model_version='1.0.0' 实读（data/golden/fc001_fmu_v1.json:4）。A-3 依据须按 B-3 校准（机检现值 FL-001 限定——P2-3），推荐结论不受影响（自述新值本身即规避占用） |
| Q4（golden id + oracle 命名） | gt001_fmu_v1 + gt001_fmu_oracle.py（单文件双 Run 组） | **同意草案推荐** | 新 id 判据：ORACLE_INTERFACE_D2 §3.1「模型/方法变更 → 新 id；保 id 重出仅限 DEC-B 口径（引擎行为零变更的原地扩容）」实读——新实现载体轨不属原地扩容，保 id 重出不适用；命名空间不撞（data/golden 13 id 实存比对）；supersedes=null 并列轨先例（fc001_fmu_v1:9 实读）；I-9 V-03 自冻结（V07 :22 实读）下新 oracle 独立成文为必然形态（gt001_l1/gt001_comb 物理零触碰——§0 不做 2 登记充分）；独立性声明体例（不 import src/**、不 import 既有 oracle、仅 oracle_base 机制层）与 gt001_l1_oracle.py:1-16 / fc001_fmu_oracle.py:1-29 头注实读同构；oracle_base 出生接入要件（六成员 :57 / APPROVAL_FIELDS :49 / write_golden_with_sidecar :179 LF 钉死）实读在位。单 oracle 双 Run 组沿 gt001_l1_oracle 体例成立（Q2(a) 下 comb 组面同文件承载——GT 两 oracle 现状即单文件双轨先例缺失，但 gt001_l1/gt001_comb 分文件系两轮分立所致；单文件双 Run 组治理上无障碍，approval/emit 路径同一机制承载） |
| Q5（Run 白名单范围） | (a) 12 Run 全集 | **同意草案推荐 (a)** | oracle RUNS 6+6 实读（gt001_l1 :191-210 / gt001_comb :228-247——key/role/feedback_mode/family/magnitude/unit/t_clear_s 逐字段与草案 §2.1 转写一致）；镜像基线全集先例（GTL1 §4 项 4/GTCMB §4 项 5——fc001_fmu_v1 5 Run 全集同构）；白名单面零变化成立：scope.js APPROVED :17-30 无 GT 分支 + classify 无 GT 条件实读 ⇒ FMU Run 恒落 extension_preview，后端 Run 强制 extension_preview（:95-102）双保险在位——V312 §6 断言 1-3 机制现值相符 |
| Q6（parity 制度） | (a) fc001_fmu_parity.py 同构独立机检 | **同意草案推荐 (a)** | I-9「验证/parity 等伴生工具一律独立成文」原文（V07 :22 实读）直指；fc001_fmu_parity.py:14-15 SKIP exit 3 语义 + V312 §9⑥ 先例实读；R-G9-02「≤1e-9 规模相对误差」为数值容差承诺非位级承诺（parity 头注 :6-8 实读同款定性）——与 copy-guard BANNED「逐位一致」词面的规避注意：GT parity 文件措辞须继续规避「逐位一致」四字（fc001 parity 头注用「非位级承诺」句式——先例在位）。verify_golden Python-Python 部分走既有 T-B 链分工不变（27 列路由实跑零缺口——见 P1 段） |
| Q7（平台矩阵裁定时点） | (a) 批准轮同轮裁定 + 构成推荐 win64 先行 | **同意草案推荐 (a)** | V07_ROADMAP A-7 行 :49「v1.12/随 A-6 裁定……重钉须 CHG」实读——本波已预登记同轮面（与 fc001 Q10 的「单独波次缺口」语境确已不同）；V312 §10 重钉纪律（编译器/平台矩阵变更 ⇒ 产物字节变更 ⇒ 重钉须 CHG）:125 实读；PLATFORM_DIRS 五平台现值（fmu_admission.py:30-31）使 linux64/.dylib 目录面天然受支持——后补重钉为纯 CHG 面 |
| Q8（provenance 档位） | (a) 复用 fmu_l1_lumped_unvalidated | **有条件同意 (a)。条件：按 B-2 把 V312 §7 例外行 + fmu_admission A-4 docstring 的 GT 扩域列入批准轮 CHG 打包清单** | 枚举零新增成立（registry.js:111/:253-254 两枚举 + fc001_fmu_v1 顶层 :12/run 级 :91 档位实读——GT 复用不增值）；语义同档判定合理（GT FMU 轨同为数值集总未经实验/硬件验证——GTL1 §6.1 定位句沿袭）；候选 (b) 的枚举扩张无语义增量 + 跨载体比对谓词分裂评估成立，维持不推荐。但「零新 CHG 例外面」不成立——V312 :86-88 与 fmu_admission :12-15 现文本均 FC-001 限定（P2-2），须扩域登记。另注：fc001_fmu_v1 是全库唯一携带该档位的 golden（grep 实读）——GT 落值后「跨系统共享档位」才成事实，扩域行即该事实的文本承载 |
| Q9（DEFAULT_MODELS 追加） | (a) 尾追加 gt001_fmu（+gt001_fmu_comb） | **同意草案推荐 (a)** | :311 现值六成员实读（["fl001","fl001_l1","fc001_l1","fl001_cap","gt001_comb","fc001_fmu"]——草案引用逐字相符）；face② MODELS 注册行语义（重指向须 CHG——本项为新增行非重指向，additive 面成立）；尾追加 + 步① 无参调用 + label 滞后维持登记 = 四轮先例形态（:299-310 注释史实读：B-5→v1.4.0→v1.6.0→v1.9.0 全尾追加）；步① 无参调用 7/8 golden 算术正确（6+1/6+2）。一次追加两成员系首例但无禁例（Q2 附注已述） |
| Q10（run-g2 步账 + parity 步形态） | (a) 新增独立 parity 步（第 37 步，CHG 扩账申报 36→37） | **同意草案推荐 (a)** | run-g2.mjs :4 头注「36 步全量」+ STEPS 36 条实数（awk 计数）+ 第 36 步 fc001 parity extended tier + skipFmu SKIP（:57-59/:138 实读——skipReason 显式登记编译产物缺位语义）；I-7 纪律块（任何增删步在 CHG 登记归属层与理由）:176-215 实读；单波 ≤+1 预算制（V1_FACES 面⑦ :347「DEC-E 口径单波 ≤+1」）——36→37 = +1 预算内显式申报。候选 (b)（fc001_fmu_parity.py 通用化改既有步）与 I-9 独立成文张力成立——草案权衡正确；CHG-20261118-08 ④「run-g2 36→36 零增步」系治理波承诺，本草案 0 步承诺不预设、实现轮扩账走 Q10 CHG——与台账字面一致 |
| Q11（oracle 自检段名） | (a) GTFMU-1…n | **同意草案推荐 (a)** | V07 A-6 行 :48 原文点名「GTFMU-x 自检」实读——上游授权文本命名，非开放裁定面；(c) FMU-1…n 与 fc001_fmu_oracle FMU-x 段跨文件同名（fc001_fmu_oracle.py:25 头注「FMU-1…7 自检」实读）——V-04 报告/审计面的段名混淆评估成立；(b) GFMU 缩写与授权文本不符。GTFMU-1…7 内容预案（GL-1…8/GCMB-1…7 同构映射）治理面无异议——段名唯一性 + oracle_base 自检契约（exit 0/2）承载成立 |
| Q12（FMU 轨选择键面） | (a) plant adapter 层绑定 | **同意草案推荐 (a)** | 零新键可行性实读：INERTIA_MODELS :56 四值（swing/linear/thermo/thermo_comb——FMU 镜像轨双值已被既有枚举承载）+ EVENT_KEYS :52 封闭白名单 + hashProjection 实读（新增显式键将入 scenarioHash 投影——B-1(a) 条件式形态可承载缺省零变化，但 adapter 绑定涟漪更小）；config_hash 投影面零变化成立（schema.js :144 inertia_model 既有投影成员实读——FMU 轨不改投影面）；fc001-fmu-adapter.js 轨锚定校验三面先例实读（golden_id :23 / model_provenance :27 / model_id :64——gt001-fmu-adapter.js 确不存在，Create 面登记正确）；备选（场景显式新键）的停下显式 CHG 退出路径登记完备。附注：gt001_v3 inertia_model 三落位惯例（顶层/config/run 级——python 实读 8 处 3 结构位）为 §4 项 6 的镜像轨元数据落位提供实测先例 |

（Q1…Q12 全部在治理面范围内给出意见；其中 Q1 的更新序等价性细目、Q5 的物理参数面、稳态点复算归 W2a 物理评审路——本表仅就其治理/架构纪律面表态。）

---

## 独立性声明

1. 本评审仅以本报告头部「实读文件清单」所列仓库文件与实跑命令输出为输入；评审范围限定治理/契约面七项（八面 additive、B-1a 键面、golden 治理、V312 准入、步数账、copy-guard、Q 点意见）。
2. 草案 §10.1 中「评审人 A（物理/数值）」回填行（verdict「待回填」占位）**未被读取作为评审依据**；`evidence/g2b/` 目录内评审 A 的报告文件（GTFMU_G2B_REVIEW_A.md）**未被打开/读取**（本评审成文全程未以其为锚定或输入）；本报告全部 P/Q 结论由上列实读证据与实跑输出独立得出。若后续与评审 A 结论存在交叉（如 §4 项 8 分派链路由的核验与数值面评审的可能重叠），属独立双路对同一实现事实的各自命中，非引用。
3. 除本报告文件（`FaultLab-evaluation/NEXT/evidence/g2b/GTFMU_G2B_REVIEW_B.md`）外未写入/修改任何仓库文件。

---

**评审 B 签署**：独立评审 B（治理/契约面）· 2026-11-18 · verdict `PASS_WITH_CONDITIONS(3)`（P1=0 / P2=3 / P3=3；条件 B-1…B-3 见上；Q1…Q12 意见见上表）。

**文件结束**。
