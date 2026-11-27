# v1.18.0 发布验收记录（G7→G8 — 2026-11-27，CHG-20261127-06）

> **门禁**：G2b（TL-001 规格 APPROVED v1.0，CHG-20261125-01）→ G7（run-g2 40 步）→ G8。
> **授权**：CHG-20261127-03（V1180_WAVE_DESIGN v1——四轮讨论，精简版）；CHG-20261127-04（S1）；CHG-20261127-05（S2）。
> **性质**：内部一致性与可复核性证据；**不是模型验证**；TL-001 联合轨声明：行为与数值集总参数演示模型（未经实验/硬件验证）。
> **验收环境**：Linux x86_64 云端开发容器（Ubuntu 24.04 / GCC 13.3.0 / glibc 2.39 / Node v22.23.5 / Python 3.13.18）。
> **验收日期**：2026-11-27 · 候选提交基线 `0a4a735`（worktree_dirty=true——仅发布收口面：版本号/README/index.html/FaultLab.html/文档）· 记录人：Lead Agent（云端会话 claude/gallant-fermat-1d24pe）。

## 1. 门禁全表

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1819.2 KiB**（1,862,878 B；css=10 js=38；两次 sha256 同 `2eb5dc2d…`） |
| 2 | `node tools/run-g2.mjs` ×2 独立 | **均 40/40 PASS exit 0**（104,865 / 104,500 ms；core 30/30 + extended 10/10）——第 40 步 gt_tl_joint parity 实跑 PASS |
| 3 | gt_tl_joint parity（linux64） | **pass——worst 0.0；139,432 值逐位相同（含 -0.0 符号）**；门 1e-9（R2-3） |
| 4 | parity 负例 | golden 扰动 1e-8 ⇒ fail exit 1；win32 平台（包无 win64）⇒ skip exit 3 |
| 5 | verify_golden 逐模型 ×15 + 默认十 | **16 次调用全 exit 0** |
| 6 | copy-guard | **PASS 43 patterns 0 命中** |
| 7 | I-11 对新基线（v1.17.0 `5545892`——CHG-20261127-04） | **legacy 12/12 · 36/36、gt 46/46 · 138/138** 逐位一致——本版零 Run 哈希扰动 |
| 8 | ui-walkthrough | **74/74** |
| 9 | e2e / file-smoke（run-g2 内） | e2e **95/0**；file-smoke **99/0** |
| 10 | 既有 17 golden 字节冻结 | **零触碰**（`git status data/golden/` 空） |
| 11 | FMU 包确定性与准入 | `gt_tl_joint_l1_v1.fmu` 两次打包同哈希 `290ea21f…`；fmu_admission admitted；`.so` 两次构建同哈希 `12a80d78…` |

## 2. 交付清单（v1.18.0）

1. **S1 I-11 新基线**（CHG-20261127-04）：`evidence/g8/i11-bitidentity/baseline-v1170-5545892.json` + `gt-baseline-v1170-5545892.json`；发布门方法 = 对上一发布提交快照比对；历史基线漂移溯源（README §8）；
2. **S2 TL-001 联合内核 C99/FMU 链**（CHG-20261127-05）：`gt_tl_joint_l1.c` + modelDescription（输入含 `line_open`——R2-2 偏离登记）+ `build_fmu.py --tl` + `data/fmu/gt_tl_joint_l1_v1.fmu`（linux64）+ fmu_runner `run_gt_tl_joint_shell` + `tools/oracle/gt_tl_joint_parity.py` + run-g2 第 40 步 + V312 §13；
3. **S3 收口**：APP_VERSION **1.18.0**；README 当前版本段；V1_FACES §23；V06_ROADMAP v1.18.0 行；V08_ROADMAP §9（v1.18.0 收盘 + v1.19+ 候选——V08 收官）；V2_CONVERGENCE_PRE_RESEARCH §6（裁定章重开——清单增补，R-V2 维持待议）。

## 3. 未随本版发布（显式登记）

| 项 | 处置 |
|---|---|
| TL 联合包 win64 dll | 用户 Windows 工具链构建后随下一版本发布（R1-3）；在此之前 Windows 上 run-g2 第 40 步记 SKIP |
| adapter `gt-tl-joint-adapter.js` | 不做（V1180 §4 精简——无 UI/端点消费方） |
| Q5 runHash systems 数组 | 移入 v2.0.0 breaking 候选（V1180 R1-2；V2 §6） |
| GT 热力链参考 agent | 移入 V08 §9 候选（运营线） |

## 4. 用户侧事项（Windows 本机——均不阻塞本版发布）

1. **v1.17.0 / v1.18.0 回归**：仓库根目录执行 `node tools/run-g2.mjs`——预期 39 PASS + 第 40 步 SKIP（TL 包无 win64 条目）；FC/GT parity 两步应 PASS（win64 dll 字节自 v1.16.0 未变，钉值已随包更新）。
2. **I-11 gt 基线成因判定**（i11-bitidentity README §8.3）：
   ```powershell
   git worktree add --detach out/i11-5545892 5545892
   Push-Location out/i11-5545892
   node tools/verify-i11-bitidentity.mjs ..\..\out\gt-win-5545892.json --suite gt
   Pop-Location
   node tools/verify-i11-bitidentity.mjs --baseline out\gt-win-5545892.json --suite gt
   ```
   最后一行在 Linux 归档基线上比对亦可：把 `out\gt-win-5545892.json` 发回，与 `gt-baseline-v1170-5545892.json` 逐配置比对——全等 ⇒ 成因 (i) 脏工作树；thermo 类 14 配置不等 ⇒ (ii) 跨 V8 `Math.pow` 差异。
3. **TL 联合内核 win64 dll**（WinLibs GCC 16.2.0，与既有三包同链）：
   ```powershell
   python -I tools/backend/fmu/build_fmu.py --gcc <gcc.exe 路径> --platform win64 --tl
   python -I tools/oracle/gt_tl_joint_parity.py
   ```
   打包会同时含 win64 + linux64 两条目（linux64 `.so` 已在仓库）；新包 sha256 与 parity 结果回传后，由下一版本重钉 V312 §13 与 `GT_TL_FMU_SHA256_PINNED`（parity 超 1e-9 ⇒ 停下显式 CHG 重冻结门值）。

## 5. additive 三不承诺兑现

五类哈希既有输入零变化（I-11 对 v1.17.0 基线全一致）；既有 17 golden 字节零触碰；既有 39 步判据零翻转（第 40 步为 +1 显式申报）。

## 6. 发布定位

FaultLab v1.18.0 = additive minor——TL-001 联合轨 C99/FMU 链补齐（三层夹心第三例，C↔golden 逐位一致）+ I-11 发布门基线更新；
产品面 = 17 golden + 15 verify_golden 注册行 + run-g2 40 步 + 43 patterns / 1819.2 KiB；FMU 包 4 个（FC/GT 三包 win64+linux64，TL 联合包 linux64）。

**文件结束**（2026-11-27）。
