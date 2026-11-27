# v1.17.0 发布验收记录（G2b→G7→G8 — 2026-11-27，CHG-20261127-02）

> **门禁**：G2b（TL-001 批准轮 CHG-20261125-01）→ G7（run-g2 39 步）→ G8。
> **授权**：CHG-20261125-01（V1170_WAVE_DESIGN v1 + TL001_FMU_G2B_SPEC_APPROVED v1.0 + R-L64-01..03）；
> CHG-20261125-02（TL-001 轻量实现轮）；CHG-20261126-01（F-1 裁定）；CHG-20261126-02（版本单一来源）；
> CHG-20261127-01（D-12 linux64）；用户 2026-11-27 指令「v1.17.0 还剩下 linux64 平台支持和发布收口……做完剩下的这部分」。
> **性质**：内部一致性与可复核性证据；**不是模型验证**；TL-001 / FMU 轨声明：行为与数值集总参数演示模型（未经实验/硬件验证）。
> **验收环境**：Linux x86_64 云端开发容器（Ubuntu 24.04 / GCC 13.3.0 / glibc 2.39 / Node v22.23.5 / Python 3.13.18）。
> **验收日期**：2026-11-27 · 候选提交基线 `205488c`（worktree_dirty=true——仅本发布收口面：版本号/README/index.html/FaultLab.html/文档）· 记录人：Lead Agent（云端会话 claude/gallant-fermat-1d24pe）。

## 1. 门禁全表

| # | 检查项 | 结果 |
|---|---|---|
| 1 | `python tools/build.py` ×2 幂等 | **exit 0 ×2**——FaultLab.html **1819.2 KiB**（1,862,878 B；css=10 js=38；两次 sha256 同 `f0f6a6f9…`） |
| 2 | `node tools/run-g2.mjs` ×2 独立 | **均 39/39 PASS exit 0**（105,625 / 104,807 ms；core 30/30 + extended 9/9）——**第 36/37 步 FC/GT FMU parity 在 Linux 实跑 PASS**（D-12 前为 FAIL） |
| 3 | verify_golden 逐模型 ×15 + 默认十 | **16 次调用全 exit 0**（fl001 / fl001_l1 / fl001_cap / fc001 / fc001_l1 / fc001_fmu / gt001 / gt001_comb / gt001_fmu / gt001_fmu_comb / pv001 / wt001 / mg001 / mg001_combo / gt_tl_joint + 默认） |
| 4 | copy-guard | **PASS 43 patterns 0 命中** |
| 5 | fc001_fmu parity（linux64） | **pass——worst 0.0**（5 Run；门 1e-9） |
| 6 | gt001_fmu parity（linux64） | **pass——worst_rel_scaled 2.548e-4**（12 Run；门 1e-3；与 win64 登记 ~2.55e-4 同量级） |
| 7 | parity SKIP 负例 | 以 v1.16.0（win64-only）包替换 → 两脚本 `{"status":"skip"}` exit 3；run-g2 记 **skipped**（非 FAIL）——恢复后 39/39 |
| 8 | I-11 before/after（基线 = origin/main `b33ba27` 同工具快照） | **legacy 12/12 配置 · 36/36 字段**、**gt 46/46 配置 · 138/138 字段**逐位一致——本版零 Run 哈希扰动 |
| 9 | ui-walkthrough（发布轮手工工具） | **74/74 PASS**（七系统含 TL-001） |
| 10 | e2e / file-smoke（run-g2 内） | e2e **95/0**；file-smoke **99/0** |
| 11 | backend-bridge FC-E2E（Linux 实跑） | **26/26**——桥服务 C Run（linux64 `.so`）≡ fc001_fmu_v1 golden 21 列逐位全等；capability / 结果 / adapter 三处携带现行钉值 `259e2cc1…` |
| 12 | 既有 16 golden 字节冻结 | **零触碰**（`git status data/golden/` 空；gt_tl_joint_v1 为 CHG-20261125-02 新增——第 17 个） |

## 2. D-12 linux64 可复现性实证

| 包 | v1.16.0 钉值（win64-only） | Linux 上按 v1.16.0 形态重打包（仅 win64 成员、无 build_toolchains） | v1.17.0 现行钉值 |
|---|---|---|---|
| fc001_l1_v1.fmu | `5f60ca78…34b89d` | **逐字节一致** | `259e2cc1c46e239da74bacabc075a40fc0b151bc3ed0b05b6e371a219da71ef6`（24,117 B） |
| gt001_l1_v1.fmu | `db966da9…1f88e8` | **逐字节一致** | `08cfd649ac5b267d0bc4c093af8828b04e5dc6f75dbd39469ea400a223ac7f95`（23,427 B） |
| gt001_comb_l1_v1.fmu | `fc2289a2…a8684` | **逐字节一致** | `06d2c9f87182d4d9f14b9e8e547d620dbcdaa947aab8240dc00ab83fb9c8fd1d`（23,909 B） |

