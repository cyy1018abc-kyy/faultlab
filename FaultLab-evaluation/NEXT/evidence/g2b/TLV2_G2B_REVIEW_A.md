# TLV2_G2B_REVIEW_A — TL 联合轨 v2 规格草案独立评审 A（物理/架构面）

- **评审人**：独立评审 A（物理/架构面；与评审 B 互不可见，未读取 TLV2_G2B_REVIEW_B）
- **评审日期**：2026-11-28
- **评审对象**：`FaultLab-evaluation/NEXT/TL001_V2_G2B_SPEC_DRAFT.md` **v0.1**（165 行）
- **性质**：只读审计 + 仅写本文件；仓库其他文件零改动
- **实读**：草案全文；v1 规格 §1.3–§1.5 / §2.1–§2.5 / §3.1–§3.3；`tools/oracle/gt_tl_joint_oracle.py` 全文；
  scratchpad `proto/proto_v2.py`（与 v1 oracle 逐行 diff：仅 K_D/U_REF、line_trip Run、scale_at、governor 分支、事件映射）；
  `tools/backend/fmu/gt_tl_joint_l1.c`（:5-18 / :71 / :114 / :183-184）；`tools/backend/py/fmu_runner.py`（:589、:648）；
  `src/core/systems.js`（:949、:985、:993、:997、:3221-3240、:3320-3360、:3404）；`data/golden/gt_tl_joint_v1.json`（只读）。
- **实跑**（全部 `python3 -I`，脚本均在 scratchpad `proto/`：anchors.py / half.py / eig.py / sweep.py / cct.py）：
  9 Run 锚点复算；K_D ∈ {5,10,20} 敏感性；proto `self_check()`（golden 路径改指仓库）；dt_int 半步/四分步收敛；
  [f,T3,δ] 数值雅可比特征值（droop 代入、无延迟连续化）；参数域角点扫描（b=1.0、ΔP_load=20、line_fault 1.0 s、line_trip s∈[0.21,0.5]）；
  line_fault t_clear 扫描（v1 vs v2）。

---

## verdict

**PASS-WITH-CONDITIONS(3)** —— C-4/C-5 方向物理正确：接通态下垂使 v1 零特征值消失、稳态唯一（模 2π）且线性化渐近稳定；
I-3 分区成立（内核/FMU 零改动可行）；`p_elec_scale = 0.5` 在本模型（纯电抗、无机内电抗）下对单回跳闸是**精确**表达；
§3.1/§3.2 锚点表 9 Run × 全列与 K_D 敏感性表**逐数复现**。三项 MAJOR 须在 v0.2 处置：R-A-01（K_D「R=5%」推导混用指令域与出力域，
实际 R_eff = 3.75%）、R-A-02（F-1 撤销只在默认幅值验证；K_D=20 在 SystemDef 幅值上限 b=1.0 处 F-1 复现）、
R-A-03（「GLJ-1…6 沿用」不成立——瞬时下垂使 host 回路 O(h) 化，GLJ-6 实测 1.058 > 门 0.15）。

发现 13 项：BLOCKER 0 / MAJOR 3 / MINOR 7 / NOTE 3。

---

## 发现

### R-A-01 — MAJOR — K_D 推导把 kW_eq 指令域当作出力域，实际调差率 R_eff = 3.75% 而非 5%

- **证据**：草案 :43 `K_D = P_gen0/(R·f₀) = 25/(0.05×50)`；§3.2 :80-84 R 列 10%/5%/2.5%。但 u 是燃料指令域（`Q_f = K_F·u`），
  稳态 dP_gen/du = **1.3321**（eig.py：u=24.9→25.1 稳态 T3 中心差分；仓库自载同数——systems.js:997 A-gtl1-combustor-lump「回路增益（1.332 vs 1.0）」）。
  出力域有效下垂 = 10 × 1.332 = **13.32 kW/Hz** → R_eff = 25/(13.32×50) = **3.75%**。草案自身锚点佐证：sensor_drift ΔP_gen = 21.004 − 25 = −3.996 kW
  = −13.32 × 0.3（非 −10 × 0.3 = −3.0）。
