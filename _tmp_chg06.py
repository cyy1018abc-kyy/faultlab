# -*- coding: utf-8 -*-
import io

# v1140-release.md
release = '''# v1.14.0 发布验收记录（G7→G8 — 2026-11-19，CHG-20261119-06）

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
| 5 | **eval-session-003** | GT-001 热力链首场 **39.73 分落章** + score_hash 双次一致（`dd98836cb6d9c8da`）；L2 协议机检全过（N-B20/21/22/23 + 封章）；**判读质量如实登记**（GT 11 通道首场适配面有限——NaN 幅值 + 分类偏 actuator；infrastructure 全链通过） |
| 6 | 既有 15 golden 字节冻结 | **零触碰** |
| 7 | 残留清算 | tempfile 位域正常化 ×3 parity 脚本（additive 零语义变更）；--run-gt001 --out 对称化 = 残留登记（parity 脚本 stdout 解析先例——功能性等效） |

## 2. 交付清单

1. **eval-session-003**：GT-001 热力链 L2 盲判读首场归档（agent-mcp-client.mjs / submission / score-report / README——`evidence/g10/eval-session-003/`）；
2. **残留清算**：gt001/fc001 parity tempfile 位域 ×3 正常化；--run-gt001 --out 残留登记（stdout 解析先例功能等效）；
3. **运营面**：L2_SESSION_OPERATIONS_RUNBOOK.md 确认（§2 盲包生成 / §3 MCP server / §4 verify 落章 / §5 红线速查 / §7 FMU 入池映射——eval-session-003 盲包生成试运行通过）。

## 3. 发布定位

FaultLab v1.14.0 = 八面冻结下第十二个 additive/minor 发布——运营首场 GT-001 热力链盲判读 + 残留清算；产品面 = v1.12.0 不变（15 golden / 13 注册行 / 37 步 / 43 patterns / 1772.5 KiB）。

**文件结束**（2026-11-19）。
'''

# V1_FACES §20
faces = '''
## 20. v1.14.0 additive 修订记录（2026-11-19，CHG-20261119-06）

- **运营面归档**：eval-session-003 GT-001 热力链盲判读首场（39.73 分——agent GT 适配面如实登记）；
- **面①–⑧ 全零变化**（零代码零 golden 零版本——残留清算 additive 零语义变更）；
- **残留清算登记**：tempfile 位域 ×3 正常化；--run-gt001 --out 残留登记（stdout 解析先例）。
'''

# roadmap v1.14.0 row
roadmap_new = '''
| **v1.14.0**（本波） | 运营首场 GT-001 热力链盲判读首场归档 + 残留清算（tempfile 正常化 + --out 登记）→ additive patch | B-6(运营)/残留 | G7（步数 37 维持）→ G8 |'''

# CHG-20261119-06
chg = '''
- `CHG-20261119-06`：**v1.14.0 发布收口（G7→G8）——运营首场落地 + 残留清算（additive patch）**。
  承接 CHG-20261119-05（V1140 波）。**① eval-session-003**：GT-001 热力链 L2 盲判读首场——**39.73 分落章** + score_hash 双次一致（infrastructure 全链通过；GT 11 通道 agent 适配面如实登记——NaN 幅值 + 分类偏 actuator）；盲包/reveal/submission/score-report/README 归档 `evidence/g10/eval-session-003/`。**② 残留清算**：gt001/fc001 parity tempfile 位域 ×3 正常化（additive 零语义变更）；--run-gt001 --out 残留登记（parity 脚本 stdout 解析先例功能等效）。**③ 门禁**：run-g2 ×2 36/36 全过（零代码面佐证）+ copy-guard 43/0 + 既有 15 golden 零触碰。**④ v1.14.x 待办**：TL-001 立项裁定（R-TL-01..04 留用户）；linux64 矩阵后补；C3 真 TESPy 挂起维持。
  证据 `evidence/g8/v1140-release.md`。**推送按届时用户指令**。
  **批准人：用户（CHG-20261119-05 指令链）；记录人：Lead Agent（V1110 承接会话）。**
'''

# roadmap update
p_rm = 'FaultLab-evaluation/NEXT/V06_ROADMAP.md'
s_rm = io.open(p_rm, encoding='utf-8').read()
s_rm = s_rm.replace("| **v1.12.0**（本波） |", "| **v1.12.0** |")
old_rm = "| G9(桥面深化) | G7（步数 36 维持）→ G8 |"
if old_rm not in s_rm:
    old_rm = "| A-6(GT-001 FMU) | G2b → R-GTFMU → G7（步数 37，+1 显式申报）→ G8 |"
new_rm = old_rm + "\n| **v1.14.0**（本波） | 运营首场 GT-001 热力链盲判读首场归档 + 残留清算（tempfile 正常化 + --out 登记）→ additive patch | B-6(运营)/残留 | G7（步数 37 维持）→ G8 |"
assert old_rm in s_rm, 'roadmap anchor missing'
s_rm = s_rm.replace(old_rm, new_rm)
io.open(p_rm, encoding='utf-8', newline='\n').write(s_rm)
print('roadmap v1.14.0 row added')

# V1_FACES
p_vf = 'docs/V1_FACES.md'
s_vf = io.open(p_vf, encoding='utf-8').read()
s_vf = s_vf.rstrip('\n') + '\n' + faces
io.open(p_vf, encoding='utf-8', newline='\n').write(s_vf)
print('V1_FACES §20 done')

# release evidence
p_re = 'FaultLab-evaluation/NEXT/evidence/g8/v1140-release.md'
io.open(p_re, 'w', encoding='utf-8', newline='\n').write(release)
print('v1140-release.md done')

# DECISIONS
p_dc = 'FaultLab-evaluation/DECISIONS/DECISIONS.md'
s_dc = io.open(p_dc, encoding='utf-8').read()
s_dc = s_dc.rstrip('\n') + '\n' + chg
io.open(p_dc, encoding='utf-8', newline='\n').write(s_dc)
print('CHG-20261119-06 done')
