# V180_WAVE_DESIGN — v1.8.0 实现波设计（S3 track wiring + G9 Python oracle；G9 C99 阻塞登记；G10 顺延 v1.9.0）

> **性质**：阶段设计文档（Lead 起草，2026-11-15）——V170 波（v1.7.0，commit 0828de8）后首波。
> **八面冻结下第八个 additive 波（MINOR）**。
> **授权记录（CHG-20261115-07）**：用户 2026-11-15 指令「下一步」——**DEC-1…4 全采推荐项**。
> **推送状态**：用户裁定暂缓延续（v0.7.1–v1.7.0 同批）——本波产出并入同批。
> **输入**：G9_G10 spec（CHG-20261114-06 落档）、V170 收口（CHG-20261115-04/05/06）、
> plants/gt001.js 适配器（v1.7.0 S3 交付物）。

---

## 0. 本波边界

**做**：
1. **S3 track wiring**（主线）：GT thermo/comb 轨消费 plants/gt001.js 适配器（bAt/demandAt/
   cappedAt/govStep 替换内联闭包）+ 位级验收（全 GT Run run_hash/序列逐位不变）；
2. **G9 Python oracle**（主线）：fc001_fmu_oracle.py（5 态 RK4 δt=0.01/Δt=0.1 ZOH + I-11 壳
   传感/控制/残差 + 5 Run 矩阵 + FMU-1…n 自检 + fc001_fmu_v1 golden emit——**C99 内核不参与
   golden**（Python oracle 只读生成，parity 为 v1.9.0 验收面））；
3. **G9 C99 阻塞登记**：gcc/cc/cl 编译器均不可用（2026-11-15 实测）——C99 内核/编译/FMU 打包
   顺延（待编译环境或预烘焙 JSON bundle 兜底路径裁定）；
4. **G10 顺延 v1.9.0 登记**（基础设施自包含 + R-G10-02 外部 Agent 会话待备）。

**不做**：G9 C99 内核（阻塞）、G10（顺延）、C3（挂起维持）、L2、插件化、推送。

**版本**：v1.8.0（MINOR——fc001_fmu_v1 新 golden + S3 组织方式重构零行为变化 + 新 oracle 文件）。

## 1. 决策点（全采推荐项）

### DEC-1：S3 track wiring 范围
**采纳（推荐）**：thermo/comb 轨消费 plants/gt001.js（bAt/demandAt/cappedAt/govStep 替换内联闭包
——adapter 与内联逐字等价已在 v1.7.0 适配器烟测验证）；swing/linear L0b 遗留轨维持内联（ governor
语义不同——foStep vs govStep，登记 out-of-thermo/comb-wiring-scope）。位级验收 = 全 GT Run
run_hash/序列逐位不变。

### DEC-2：G9 Python oracle 先行
**采纳（推荐）**：fc001_fmu_oracle.py 主线编写——5 态 RK4（δt=0.01 子步/Δt=0.1 ZOH 通信步、
I-11 壳传感污染/控制反馈/代数残差、pre/post 左极限分裂）+ FMU-1…n 自检 + fc001_fmu_v1 golden
emit（19 变量 × 601 点 × 5 Run）；C99 内核 parity 顺延 v1.9.0（编译环境依赖登记）。

### DEC-3：G9 C99 阻塞登记
**采纳（推荐）**：gcc/cc/cl 均不可用（2026-11-15 实测）——C99 内核编写可先行（代码交付）但
编译/parity/FMU 打包阻塞；预烘焙 JSON bundle 兜底路径（G0-V05-DEC-01）可先行——本波只登记。

### DEC-4：G10 顺延 v1.9.0
**采纳（推荐）**：基础设施自包含 + R-G10-02 外部 Agent 会话待备——顺延零耦合成本。

### DEC-5：步数账 + push
**采纳（推荐）**：run-g2 35→35 零增步（S3 组织重构 + G9 oracle 新文件不入门禁）；push 五批
同批暂缓延续（v0.7.1–v1.7.0，本地 ahead 11）；v1.8.0 发布本地提交随 CHG-20261115-08 同口径。

## 2. 波次派发

```text
W1 S3 wiring（主线）→ thermo/comb 轨消费 plants/gt001.js + 位级探针 + 全量回归
W2 G9 oracle（主线）→ fc001_fmu_oracle.py + fc001_fmu_v1 emit + FMU 自检
W3 发布门 → run-g2 35/35 ×2 + verify_golden 全注册行 + copy-guard + browser 面 + evidence/v180-release.md
           + DECISIONS.md CHG-20261115-08 + V1_FACES §15 + commit
```

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| GT 四轨 | thermo/comb 消费面替换（位级恒等）；swing/linear 不变 |
| golden 库 | 12→13（fc001_fmu_v1 新 id schema v2） |
| verify_golden | MODELS 10→11 注册行 |
| run-g2 | 35 步不变（0 新步） |
| V1_FACES | 面① FC 画像注记（FMU 第三轨）、面② 12→13、§15 v1.8.0 record |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | S3 迁移破坏位级恒等 | 改前/改后探针 + 全量回归兜底 |
| 2 | G9 oracle 5 态方程实现偏差 | 原文冻结参数逐字 + 稳态点解析核验 + FMU 自检 |
| 3 | G9 C99 阻塞 | 登记不阻塞本波（Python oracle 先行、parity v1.9.0） |
| 4 | push 批次累积 | 用户裁定同批暂缓延续 |

**文件结束**。V180_WAVE_DESIGN v1（2026-11-15，CHG-20261115-07 批准，按推荐执行）。