- **修复**：二选一并写入 §1.3 依据列与 §3.2 表头：(a) 保留 K_D = 10 kW_eq/Hz，改称「指令域调差 5%（出力域有效 R ≈ 3.75%）」；
  (b) 若要出力域 R = 5%，取 K_D = 25/(0.05·50·1.332) ≈ **7.51 kW_eq/Hz**（并重出 §3 锚点）。SystemDef/教学文案不得写「调差率 5%」而不注明口径。

### R-A-02 — MAJOR — F-1 撤销仅在默认 b=0.3 验证；参数域上限 b=1.0 处 K_D=20 复现 F-1；缺可行域约束

- **证据**：systems.js:949 sensor_drift magnitude 域 **[0.05, 1.0] Hz**（TL 继承）。sweep.py 于 b = 1.0：
  K_D=5 → u_end 20.0 / T3_min 1054.4 K；K_D=10 → u_end **15.0** / P_gen 11.68 kW / T3_min **935.1 K**（域内 ✓）；
  K_D=20 → u_end **5.0** / P_gen **−1.64 kW** / T3_min **694.6 K < 735 K**（负净功 + T3 下界越界 = F-1 同类伪影）。
  草案 :86「三值均在注册域内」只对默认幅值成立。稳态 u = clamp(u_ref − K_D·b)；u_min = 6.98（P_gen ≈ +1.0 kW，T3_ss 742 K）给出约束
  **K_D·b_max ≤ u_ref − 6.98 = 18.0 → b_max = 1.0 时 K_D ≤ 18 kW_eq/Hz**。
- **修复**：§1.3 增「可行域约束 K_D·b_max ≤ 18.0」并登记；Q2 候选 20 删除或附「须同步收窄 b 域至 ≤ 0.9 Hz」；
  新增域角点自检（见 R-A-09）以 b = 1.0 断言 T3 ≥ 735 K、P_gen > 0。

### R-A-03 — MAJOR — 瞬时下垂令 host 回路一阶化：GLJ-6 在原型中失败，「GLJ-1…6 沿用」不成立

- **证据**：proto `self_check()`（golden 路径改指仓库后）：GLJ-6 **fail，worst = 1.058**（Q_fuel_kW @ i=206，line_fault）> GLJ6_HALF_ATOL 0.15
  （oracle :593；v1 实测 0.0130）。原因：`u_next = u_ref − K_D·(f(t_j) − 50)` 用子步起点 f（ZOH，回路时滞 = h），对 u 是 O(h) 误差，
  幅度 ≈ K_D·|df/dt|·Δh。收敛阶实测（half.py，line_fault）：f 偏差 h→h/2 **4.07e-4**、h/2→h/4 **2.02e-4**（一阶；v1 为 7.3e-7/1.4e-7）；
  δ 偏差 3.33e-4 rad，均 ≫ golden 门 f_Hz_atol 1e-4 / delta_rad_atol 1e-6。双实现同序时不影响 parity（v1 同理），但**结果对子步内 f 取值时刻敏感**——
  任何第二实现若在 doStep 后取 f、或在 RK4 stage 内求 droop，即以 O(1e-4) 越 gate。副作用：line_fault 中 u 以摇摆频率（≈1.2 Hz）在 21.43–31.07 间摆动
  （valve_cmd ±12 pp），无执行器时间常数的燃料阀高频动作。
- **修复**：(1) §1.2 显式钉死「droop 取 host 子步① 起点 f（ZOH，时滞 h）——方法定义的一部分」，并入 v1 §2.2(iii) 镜像条件；
  (2) GLJ-6 按 v2 实测重冻结并登记一阶收敛（或改为仅状态通道 f/T3/δ 的分通道门）；(3) Q3 补充数值后果：候选 (ii) 一阶滞后 T_g = 0.5 s
  可将半步 worst 降至 0.128（f 4.1e-5、δ 4.6e-5 rad——同 scratch 实测），且执行器语义更真实；推荐仍可为 (i)，但须附上述代价。

