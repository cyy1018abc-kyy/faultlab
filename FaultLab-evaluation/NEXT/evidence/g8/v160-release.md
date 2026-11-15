# G8 发布证据 — v1.6.0（八面冻结后第六个 additive 波：A-5 P3 GT 燃烧延迟批准+实现轮；G9/G10 顺延 v1.7.0）

> **发布**：**v1.6.0**（CHG-20261115-03——MINOR：新 golden gt001_v4 + inertia_model 枚举 +1 值
> "thermo_comb" + 新 oracle gt001_comb_oracle + checks.js comb 分支，V1_FACES §3.1 additive 语义）｜
> **日期**：2026-11-15 ｜ **批准链**：CHG-20261114-07（用户 2026-11-14「下一步」默认排程——DEC-1…5
> 全采推荐 + Q12 否决升位 + 键形态=形态 a 枚举扩值，GTL1-G2b-02 先例）→ CHG-20261114-08（批准轮
> 收口）→ CHG-20261115-01/02（实现轮两次顺延登记 + 记录更正——W2 经中断代理已完成并入 7eea947）
> → CHG-20261115-03（本发布收口；-14-08 原预留发布号由批准轮收口占用，发布顺延当日 -03——偏差登记）。
> **推送状态：用户裁定暂缓延续（v0.7.1 起至 v1.6.0 同批）。**

## 0. 发布门状态总览（诚实口径）

- **G7**：run-g2 `--tier all` **35/35 两次独立 PASS**（r1/r2 均"四件套聚合全部通过"；r2 报告
  **109475 ms**，core 28/28 + extended 7/7；0 新步——FIRST-35 机检既有 35 步零改动，步① 现为
  五 golden fl001→fl001_l1→fc001_l1→fl001_cap→gt001_comb 无参顺序验证）；perf 步 12725/12568 ms
  ≪ 71500 ms（CHG-20261114-02 阈值维持，本波零判据变更——e2e 旅程断言数 94 不变）。
- **G9/G10：顺延 v1.7.0（诚实口径）**——原 V160 设计不含 G9/G10（V150 收口默认排程明示顺延）；
  CHG-20261114-06 双裁定（排程/FC 物理处置）已解锁，启动波待用户下轮指令。
- **W8 型代理中断教训延续**：本波实现由**主线直接执行**（用户两次拒绝 W2 子智能体派发后——
  CHG-20261115-01/02 登记；被中断代理的 W2 产品经全量验证收编）。
- 其余门禁全绿，明细见 §2；additive 三不承诺兑现见 §3。

## 1. 分工作流交付

### 1.1 P3 GT 批准轮（GTCMB-G2b-02 收口，CHG-20261114-07/08）

- 更名 `GT001_COMBUSTION_G2B_SPEC_APPROVED.md` v1.0（473→712 行）；
- **键形态裁定 = 形态 a 枚举扩值 "thermo_comb"**（GTL1 §2.4 三值枚举先例 + B-2 修正后
  config_hash 轨区分面强化；四元 golden 映射 linear→v1/swing→v2/thermo→v3/thermo_comb→v4；
  被排除形态维持）；
- **τ_comb = 0.5 s 定案**（七项判据域扫描：|Δf| 全窗 0.999640 < 1.0 边界敏感性登记 §1.3/§9
  R-12；GL-6 gap 界重推 5e-4 Hz；RK4 裕度 57.8×；三点稳态不变性 9 位全同；可辨识 +5 采样；
  包络重推 T3 [735.3,1524.9]/T4 [486.7,1001.2]；稳定性/收敛 3.601e-4 ≤ 4e-3）；
- **11 条件全按推荐落正文**（A-1 P1 两口径逐锚点表 15 行入 §3.3；A-5/B-1 三处守卫 additive
  勘正；B-2 config_hash 投影失实订正——inertia_model 现状在投影内、强化形态 a）；**Q12 否决
  草案推荐**（model_version 维持 '1.2.0' 仅登记——model_hash 九字段承载面，FC Q1=B/FL 同构）；
  Q1…Q13 其余全采推荐；§10.1 用户批准行闭合。

### 1.2 P3 GT 实现轮（GTCMB-G2b-03/04；W2 经中断代理完成并收编 + W3–W5 主线执行）