- 修正前 Linux 重打包与历史钉值不一致，唯一差异为 zip 成员 `create_system`（Windows 0 / Linux 3）；
  `build_fmu.py` 固定为 0 后跨宿主一致。
- 新包内 win64 dll 与 modelDescription.xml 成员内容逐字节等于 v1.16.0 包；唯一变化 = 新增
  `binaries/linux64/<id>.so` + manifest additive 键 `build_toolchains`。
- `.so` 两次独立构建（不同临时目录）sha256 相同：fc001_l1 `ef2ce5ae…edd326` / gt001_l1 `afbe6edc…eb7d1e` /
  gt001_comb_l1 `550cba37…10f020`。

## 3. 交付清单（v1.17.0）

1. **TL-001 轻量实现轮**（CHG-20261125-02）：gt_tl_joint_oracle.py（GLJ-1…7）+ `gt_tl_joint_v1` golden
   （8 Run / 30 列 / T-B）+ verify_golden 注册（MODELS 14→15、DEFAULT_MODELS 九→十）+ 引擎 simulateTL001 +
   TL-001 SystemDef + UI 七系统化 + FAULT_CATALOG §9 + run-g2 第 38 步 engine-tl.test.js；F-1 裁定 = 维持（CHG-20261126-01）；
2. **版本单一来源**（CHG-20261126-02）：src/core/version.js + tests/version.test.js（run-g2 第 39 步）；本版 APP_VERSION **1.17.0**（2026-11-27）；
3. **D-12 linux64**（CHG-20261127-01）：build_fmu.py 平台分支 + 三包 `.so` + V312 §12 重钉 + parity SKIP 语义 + bridge 测试跨平台化；
4. **文档**：V1_FACES §22、V312 §10/§11/§12、LINUX64_PLATFORM_ASSESSMENT §6、V1170_WAVE_DESIGN §5、V06_ROADMAP v1.17.0 行、V08_ROADMAP §8 对账、README 当前版本段。

## 4. 未随本版发布（显式登记）

| 项 | 处置 |
|---|---|
| TL-001 C99 联合内核 `gt_tl_joint_l1.c` / FMU 包 / `gt_tl_joint_parity.py` / adapter | **转 v1.18.0 候选**（V1170 §5；须另立 CHG）——D-12 已就绪，linux64 parity 届时可在开发容器原地闭合；win64 dll 按 DEC-4 由用户工具链构建 |
| Q5 runHashInput systems 数组 | 同上转 v1.18.0（须同轮改证据包导出/导入与 verify_bundle.py） |
| Windows 侧回归 | 本次验收全在 Linux 执行；win64 dll 字节零变化，fmu_runner 钉值随包更新——建议用户在 Windows 上补跑一次 `node tools/run-g2.mjs`（DEC-2 风险 #1） |
| darwin64 / `.dylib` | 不纳入（R-L64-03）；macOS 上 parity 两步记 SKIP |

## 5. 诚实边界与观察

- I-11 对**历史固定基线**（`baseline-7aed9f6.json` 12 配置 / `gt-v190-pre-wiring.json` 46 配置）比对为
  0/12·17/36 与 32/46·96/138 不一致；同一比对在 origin/main `b33ba27`（本版改动前）上**结果完全相同**——
  属既有漂移（后续版本已批准的模型面变更所致），非本版引入。本版的零扰动证据为 §1 第 8 行 before/after 比对。
- parity 为 C 内核 ↔ Python oracle 的实现一致性，不是模型验证。

## 6. additive 三不承诺兑现

五类哈希既有输入零变化（APP_VERSION 不入哈希；I-11 before/after 全一致）；既有 16 golden 字节零触碰；
既有判据零翻转（parity 两步 Linux FAIL→PASS 属平台补齐；步账 37→39 为 +2 显式申报）。

## 7. 发布定位

FaultLab v1.17.0 = 八面冻结下的 additive minor——TL-001 第七系统（轻量轮）+ 版本单一来源 + linux64 平台矩阵；
产品面 = **17 golden** + 15 verify_golden 注册行 + run-g2 39 步 + 43 patterns / 1819.2 KiB；FMU 二进制 win64 + linux64。

**文件结束**（2026-11-27）。
