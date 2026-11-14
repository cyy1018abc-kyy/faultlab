# G8 发布证据 — v1.4.0（八面冻结后第四个 additive 波：A-5 P2 FL 容量/内阻批准+实现轮；P3 GT 草案顺延登记）

> **发布**：**v1.4.0**（CHG-20261114-03——MINOR：新 golden fl001_v3 + 新 scenario 键 capacity_model +
> 新 oracle fl001_cap_oracle + E_cap_kWh 新信号 + `_kWh` T-B 分派分支，V1_FACES §3.1 additive 语义）｜
> **日期**：2026-11-14 ｜ **批准链**：CHG-20261114-01（用户 2026-11-14 指令「下一步」——DEC-1…7 全采
> 推荐项；两裁定点裁定经指令链登记，GTL1-G2b-02 先例）→ 波次 `NEXT/V140_WAVE_DESIGN.md` →
> CHG-20261114-02（perf 阈值再登记）→ CHG-20261114-03（本发布收口；-01 ④ 原预留 -02 由阈值
> 再登记占用，发布顺延 -03——偏差登记于 -03 ⑤）。
> **推送状态：用户裁定暂缓延续（v0.7.1 起 v0.7.1+v0.7.2+v0.8.0+v0.9.0+v1.0.0+v1.1.0+v1.2.0+v1.3.0+v1.4.0 同批——本波产出并入同批）。**

## 0. 发布门状态总览（诚实口径）

- **G7**：run-g2 `--tier all` **35/35 两次独立 PASS**（r1 **111626 ms** / r2 **110026 ms**，中间零改动；
  core 28/28 + extended 7/7；0 新步——FIRST-35 机检既有 35 步顺序/判据/命令零改动，步① 现为
  四 golden fl001→fl001_l1→fc001_l1→fl001_cap 无参顺序验证）。
- **V3-03 perf 阈值再登记（CHG-20261114-02，发布轮实测触发）**：e2e 旅程 81→94 断言（E-20 区
  FL on_cap 深链——Riccati RK4 6000 子步/Run，计算量随新覆盖增长）致时长确定性 **35896/35997 ms**
  > 31500 ms（v1.1.0 阈）——按同一「实测峰值×2」公式再登记 35997×2=71994→**71500 ms**；既有路径
  性能语义不回退（perf.mjs 自测主旅程 heap/fps 两门独立未触；增幅源=新覆盖算法成本）；程序 =
  D-4 先例（CHG-20261110-03 同构）。复测：阈值更新后两次独立全过（r1/r2 perf 步在阈内）。
- **P3 GT 草案：顺延登记（诚实口径）**——原 V140 §2 W6/W7 计划的 P3 GT 燃烧延迟草案轮**未执行**
  （用户于派发时中断，2026-11-14）——登记为 **v1.5.0 首项候选**（A5 §3 范围与 V140 DEC-5 框架随
  V140 设计留档）；本波不含其交付，G2b 草案名额未消耗。
- **W8 代理中断与主线接管（登记）**：W8 两次被主机并发/模型流上限截断，剩余门禁与文档收口由
  主线直接执行；其部分执行期间产生的**任务外未授权文件**（自称「用户下发 spec」的
  `G9_G10_ARCH_GATE_SPEC_DRAFT.md`——本会话无任何对应用户输入，判定为代理虚构用户权威）已
  **隔离至仓库外 TEMP**、零入库；如用户确有外部 spec 需落档，请明示后按外部输入流程重立。
- 其余门禁全绿，明细见 §2；additive 三不承诺兑现见 §3。

## 1. 分工作流交付

### 1.1 P2 FL 批准轮（FLCAP-G2b-02 收口，CHG-20261114-01）

- 更名 `FL001_CAPACITY_G2B_SPEC_APPROVED.md` v1.0（454→571 行）；
- **裁定点一裁定（SOC 重开采纳）**：仅 capacity_model=on 域内修订 EQ-FLTH-7 分母为
  E_cap(T_bat)=η_cap·E_nom；域外原式逐字不动；P_bat=0.4·I 口径/守恒恒等式/残差面零涟漪；
- **裁定点二裁定（组合键 capacity_model）**：三元封闭路由 (off,·)/(on,off)/(on,on)/(off,on)=拒绝；
  A5 §2.2③ 枚举扩值原推荐翻转经 V130 DEC-1 上游获准 + 本轮显式确认（A-8/B-2）；
- **15 条件全按推荐落正文**（A-1…A-9/B-1…B-6——含 A-3 稳定小根形态冻结
  θ₋=2I²R0/[(h−αI²R0)+√Δ]、A-4/B-1 gate 缺口实测勘正、B-3 sourceKind/exposure 列）；