- **gt001_comb_oracle.py**（1,440 行，中断代理产品经验证收编）：oracle_base 出生接入；
  EQ-GTL2 三维 RK4 分区（x_comb 一阶滞后 τ_comb=0.5s、Q_f 冻结子步起点、ṁ_g 延迟同源 Q13(i)）；
  **GCMB-1…9 全 pass**（GCMB-1 thermo 退化交叉、GCMB-3 三点稳态不变性、GCMB-7 半步+解析指数
  交叉、GCMB-9 gap 新界 5e-4）；**gt001_v4 第 12 个 golden**（6 Run 镜像全部 thermo_comb、
  schema v2、T-B 十键镜像、27 列同集零新信号 Q10a、2,373,000 B、supersedes=gt001_v3、
  model_version 1.2.0（Q12）、approval 首签 CHG-20261114-07）；
- **verify_golden.py 五 golden**：import + MODELS["gt001_comb"] 注册行 + DEFAULT_MODELS 尾追加
  （fl001/fl001_l1/fc001_l1/fl001_cap/gt001_comb）+ docstring；**零新 gate 分支**（27 列同集
  落既有量纲支——路由审计随 §3 探针）；
- **引擎 thermo_comb 分支**（engine.js :1521 三分派 + simulateGT001Combustion 新函数）：
  EQ-GTL2 三维 RK4（x_comb 入物理状态、Q_f 冻结子步起点、ṁ_g 延迟同源）；**vs gt001_v4
  6 Run 全列 gate 内一致（探针 295/295 → 正式测试 566/566）**；**A-2 健康局/monitor 与 thermo
  轨位级逐位同**（x_comb(0)=k_f·u(0) 稳态初始化 ⇒ dx_comb/dt≡0）；**thermo/linear/swing
  三既有轨全字节恒等**（探针：六配置 run_hash/四哈希/序列/events/checks 全同 + 五系统恒等 +
  model_hash 零变化）；
- **三处守卫 additive**（B-1）：scenario.js INERTIA_MODELS :56 扩值 + :402 消息串；engine.js
  :321-324 条件+消息串；schema.js :231-234 条件+消息串——既有三值路径零变化探针；
- **checks.js comb 分支**（**规格 GTCMB-G2b-04 行漏 checks.js 项——实现轮实测补齐并登记**）：
  gt-energy-consistency 延迟口径分支（EQ-GTL2-12：|C_3·ΔT3 − E_comb_net| ≤ 1e-3，七场景复算
  worst 7.2536e-7 ×≥1378；**分支置于 swing 裸兜底之前**——兜底吞没首插教训登记）；既有
  thermo/linear/swing 分支零变化；
- **metrics.js 一处门扩值**：thermo 轨标量注册门（E_fuel/eta_cycle/E_comb_net）扩 thermo_comb
  （:428——既有 thermo 路径零变化）；
- **tests +115**（engine-gt **451→566**：verifyGoldenComb 专用比对器沿 verifyGoldenThermo
  体例——t 列 run.timeseries.t/seriesLimitTB/metrics .value 包装/SCALAR_TO_METRIC + A-2 位级
  恒等 6 键 + A-1 两口径分歧 + A-3② 可辨识 + 盲面守卫 + 扩值回归；core :336 类信号目录断言
  零变化——GT 零新信号）；0 新步（并入步①/步 21）；
- **UI/文档面**：GT001.levelFor/summaryFor cfg 感知派生（level_on=「L1 · 燃烧动态延迟模型
  （数值仿真级）」——home :192 通用消费入口即插即用）；GT001.model.combustion 子对象
  （model_hash 九字段域外）；causalTemplates thermo_track 卡挂载条件扩值（comb 轨共享热力链
  叙事——引擎挂载点 additive）；FAULT_CATALOG v1.7→**v1.8**（§3 GT combustion 深化轨注记行——
  非新故障族/族面零变化/四元映射/EQ-GTL2/checks.js 分支登记）；重打包 1736.7→**1754.4 KiB**
  （两次构建幂等）。

### 1.3 顺延与登记（诚实口径）

- **G9/G10 顺延 v1.7.0**（V150 收口默认排程 + CHG-20261114-06 双裁定承接——启动波待用户下轮
  指令）；**C3 真 TESPy 挂起维持**（两轮中断，待用户明示）；步①/步 31/步 32 描述标签滞后
  维持登记不修；
- **CHG 编号偏差**：-14-08 原预留 v1.6.0 发布，实际由批准轮收口（CHG-20261114-08）占用；
  发布顺延 **CHG-20261115-03**（偏差登记于本证据与 -03 ⑤）。

