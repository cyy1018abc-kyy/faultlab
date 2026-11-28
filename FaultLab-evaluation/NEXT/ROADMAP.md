# ROADMAP — FaultLab 活路线图（单一当前版本）

> **性质**：唯一的**当前**路线图（V1190_WAVE_DESIGN G3，CHG-20261128-02 起生效）。每一波只改本文件；
> `V05_ROADMAP.md`…`V08_ROADMAP.md` 冻结为历史，不再追加内容。
> **最近更新**：2026-11-28（v1.19.x 治理波）。

## 1. 当前产品面（v1.18.0，2026-11-27）

| 项 | 值 |
|---|---|
| 系统 | 7（FL-001 / FC-001 / GT-001 / PV-001 / WT-001 / MG-001 / TL-001——TL-001 扩展预览） |
| golden | 17（`data/golden/`，各带 `.sha256`）；verify_golden 注册行 15 |
| 门禁 | `node tools/run-g2.mjs`（步数与分层以报告 `tiers` 为准——当前 40 步）+ copy-guard |
| FMU 包 | 4：FC/GT 三包 win64 + linux64；TL 联合包 linux64（win64 待补） |
| 发布证据 | `evidence/g8/v1180-release.md`（最新） |

## 2. 候选（未授权开工——排程须用户裁定）

| # | 线 | 候选 | 前置 / 依赖 |
|---|---|---|---|
| C-1 | 平台 | TL 联合包 win64 dll（WinLibs 构建 → 重钉 V312 §13） | 用户 Windows 工具链 |
| C-2 | 平台 | I-11 gt 基线成因判定（Windows 快照 @ 5545892，或放行 Node v26 下载在 Linux 复现） | 用户本机 / 权限放行 |
| C-3 | 产品 | TL-001 升 approved（additive——scope 不入哈希；FC approved_fc 先例） | 验收轮 |
| C-4 | 产品 | TL 联合模式下垂调速器（F-1：并网积分调速器把燃料压到 ≈0） | 另立 G2b |
| C-5 | 产品 | TL 线路过载故障族 | 另立 G2b |
| C-6 | 运营 | GT 热力链参考 agent 适配 + 新盲包内部场次；第三方 Agent 会话（D-13） | — |
| C-7 | 平台 | darwin64 / .dylib | 有构建环境（R-L64-03） |

## 3. v2.0.0 观察名单（V2_CONVERGENCE_PRE_RESEARCH §7——v2.0.0 暂无必要）

| # | 候选 | 触发条件 |
|---|---|---|
| W-1 | golden 格式压缩 | golden 目录 > 100 MB 或 clone 显著变慢 |
| W-2 | config 键面清理 | 列出具体遗留键清单 |
| W-3 | feedback_mode 增 baseline（additive） | 出现消费方需求 |
| W-4 | L2 评测面正式化（blind_pack v3） | 第三方 agent 接入 |
| W-5 | copy-guard SCOPES 扩张（additive） | tools/docs 出现用户可见文案风险 |
| W-6 | pow 路径 run_hash 环境相关性 | C-2 判定为跨 V8 差异 ⇒ additive 声明 |

任一触发 ⇒ 重开 V2 预研裁定章；否则不排程 v2.0.0。

## 4. 发布规程（G1 / G2 / G4——每次发布只同步 4 处）

1. **发布证据** `evidence/g8/v<版本>-release.md`——唯一事实源（门禁表、交付清单、未做项、用户侧事项）；
2. **DECISIONS 短 CHG**（DECISIONS §0 第 5 条模板，≤6 行，链接发布证据）；
3. **README 当前版本段**（`tests/version.test.js` 校验）；
4. **`src/core/version.js`**（APP_VERSION / APP_RELEASE_DATE；随后 `python tools/build.py` 重建 FaultLab.html）。

条件项（仅在发生时）：契约面真实变化 ⇒ `docs/V1_FACES.md` §24 修订索引表加一行；新增/重钉 FMU 包 ⇒ V312 钉值行；
本文件 §1/§2 随波更新。**不再**为每次发布更新 V05–V08 路线图或 V1_FACES 分节。

I-11 发布门：对上一发布提交快照 before/after 比对（`evidence/g8/i11-bitidentity/README.md` §8.1）。

## 5. 历史路线图（冻结）

`V05_ROADMAP.md`（v0.5 → v1.0）→ `V06_ROADMAP.md`（v0.6.x → v1.0.0；版本行表一直追加到 v1.18.0）→ `V07_ROADMAP.md`（v1.11 → v2.0）→ `V08_ROADMAP.md`（v1.15 → v2.0；§8 对账 / §9 收盘）。

**文件结束**。