### R-A-04 — MINOR — GLJ-2 / GLJ-7 须为 line_trip 与新域划分改写（原型 GLJ-2 失败）

- **证据**：proto GLJ-2 **fail，r_line = 10.78 kW**——v1 oracle :633 的 r_line 镜像只认 FAMILY_LINE 故障窗，line_trip t ≥ 20 s 期望值仍按 s = 1.0。
  GLJ-7 :726-730 仍把 joint_sensor_drift 置「滑差域 1.5 Hz」，而 v2 实测 max|Δf| = 0.0078 Hz；joint_line_trip 不在任何域（漏断言）。
  草案 :103 只写「ENVELOPE_CORNERS 置空」。
- **修复**：§4 项 6 列明：GLJ-2 的 r_line 期望 scale 与 `scale_at` 同源（含 line_trip 0.5）；GLJ-7 删除 slip 域与 GLJ7_SLIP_DF，sensor_drift 与
  line_trip 归标准域（≤ 1.0 Hz）；GLJ-6 半步对照扩 joint_line_trip（实测 worst 0.108）。

### R-A-05 — MINOR — GLJ-9「u_end = u_ref − K_D·b ±1e-12」不可达

- **证据**：原型 sensor_drift u_end = **22.00000000020239**（|err| = 2.0e-10）。u_end = u_ref − K_D·(f_last + b − 50)，f_end − 50 = −2.0e-11 Hz
  （残余暂态，最慢模态 −0.49 s⁻¹）——恒等只对 f ≡ 50 精确。load_step P_elec_end 误差 6.6e-10（±1e-6 ✓）。
- **修复**：GLJ-9 改为 `|u_end − (u_ref − K_D·b)| ≤ 1e-6`，或断言结构式 `|u_end − (u_ref − K_D·b)| ≤ K_D·|f_end − 50| + 1e-12`。草案 :73「精确恒等」改「渐近恒等」。

### R-A-06 — MINOR — 「稳态唯一」须加限定（模 2π、存在条件、u 表达式）

- **证据**：草案 :92「稳态唯一：f = 50、u = u_ref」。实际平衡：f = 50；u = clamp(u_ref − K_D·b_gov)（sensor_drift 闭环 ≠ u_ref）；
  u_eff = min(u, u_cap)；δ = asin(P_exp/(s·P_max0)) + 2πk，需 |P_exp| < s·P_max0。eig.py（K_D=10）：基线 −2.44±7.63j、−0.49；
  line_trip 平衡 −2.47±4.90j、−0.48——全部左半面、无零特征值 ✓。k 由暂态决定：cct.py 中 v2 line_fault t_clear ≥ 21.5 s 滑一极后再同步，δ_end = **371.5°**（= 11.5° + 360°）。
- **修复**：§3.3 改写为「接通态唯一稳定平衡（模 2π）：f=50、u = clamp(u_ref − K_D·b_gov)、δ 由功率平衡定（存在条件 |P_exp| < s·P_max0）」；
  δ_rad 为非卷绕列，任何解析 δ 断言须注明 mod 2π。

### R-A-07 — MINOR — §3.3 阻尼论证：下垂调速器几乎不贡献摇摆阻尼；δ 峰峰数字不符

- **证据**：草案 :90-91「下垂调速器再叠加 10 kW/Hz」。eig.py 摇摆模态实部：K_D = 0 → −2.403、K_D = 10 → −2.444（+1.7%）；ζ 0.303 → 0.305。
  原因：调速器经 T3 热惯性（τ ≈ 2 s）作用，摇摆频率 ω_n ≈ 7.6 rad/s 处 ωτ ≈ 15，贡献被衰减约 1/16 并滞后约 90°。阻尼几乎全部来自电池下垂
  （σ ≈ K_bat/(2K_J) = 2.4 s⁻¹ ✓）。另：「末 10 s δ 峰峰 ≤ 1.5e-9 rad」——line_fault 1.40e-9 ✓，**line_trip 5.77e-9 ✗**。
