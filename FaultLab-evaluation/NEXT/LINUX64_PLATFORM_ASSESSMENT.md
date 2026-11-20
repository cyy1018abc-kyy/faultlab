# LINUX64_PLATFORM_ASSESSMENT — linux64/.dylib 平台矩阵评估（D-12 / V1150 / CHG-20261119-09）

> **性质**：评估文档（Lead 起草，2026-11-19；V1150_WAVE_DESIGN D-12 / CHG-20261119-09——
> 只读评估，不实施；裁定留白章显式留用户）。
> **任务**：V08_ROADMAP 主线 D **D-12 行**「linux64/.dylib 平台矩阵（GCC cross-compile 或
> WSL gcc/CI 候选——不实施）」——A-7 行「重钉须 CHG」的兑现前置。

---

## 1. 现状基线

| 项 | win64 现值 |
|---|---|
| 编译器 | WinLibs GCC 16.2.0 UCRT/SEH（用户态 `C:\Users\amdir\.zcode\toolchains\`） |
| 构建命令 | `build_fmu.py --gcc <gcc.exe>`（-std=c99 -O2 -ffp-contract=off -fno-fast-math） |
| 产物 | fc001_l1_v1.fmu / gt001_l1_v1.fmu / gt001_comb_l1_v1.fmu（binaries/win64/*.dll） |
| V312 钉 hash | §10 fc001 + §11 gt001 双行（win64 sha256 各自登记） |
| 运行时 | 64 位 Python（uv cpython-3.14.4-windows-x86_64）→ ctypes CDLL 加载 |

## 2. linux64 路线评估

### 路线 (a)：GCC cross-compile（x86_64-linux-gnu 从 Windows 主机）

| 维度 | 评估 |
|---|---|
| 工具链 | `x86_64-linux-gnu-gcc` 交叉编译器（MinGW-w64 不含 linux 目标——需独立安装 crosstool-ng 或 docker 容器） |
| 复杂度 | **高**——交叉编译环境搭建（sysroot/glibc 版本/链接器脚本）+ 产物在 Windows 上无法测试（需 WSL/SSH 远程验证） |
| 可行性 | 理论可行但实操成本高（sysroot 配置 + glibc 版本匹配 + 测试环境）——**不推荐单机实现** |
| 产物 | binaries/linux64/gt001_l1.so（ELF 共享库） |

### 路线 (b)：WSL2 gcc

| 维度 | 评估 |
|---|---|
| 工具链 | WSL2 内 `sudo apt install gcc`（Ubuntu 22.04+ 原生 gcc 11.x） |
| 复杂度 | **中低**——WSL2 安装 gcc 即可编译；产物复制回 Windows 仓库；但**测试需 WSL 内 Python**（Linux ctypes 加载 .so） |
| 可行性 | 可行（需 WSL2 已安装——用户环境待确认）；ctypes 测试需 WSL 内 Python 3.x（非 Windows Python） |
| 产物 | binaries/linux64/*.so |

### 路线 (c)：Docker 容器编译

| 维度 | 评估 |
|---|---|
| 工具链 | `docker run -v $PWD:/build gcc:13 gcc -shared ...`（零安装——Docker 已在用户 PATH） |
| 复杂度 | **低**——Docker 已在位（`/f/Docker/DockerDesktop`）；容器内编译 + 宿主机测试 |
| 可行性 | **可行**——Docker Desktop 已安装；Linux 容器原生 gcc；产物直接复制；测试需 WSL 或 Docker 内 Python |
| 产物 | binaries/linux64/*.so |

### 路线 (d)：CI/远端编译

| 维度 | 评估 |
|---|---|
| 工具链 | GitHub Actions ubuntu-latest runner（gcc 原生）——**I-1 零网络/零 CI 红线冲突** |
| 复杂度 | **中**——CI 配置 + 产物回传 + V312 重钉 |
| 可行性 | 理论可行但 I-1「零安装零网络零构建（前端）」+「零网络」纪律需评估 CI 是否违反 |

## 3. 推荐

| 优先级 | 路线 | 理由 |
|---|---|---|
| 1 | **(c) Docker** | 零安装（Docker 已在位）/ Linux 原生 gcc / 产物确定性最高（容器环境固定） |
| 2 | **(b) WSL2** | 备选（如 Docker 不可用——需确认 WSL2 已安装） |
| 3 | (a) cross-compile | 不推荐（实操成本高） |
| 4 | (d) CI | 不推荐（I-1 红线张力） |

## 4. 重钉纪律

linux64 产物产出后：V312 §10/§11 各增 linux64 行（.so sha256）+ fmu_runner 钉值 map 扩展 + 
平台 parity 测试（linux64 ctypes 加载 + C↔Python parity）——**重钉须 CHG**（A-7 原文）。

## 5. 裁定留白章（用户裁定记录结构）

| # | 裁定项 | 用户裁定 |
|---|---|---|
| R-L64-01 | linux64 实施与否 | （待填） |
| R-L64-02 | 路线选择（a/b/c/d） | （待填） |
| R-L64-03 | .dylib（macOS）是否纳入 | （待填——PLATFORM_DIRS 已含 darwin64） |

**文件结束**。LINUX64_PLATFORM_ASSESSMENT v0.1（2026-11-19，V1150 D-12 / CHG-20261119-09）。
本评估为零实施承诺文本（评估面——裁定留白章显式留用户）。
