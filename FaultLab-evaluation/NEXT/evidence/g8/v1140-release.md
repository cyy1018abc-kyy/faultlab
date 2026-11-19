# v1.14.0 发布验收记录（G7→G8 — 2026-11-19，CHG-20261119-06）

> **门禁**：G7→G8（patch——运营面归档 + additive 清算，零 breaking）。
> **授权**：V1140_WAVE_DESIGN v1（CHG-20261119-05——用户「进入下一轮」指令链）。
> **验收日期**：2026-11-19 · 记录人：Lead Agent（V1110 承接会话）。

## 1. 门禁全表

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `node tools/run-g2.mjs` ×2 独立 | **均全部 PASS exit 0**（36 步维持——eval-session-003 不入门禁） |
| 2 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1772.5 KiB**（js=37 维持） |
| 3 | copy-guard | **PASS 43 patterns 0 命中** |
| 4 | verify_golden 全行 | **13 注册行 + 默认八 全 exit 0** |
| 5 | **eval-session-003** | GT-001 热力链首场 **39.73 分落章** + score_hash 双次一致（`dd98836cb6d9c8da`）；L2 协议机检全过（N-B20/21/22/23 + 封章）；判读质量如实登记（GT 11 通道首场适配面有限——NaN 幅值 + 分类偏 actuator；infrastructure 全链通过） |
| 6 | 既有 15 golden 字节冻结 | **零触碰** |
| 7 | 残留清算 | tempfile 位域正常化 ×3 parity 脚本（additive 零语义变更）；--run-gt001 --out 残留登记（stdout 解析先例功能等效） |

## 2. 交付清单

1. **eval-session-003**：GT-001 热力链 L2 盲判读首场归档（agent-mcp-client.mjs / submission / score-report / README——`evidence/g10/eval-session-003/`）；
2. **残留清算**：gt001/fc001 parity tempfile 位域 ×3 正常化（additive 零语义变更）；--run-gt001 --out 残留登记（stdout 解析先例功能等效）；
3. **运营面**：L2_SESSION_OPERATIONS_RUNBOOK.md 确认（eval-session-003 盲包生成试运行通过）。

## 3. 发布定位

FaultLab v1.14.0 = 八面冻结下第十二个 additive/minor 发布——运营首场 GT-001 热力链盲判读 + 残留清算；产品面 = v1.12.0 不变（15 golden / 13 注册行 / 37 步 / 43 patterns / 1772.5 KiB）。

**文件结束**（2026-11-19）。