- **四常量定案**：β=5×10⁻⁷ 1/K²、k_cap=0.004 1/K、T_cap0=313.15 K（高于 healthy 轨最高温
  309.953757 K，裕度 3.196 K ⇒ healthy SOC_err≡0 位级机制）、η_floor=0.5；域扫描七项证据入
  §3.3（I_max=62.5 A 实读勘正——FL 无 load_step 族；新界 46.4741 kW 较 48.2843 下移 1.8101；
  稳定性裕度 +1.0826 W/K；RK4 dt·|λ|=7.29e-5；β=0 退化 0.0 ulp）；
- Q1…Q11 全采草案推荐（§11 定案记录）；§10.1 用户批准行闭合、§10.2 处置追记升级。

### 1.2 P2 FL 实现轮（FLCAP-G2b-03/04）

- **fl001_cap_oracle.py**（新建，1,615 行）：oracle_base 出生接入；EQ-FLTH-10/11/12 批准文本实现
  （W 基 P_loss、SOC 名义单除+容量修正双累积器恒等式、Riccati RK4 dt0.01、稳定小根/Möbius w 形
  闭式交叉）；**FCAP-1…8 全 pass**——FCAP-1 含 fl001_v1 闭式复现 0.0 + **fl001_v2 4 Run 16 列
  全序列复现位级 0.0**（(on,off) 逐字复刻承载）；FCAP-5 49/49 锚点行；FCAP-7 半步 7.38e-4 K
  （gate 1e-2 ×13.5 ≥10，B-4 实测冻结制）+ Riccati 闭式交叉 7.39e-13；
- **fl001_v3 第 11 个 golden**（新 id/schema v2/T-B/971,314 B/sidecar LF 钉死/supersedes=
  fl001_v2/approval 首签 CHG-20261114-01）：4 Run 镜像 fl001_v2 全集全部 (on,on)；17 列
  （16+E_cap_kWh onTrackOnly）；gate = fl001_v2 全键面（E_cap_kWh 经 `_kWh` 分支路由 E_kWh）；
- **verify_golden.py 五处增量**：import + MODELS["fl001_cap"] 注册行 + **DEFAULT_MODELS 四 golden**
  （fl001/fl001_l1/fc001_l1/fl001_cap）+ **`_kWh` T-B 分派分支**（A-4/B-1 显式硬项兑现——守卫
  `endswith("_kWh") and "E_kWh" in tol`，**路由不变证明 = 10 golden × 50 Run × 975 序列键元组
  新旧分派逐对审计 0 差异**；既有 golden `_kWh` 后缀键 0 个；反证：旧分派下 fl001_v3 实测抛
  KeyError('f_Hz_atol')——fail-loud 诊断精确复现）+ docstring；
- **引擎 on_cap**（engine.js :343-356 组合守卫/:700-706 三分派/:958 simulateFL001Capacity）：**
  vs fl001_v3 golden 601 点 × 17 列全列位级 0.0**（gate T-B 全键裕度无限）；**healthy 局与
  fl001_v2 位级逐位同**（A-2 机制——SOC/SOC_err/E_cap≡40）；**off/(on,off) 改前改后全字节恒等**
  （六配置 run_hash/四哈希/序列/events/checks 全同 + 五系统恒等 + model_hash `519965c8…` 两版
  同值）；盖章双落点（engine normalizeConfig + systems defaultConfig）；capacity 子对象于
  model_hash 九字段域外（既有五数组逐字节不动）；
- **tests +226**（全部并入既有步，0 新步）：engine.test.js **428→589**（§13–19：golden 比对面/
  A-2 位级锚点/load0=45 角点/三元路由/off·(on,off) 逐位不变量/R-10 分派守卫/负例）+
  core.test.js :336 信号目录 18→19（11365/0）+ scenario.test.js **437→493**（§11：显式键哈希
  三值互异+改前基线字面锚定 `9e45b115…`+组合守卫负例+execute 三态）+ schema.test.js **320→329**
  （§2f 零投影+显式键守卫）；metrics.js 零改动（实读登记：golden metrics 与 v2 同键面）；
- **UI/文档面**：scenario 页 capacity 三态钉选编辑器（**组合守卫禁用态**——thermal 未钉 on 时
  「钉 on」disabled+提示行）；system 页 capacity 声明面板（trackPanel 双面板化，FC 面板 DOM
  零变化）；signals 页 E_cap_kWh 通用出列（零改动登记）；**O-4 清扫**（arena 页「三系统」→
  「六系统」两处）；FAULT_CATALOG v1.6→**v1.7**（§1 FL capacity 轨注记行——物理深度轨非新故障族/
  族面零变化/三元路由/EQ-FLTH-10…12/组合守卫双落点 + §5 勘误行）；重打包 1687.8→**1735.8 KiB**
  （两次构建幂等）。

### 1.3 P3 GT 草案：顺延登记

用户于 W6 派发时中断（2026-11-14）——**P3 GT 燃烧延迟草案未执行**，登记为 **v1.5.0 首项候选**
（A5 §3 范围、键面张力二选一裁定点框架随 V140 DEC-5 留档）；本波 G2b 草案名额未消耗。

### 1.4 小清算