- **修复**：删去「再叠加 10 kW/Hz」，改为「阻尼由电池下垂承载（ζ ≈ 0.30 基线 / 0.45 跳闸后；调速器经 T3 滞后贡献 < 2%）」；峰峰数改 ≤ 6e-9 或按 Run 分列。
  「不做 D」结论不受影响。

### R-A-08 — MINOR — line_trip 物理表达精确，但其前提与幅值域须登记

- **证据**：TL-EQ-3 下 P_elec ∝ s/X：X 3.2 → 6.4 Ω 恰等于 s = 0.5；TL-EQ-5 V_gen 只依赖 f，与 X 无关 → 表达**精确** ✓；内核 gt_tl_joint_l1.c:114
  `p_elec = s->scale * …`，:184 无钳位，0.5 直通 ✓。前提：X_line 代表**全部转移电抗**（无机内 X'_d、无变压器电抗）——有串联机内电抗时单回跳闸不会使 P_max 减半；
  每回 6.4 Ω = 1.0 p.u.（与 v1 §1.4 X=1.0 p.u. 角点 arcsin 0.4 = 23.578° 一致，GLJ-4 已有该解析值）。草案定义为**无故障跳闸**（开关误动/计划操作），
  而现实单回跳闸多由该回故障触发。原型 magnitude unit 为 ""，草案 :51 为 "p.u."。scale 稳定下限：export 10 kW 时 s > 0.2（s = 0.21 实测仍收敛于 72.25°，
  首摆无超调——系统重阻尼）。
- **修复**：§2 增假设行「X_line = 全转移电抗；s = n_remaining/n_total = X_nominal/X_post；无故障跳闸（故障+跳闸复合序列缓做）」；
  magnitude 固定 0.5 不开放，或登记域 (0.2, 1]（以出口基线静稳定为界）；oracle unit 与草案统一 "p.u."。

### R-A-09 — MINOR — 建议新增自检：接通态终点闭合 + 参数域角点

- **证据**：draft 唯一性主张（替代 v1 §3.3 流形）目前只有 GLJ-8/9 两个 Run 的点断言。原型各接通 Run 终点闭合残差
  `asin((P_gen+P_bat−P_load)/(s·P_max(f))) − δ_end`：line_fault 3.5e-14、line_trip 4.5e-13、load_step 3.8e-14、actuator_clear 2.5e-9 rad；
  |f_end − 50| ≤ 5.1e-8 Hz（actuator_clear 最大，35 s 清除后仅 25 s 余量，末 10 s δ 峰峰 8.2e-5 rad）。
- **修复**：增 GLJ-11「全接通 Run：|f_end − 50| ≤ 1e-6 且 δ_end 闭合（mod 2π）≤ 1e-6 rad」；增 GLJ-12「域角点（b = 1.0、ΔP_load = 20、line_fault 1.0 s）
  有限性 + T3 ≥ 735 K + P_gen > 0 + u ∈ [0,40]」——R-A-02 的回归守卫。

### R-A-10 — MINOR — 依赖积分语义的既有物理文本须同批改写（§5① 只列 F-1 句与 tl-sensor-drift）

- **证据**：接通态下以下文本失真：systems.js:3347 A-tl-no-damping（「由电池一次调频与调速器积分承载」）、:3348 A-tl-manifold（零特征值/流形——v2 接通态不成立）、
  :985 A-gov-integral 与 :993 A-gt-antiwindup-clamp（TL 经 :3340 继承）、:3404 tl-line-fault n4「调速器积分提供阻尼……收敛至功率平衡流形」、
  :3221-3226 TL_FAULT_OVERRIDES sensor_drift「调速器持续减燃料」（v2 为一次性降至 u_ref − K_D·b 后保持）。v1 规格 §3.3、§1.4 D 行依据、
  §3.2 sensor_drift「滑差/拍频/δ 漂移 O(10²) rad」与 A2-1 滑差域同样被 v2 取代。
- **修复**：§5① 逐条列出上述 ID 的改写/拆分（接通态下垂 vs 断开态积分）；草案增「v1 规格被取代条款」清单（§3.3、§1.4 D 行依据、§3.2 sensor_drift 行、GLJ-7 滑差域）。

