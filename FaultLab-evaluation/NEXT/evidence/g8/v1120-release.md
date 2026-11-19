# v1.12.0 发布验收记录（G2b→G7→G8 — 2026-11-19，CHG-20261119-02）

> **门禁**：G2b（GTFMU-G2b-02 批准轮）→ G7（run-g2 37 步——parity 步 I-7 显式申报 36→37）→ G8。
> **性质**：内部一致性与可复核性证据；**不是模型验证、不是物理守恒验证、不是硬件验证**。
> **授权**：CHG-20261119-01（GTFMU-G2b-02 批准轮收口——用户「批准」指令链）。
> **验收日期**：2026-11-19 · 记录人：Lead Agent（V1110 承接会话）。

## 1. 门禁全表（全部真实运行）

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1772.5 KiB**（css=10 js=37——+1 = gt001-fmu-adapter.js） |
| 2 | `node tools/run-g2.mjs` ×2 独立 | **均全部 PASS exit 0**（123019 / 123185 ms）——**37 步**（36+1：gt001_fmu parity 第 37 步 PASS——SKIP 语义在产物缺位环境记 skipped） |
| 3 | verify_golden 逐模型 ×13 + 默认八 | **14 次调用全 exit 0**（fc001_fmu V-03 一致 + gt001_fmu/gt001_fmu_comb V-01…V-09 全过——V-03 oracle 字节哈希一致 + GTFMU-5 镜像恒等 194724 值 0.0 只读交叉） |
| 4 | copy-guard | **PASS 43 patterns 0 命中**（Q11 零增词——GT 链词面无涉四词） |
| 5 | gt001_fmu_oracle self-check | **GTFMU-1…7 全过**（GTFMU-1 设计点 4.26e-14；GTFMU-5 镜像 0.0；GTFMU-6 半步收敛登记） |
| 6 | **R-GTFMU parity（C↔Python）** | healthy/monitor **0.0**（稳态恒等）+ 故障局 **~2.5e-4**（pow() 跨 libm——R-1 预登记；×≥10 冻结 gate = 2.55e-3 → 阈值 1e-3（T-B golden gates 远大于此））；双组（thermo+comb）12 Run 全过 |
| 7 | **R-GTFMU-03 确定性** | fmu_runner 三次执行 run_hash 恒等 |
| 8 | **D-27** | 已关闭（fc001 先例；GT 壳复用同一 doStep 机制面零开口） |
| 9 | FMU 准入 | fmu_admission admit() = admitted=true（model_id=gt.sync.fmu_l1 自述——A-3 校准） |
| 10 | 既有 13 golden 字节冻结 | **零触碰**（git status data/golden/ 仅新增 gt001_fmu_v1 + gt001_fmu_comb_v1 各+sidecar） |
| 11 | 测试面 | compare.test.js 27/27（cross_fidelity 8 + GT adapter 端）、plants.test.js 全绿、negative 97/97 |

## 2. 交付清单（APPROVED v1.0 §8 GTFMU-G2b-03/04 逐项）

1. **GTFMU-G2b-03**：gt001_fmu_oracle.py（oracle_base 出生接入 + FMU+host 全系统镜像更新序 + GTFMU-1..7 自检——**GTFMU-5 镜像恒等 194724 值 0.0 只读交叉**）+ **gt001_fmu_v1 golden**（thermo 组 6 Run，2,373,219 B）+ **gt001_fmu_comb_v1 golden**（comb 组 6 Run，2,373,633 B）——双 emit + verify_golden MODELS 双注册行 + DEFAULT_MODELS 六→八（Q9）+ FAULT_CATALOG GT 注记行；
2. **GTFMU-G2b-04**：C99 内核 gt001_l1.c（2 态 [f,T3]）+ gt001_comb_l1.c（3 态 [f,T3,x_comb]——Q2(a) 双轨并列）+ modelDescription.xml ×2 + build_fmu.py --gt 扩展（Q2(a) 双包——V312 §11 双钉 hash）+ data/fmu/gt001_l1_v1.fmu（17,811 B）+ gt001_comb_l1_v1.fmu（18,064 B）+ fmu_runner run_gt001_shell（Q1(B) host 子步驱动 h=0.01 doStep n=1 + governor/记账复刻 + R-GTFMU-03 三次恒等）+ gt001_fmu_parity.py（Q6 独立机检 + ×≥10 冻结制）+ run-g2 parity 步 37（Q10 36→37 显式申报）+ V312 §10→§11 双钉 hash 行 + §7 例外行扩域（B-2）+ fmu_admission A-4 docstring 同步 + src/core/plants/gt001-fmu-adapter.js（轨锚定三面 + bridge 探针 fetch 注入式）+ index.html/core-load.js 注册 + EvidenceBundle fmu_sha256 additive（fc001 先例——零新增面）；
3. **Q1(B) 定案**：控制积分器 u 归 host——内核纯物理（RK4 面）；host h=0.01 子步驱动 doStep（n=1）+ EQ-GTL1-9/10 推进 + 记账复刻；通信步粒度 0.01 显式登记（DefaultExperiment stepSize=0.01）；
4. **Q2(a) 双轨**：thermo 基准（gt001_fmu_v1 镜像 gt001_v3）+ comb 深化（gt001_fmu_comb_v1 镜像 gt001_v4）——V07 A-6 行域面「EQ-GTL1/EQ-GTL2」完整承载。

## 3. additive 三不承诺兑现

五类哈希既有输入零变化；既有 13 golden 字节零触碰（git status 实证）；35→36→37 步判据零翻转（parity 步纯新增——SKIP 语义防环境碎裂）。

## 4. 发布定位

FaultLab v1.12.0 = 八面冻结下第十一个 additive/minor 发布——GT-001 L1-FMU 第二例三层夹心全链（oracle→golden→C99→parity→adapter→bridge 机制全复用）；parity 散差 pow() 面 ~2.5e-4（R-1 预登记；×≥10 冻结 gate 远在 T-B 内）；**不代表**真实设备或物理模型已完成验证。

**文件结束**（2026-11-19，记录人：Lead Agent——V1110 承接会话）。