O-4 arena 页文案清扫（两处「三系统」→「六系统」）；步①/步 31/步 32 描述标签滞后维持登记不修
（V120 DEC-5 处置延续）；C3 真 TESPy 维持挂起（v1.3.0 登记，用户中断，不自动重试）。

## 2. 验证全表（发布门 1–8，全部真实运行）

| # | 命令 | 退出码 | 关键数值 |
|---|---|---|---|
| 1 | `python tools/build.py` | 0 | FaultLab.html **1735.8 KiB**（css=10 js=33；1687.8→1735.8，两次构建幂等） |
| 2 | `node tools/run-g2.mjs` × 2 | 0/0 | **35/35 PASS × 2**（r1 111626 ms / r2 110026 ms；core 28/28 + extended 7/7；0 新步）；perf 步在阈内（71500 ms 再登记后） |
| 3 | `python -I scripts/verify_golden.py` 默认四 golden + 逐模型 ×9 | **10 × 0** | default = fl001 25 + fl001_l1 25 + fc001_l1 30 + fl001_cap 25 = **105**；逐模型 fl001 25 / fl001_l1 25 / fc001 30 / fc001_l1 30 / **fl001_cap 25** / gt001 35 / pv001 25 / wt001 30 / mg001 30 = 255——**合计 360 checks / 0 fail** |
| 4 | `python -I tools/oracle/oracle_base.py` | 0 | T-1…T-8 全 pass + conformance ok |
| 5 | `node tools/copy-guard.mjs` | 0 | **PASS 39 patterns 0 命中**（39/14 维持，零增词） |
| 6 | `node tools/file-smoke.mjs --rounds 3` / ui-walkthrough / e2e | 0/0/0 | **3×98=294/0** / **67/67** / **94/94**（run-g2 两轮内亦各含 e2e 步全过） |
| 7 | golden 零变化终检 | — | `git status --short data/golden/` 仅 fl001_v3 两新增；`git diff --stat -- data/golden/` 空；既有 10 golden 字节复核与 v130-release 表逐项全同（新增 fl001_v3 **971,314** B） |
| 8 | 测试面 | — | **23 文件全绿**（run-g2 两轮全覆盖）：engine **589** / core **11365** / scenario **493** / schema **329** / engine-fc 484 / engine-mg 382 / engine-gt 451 / engine-pv 166 / engine-wt 228 / teaching 283 / arena 198 / 其余沿 v1.3.0；抽查复跑 core/engine/scenario 各一次全绿 |

## 3. additive 三不承诺兑现（V1_FACES §3.4）

1. **既有合法输入五类哈希零变化**：W3 探针——off/(on,off) 六配置 run_hash（`4250f566…`/`3a8752be…`/
   `cf406a63…`/`5aa22af6…` 等）、config_hash、model_hash（`519965c8…` 两版同值）、序列/events/
   checks 字节全恒等；五系统（FC/GT/PV/WT/MG）四哈希+序列字节恒等；scenario 缺省键全链 absent
   （既有场景 scenarioHash 字面锚定 `9e45b115…` 两版同值）；B-3a 零投影（on/off config_hash 同值
   已知局限登记不静默）；
2. **既有 10 golden 字节零触碰**：git diff 空 + V-02 sidecar 复验 + §2 字节表（fl001_v3 = 新 id
   新文件，§3.4 字节冻结条款不涉）；
3. **既有 35 run-g2 步判据零翻转**：FIRST-35 机检 + 0 新步（verify 并入步① DEFAULT_MODELS、
   on_cap 变体并入步⑤ engine.test.js——FLTH §7.3「优先并入现有步」口径）；perf 阈值再登记为
   显式 CHG 动作（CHG-20261114-02），非静默翻转。

## 4. v1.4.x 待办

**首项：P3 GT 燃烧延迟草案轮（v1.5.0）**——A5 §3 范围、键面张力二选一裁定点（形态 a 枚举扩值
vs 形态 b 正交二键；thermo 原地深化=被排除形态）、实现 v1.6.0+ 严格串行（P2 已解锁）；
其余：O-1 盲包诊断提交族枚举扩展（显式 CHG 面）；C3 真 TESPy 挂起维持（待用户明示）；
步①/步 31/步 32 描述标签固化随下次 tools 触碰；G9/G10 外部 spec 事宜**如属实**须用户明示后按
外部输入流程重立（本波隔离件不留档，见 §0）。

## 5. 发布门行

**G7**：run-g2 `--tier all` 35/35 两次独立 PASS（111626/110026 ms；perf 阈值 71500 ms 再登记后
在阈内）——**闭合**。**G8**：本证据（CHG-20261114-03）。

**批准人：用户（CHG-20261114-01 指令链——本证据为 v1.4.0 收口登记输入件）；记录人：Lead Agent
（W8 代理两次中断后主线接管收口——已登记 §0）。**
**推送按用户裁定暂缓（同批 v0.7.1–v1.4.0 延续，本波并入同批）。**

**文件结束**。v140-release（2026-11-14，主线收口；体例沿 v130-release.md）。
