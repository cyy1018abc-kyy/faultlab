# v1.16.0 发布验收记录（G2b→G7→G8 — 2026-11-20，CHG-20261119-12）

> **门禁**：G2b（MG-D1 批准轮 CHG-20261119-11）→ G7（run-g2 37 步）→ G8。
> **授权**：CHG-20261119-11（MG-D1 批准 R-MGD1-01..03 + TL-001 RFC 批准 R-CS-01..04）。
> **性质**：内部一致性与可复核性证据；**不是模型验证**；MG combo 声明：行为与数值集总参数演示模型（未经实验/硬件验证）。
> **验收日期**：2026-11-20 · 记录人：Lead Agent（V1110 承接会话）。

## 1. 门禁全表

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1772.5 KiB**（js=37 维持） |
| 2 | `node tools/run-g2.mjs` ×2 独立 | **均全部 PASS exit 0**（128141 / 128605 ms）——**37 步维持** |
| 3 | verify_golden 逐模型 ×14 + 默认九 | **15 次调用全 exit 0**（mg001_combo V-01…V-09 全过——MSC-1..8 自检全过——GTFMU-5 级源交叉 MSC-8 P_pv/P_wt 0.0） |
| 4 | copy-guard | **PASS 43 patterns 0 命中** |
| 5 | mg001_combo_oracle self-check | **MSC-1..8 全过**（MSC-1 healthy SOC 解析闭合 59.79/59.79；MSC-5 combo island P_bess 时变化 ✓；MSC-8 源交叉 0.0） |
| 6 | 既有 15 golden 字节冻结 | **零触碰**（git status data/golden/ 仅新增 mg001_v2 + sidecar） |
| 7 | TL-001 跨系统 RFC | `NEXT/TL001_CROSS_SYSTEM_RFC.md` 已落地（三方案对照 + TL-b 物理域草案 + Q1..Q7 + 用户裁定留白 R-CS-01..04） |

## 2. 交付清单（v1.16.0 = B-10 MG-D1 实现 + A-10 TL-001 G2b 草案）

1. **B-10 MG-D1 实现**：mg001_combo_oracle.py（oracle_base 出生接入 + per-sample SOC 左矩形累计——**T-A→T-B 制度切换** Q2=(a) + island_combo 事件级组合键 Q1=(a) + chase 面时变化 Q2=(a) + MSC-1..8 自检——MSC-8 源 golden 交叉 0.0）+ **mg001_v2 golden**（8 Run，1,693,220 B，tier T-B，supersedes=mg001_v1）+ verify_golden MODELS["mg001_combo"] 注册行 + DEFAULT_MODELS 八→九（Q9 沿袭）+ V312 MG 钉 hash 行（新增）；
2. **A-10 TL-001 G2b 草案**：TL001_CROSS_SYSTEM_RFC.md（三方案对照 A/B/C + TL-b 物理域草案 TL-EQ-1..5 + 八面影响面 + Q1..Q7 + 用户裁定留白 R-CS-01..04——**待用户裁定后排 TL-001 G2b 实现轮**）；
3. **V312 修订**：§11 GT 双钉 hash 行（v1.12.0 沿袭）+ MG 钉 hash 行（新增——mg001_v2 sha256 = 1869410a…→ 083d3cbc…重 emit 后终值）；§7 例外行 B-2 扩域（沿袭）；
4. **代码面 additive**：gt001-fmu-adapter.js（v1.12.0 沿袭——本波零变更）+ verify_golden.py 注册面 additive（RUNS_GROUPS 多组 oracle 支持——CHG-20261119-11）+ mg001_combo_oracle.py 新文件 + FAULT_CATALOG MG 注记行。

## 3. additive 三不承诺兑现

五类哈希既有输入零变化；既有 15 golden 字节零触碰（git status data/golden/ 仅新增 mg001_v2+sidecar）；37 步判据零翻转。

## 4. 发布定位

FaultLab v1.16.0 = 八面冻结下第十二个 additive/minor 发布——MG-D1 孤岛组合语义实现（T-A→T-B 制度切换首例）+ TL-001 跨系统 RFC 落档；产品面 = **16 golden 字节冻结面**（mg001_v2 新增——15+1=16）+ 14 verify_golden 注册行 + run-g2 37 步 + 43 patterns/1772.5 KiB。

**文件结束**（2026-11-20）。