## 2. 验证全表（发布门 1–8，全部真实运行）

| # | 命令 | 退出码 | 关键数值 |
|---|---|---|---|
| 1 | `python tools/build.py` | 0 | FaultLab.html **1754.4 KiB**（css=10 js=33；1736.7→1754.4，两次构建幂等） |
| 2 | `node tools/run-g2.mjs` × 2 | 0/0 | **35/35 PASS × 2**（r2 109475 ms；core 28/28 + extended 7/7；0 新步；步① 五 golden；步 21 断言 451→566） |
| 3 | `python -I scripts/verify_golden.py` 默认五 golden + 逐模型 ×10 | **11 × 0** | default = fl001 25 + fl001_l1 25 + fc001_l1 30 + fl001_cap 25 + gt001_comb 35 = **140**；逐模型 fl001 25 / fl001_l1 25 / fc001 30 / fc001_l1 30 / fl001_cap 25 / gt001 35 / **gt001_comb 35** / pv001 25 / wt001 30 / mg001 30 = 290——**合计 430 checks / 0 fail** |
| 4 | `python -I tools/oracle/oracle_base.py` / `node tools/copy-guard.mjs` | 0/0 | T-1…T-8 全 pass / **PASS 39 patterns 0 命中**（39/14 维持，零增词） |
| 5 | `node tools/file-smoke.mjs --rounds 3` / ui-walkthrough / e2e | 0/0/0 | **3×98=294/0** / **67/67** / **94/94** |
| 6 | golden 零变化终检 | — | `git status --short data/golden/` 仅 gt001_v4 两新增（本波入库）；`git diff --stat -- data/golden/` 空；既有 11 golden 字节复核与 v150-release 表逐项全同（新增 gt001_v4 **2,373,000** B） |
| 7 | 测试面 | — | **23 文件全绿**：engine-gt **566** / core 11365 / scenario 493 / schema 329 / engine 589 / engine-fc 484 / engine-mg 382 / engine-pv 166 / engine-wt 228 / teaching 283 / arena 218 / arena-protocol-negative 80 / 其余沿 v1.5.0 |
| 8 | 抽查复跑 | — | core / engine-gt / scenario 各一次全绿（与计数一致） |

## 3. additive 三不承诺兑现（V1_FACES §3.4）

1. **既有合法输入五类哈希零变化**：thermo/linear/swing 三轨与 gt001_v1/v2/v3 逐位同（W3 探针：
   六配置 run_hash/四哈希/序列/events/checks 全同 + 五系统恒等 + model_hash 零变化）；三处守卫
   additive 后既有三值路径零变化探针；inertia_model 在 config_hash 投影内（B-2 定案）⇒ 深化轨
   config_hash/run_hash 天然区分、无 B-3a 碰撞局限；
2. **既有 11 golden 字节零触碰**：git diff 空 + V-02 sidecar 复验 + §2 字节表（gt001_v4 = 新 id
   新文件，§3.4 字节冻结条款不涉）；
3. **既有 35 run-g2 步判据零翻转**：FIRST-35 机检 + 0 新步；checks.js comb 分支为 additive
   （既有 thermo/linear/swing 分支零变化——规格 GTCMB-G2b-04 行漏项登记补齐）；metrics.js 门
   扩值 additive（thermo 路径零变化）。

## 4. v1.6.x 待办

**首项：G9/G10 启动波（v1.7.0）**——CHG-20261114-06 双裁定已解锁（G9 FC-001 5 态 L1-FMU 走
G2b 草案轮：golden fc001_fmu_v1 新 id；I-11 S3 收口；G10 Arena L2 query-budget + MCP；
七项契约面预裁定待办在落档文件勘误头）；其余：P3 批准轮条件全数闭合（无残留）；C3 真 TESPy
挂起维持；步①/步 31/步 32 描述标签固化随下次 tools 触碰。

## 5. 发布门行

**G7**：run-g2 `--tier all` 35/35 两次独立 PASS——**闭合**。**G8**：本证据（CHG-20261115-03）。

**批准人：用户（CHG-20261114-07 指令链——本证据为 v1.6.0 收口登记输入件）；记录人：Lead Agent
（实现轮主线直接执行——CHG-20261115-01/02 登记路径）。**
**推送按用户裁定暂缓（同批 v0.7.1–v1.6.0 延续，本波并入同批）。**

**文件结束**。v160-release（2026-11-15，主线收口；体例沿 v150-release.md）。
