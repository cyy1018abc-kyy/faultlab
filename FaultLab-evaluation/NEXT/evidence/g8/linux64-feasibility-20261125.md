# linux64 可行性实测记录（D-12 前置 / CHG-20261125-01 证据）

> **性质**：可行性探针记录——**不是实施**。全部操作在临时目录与 `git archive HEAD` 导出的
> 临时副本上执行，仓库零改动（data/fmu 三包字节、fmu_runner.py 钉值均未触碰）。
> 内部一致性证据；不是模型验证、不是硬件验证。
> **日期**：2026-11-25 · 基线提交：`843abc3`（分支 claude/amazing-cerf-qlvwrn）。

## 1. 环境

| 项 | 值 |
|---|---|
| OS / 架构 | Linux x86_64（Ubuntu 24.04 云端开发容器） |
| 编译器 | gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0 |
| libc | GLIBC 2.39 |
| Python | 3.13（64 位） |

## 2. 编译

命令（`build_fmu.py` CC_FLAGS 钉死参数 + Linux 共享库必需的 `-fPIC` / `-lm`）：

```bash
gcc -std=c99 -O2 -ffp-contract=off -fno-fast-math -shared -fPIC -o <name>.so tools/backend/fmu/<name>.c -lm
```

| 内核 | 结果 |
|---|---|
| fc001_l1.c | rc=0，零告警输出 |
| gt001_l1.c | rc=0 |
| gt001_comb_l1.c | rc=0 |

注：`build_fmu.py` 现 CC_FLAGS 无 `-fPIC`、链接面无 `-lm`——linux64 实施须 additive 补平台分支。

## 3. parity（临时副本）

做法：三包各追加 `binaries/linux64/<modelIdentifier>.so`（原有条目逐字节复制），临时副本内
`fmu_runner.py` 钉值替换为新包 sha256，随后原样运行两 parity 脚本。

| 脚本 | status | 实测 | 冻结门 | 对照 win64 登记值 |
|---|---|---|---|---|
| tools/oracle/fc001_fmu_parity.py | **pass** | worst 散差 **0.0**（5 Run） | gate = 实测 × ≥10 | 0.0（一致） |
| tools/oracle/gt001_fmu_parity.py | **pass** | worst_rel_scaled **2.548e-4**（thermo_comb / load_step；12 Run） | PARITY_RTLIM 1e-3 | ~2.55e-4（同量级） |

结论：Linux glibc libm 下 C 内核与 Python oracle 的散差与 win64 实测同量级，未引入额外
跨平台散差；linux64 实施的数值风险已基本排除。剩余工作为工程面（build 分支、打包、V312
重钉、parity 脚本非支持平台 SKIP 语义）——见 V1170_WAVE_DESIGN DEC-2。

## 4. 现状门禁对照（同日，未改动仓库）

`node tools/run-g2.mjs` 在本容器：35/37 PASS；第 36/37 步（FC/GT FMU parity）FAIL——原因为
包内无 `binaries/linux64/`，`fmu_runner.load_fmu` 抛 `FileNotFoundError`，parity 脚本的 SKIP
判据未覆盖「非支持平台」情形。非回归，属 D-12 缺口。

**文件结束**。