### R-A-11 — NOTE — §1.1 F-1 成因措辞

- **证据**：v1 恒等式 `u_end = 25 − (δ_end − δ₀)/π` 只在 b = 0 时成立；带偏置的完整式为 `u = 25 − (δ−δ₀)/π − K_i·b·(t − t_start)`，
  v1 golden 复核：25 + 0.6447/π − 2·0.3·40 = **1.205** ✓（u_end 1.2052、δ_end −36.94°）。F-1 的驱动项是**偏置斜坡** −K_i·b·t（无穷母线下 f 被钳住，积分器无法清零常偏差），
  非「功角反馈」；且积分（无差）调速器并网本身是可实现的运行方式——问题在于不适用，而非「物理上不成立」。
- **修复**：§1.1 改为「无差调速器接无穷母线：同步功率钳住 f，积分器对传感偏置无界积分（−K_i·b·t）→ 燃料指令斜坡下降至钳位；并网机组标准做法为下垂」。

### R-A-12 — NOTE — I-3 分区与线路状态切换语义确认

- **证据**：内核输入面 demand_kW / u_eff_kW / p_elec_scale / line_open（gt_tl_joint_l1.c:9、:71），调速器不在内核；FMU 壳调速器在 fmu_runner.py:648、
  线路事件域在 :589——v2 只改这两处 host 代码，内核/FMU 包零改动可行 ✓。droop 中的 f 取自 doStep 之前的 `get_state()`，与 oracle 子步① 同序 ✓（R-A-03 钉死后即为契约）。
  调速器模式由 Run 常量 `line_open` 选择、**不跟随**瞬时 p_elec_scale（line_fault 窗内 s = 0 仍为下垂）——物理合理（0.5 s 内不应切模式），草案 :34 已写，建议在 R-2 中加一句
  「模式选择键 = 配置 line_open，非线路瞬时状态」。
- **修复**：无需修改架构；R-2 补一句即可。

### R-A-13 — NOTE — 锚点复算通过；不变局与 monitor_only 语义成立；钳位在域内不触发

- **证据**：anchors.py 复算 §3.1 全表（u/P_gen/P_elec/δ_end/f 区间/T3 区间）与 §3.2 全表（K_D 5/10/20：u_end 23.5/22.0/19.0、P_gen 23.00/21.00/17.01、
  T3_min 1137.5/1101.9/1030.6、load_step f_min 49.8373/49.8385/49.8409、line_fault 首摆 57.57/56.75/55.51°、line_trip 25.79/25.54/25.07°）**全部吻合**；
  |Δf|max = 0.621 Hz ≤ 0.63 ✓；δ_end(line_trip) − asin(0.4) = −5.2e-11 rad、P_elec_end − 10 = −1.2e-9 kW（GLJ-8 ±1e-6 充分）。
  GLJ-10：healthy / monitor_only / gt_standalone 与 v1 golden **30 列逐值相等** ✓（前提：f ≡ 50.0 精确 → (f_gov − 50) = 0.0 → u = 25.0 精确；该前提建议写入 GLJ-10 注释）。
  GLJ-5 另一对 joint_monitor_only ↔ gt001_v3 monitor_only 仍 0.0（草案 :103 只提 standalone，宜写全两对）。钳位：u = 0 需 |Δf_gov| ≥ 2.5 Hz、u = 40 需 ≤ −1.5 Hz；
  默认 Run u ∈ [21.43, 31.07]，失步扫描（t_clear 21.5 s）u ∈ [8.79, 30.49]——均未触钳。既有域外点（非 v2 新增）：line_fault magnitude 上限 1.0 s 时
  v2 |Δf| = 1.093 Hz（v1 1.159 Hz）> 1 Hz 标准域，建议随 R-A-09 角点自检一并登记。
- **修复**：无（登记项）。

---

**文件结束**。TLV2_G2B_REVIEW_A（评审 A，2026-11-28，对象 v0.1）。
