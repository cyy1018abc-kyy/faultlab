# V1140_WAVE_DESIGN — v1.14.0 波设计（运营首场落地 + 残留清算 + additive minor 发布）

> **性质**：阶段设计文档（Lead 起草，2026-11-19）——V1130 波（fcc7077）后首波。
> **授权记录（CHG-20261119-05）**：用户 2026-11-19 指令「进入下一轮」——V07_ROADMAP §3
> v1.14.0 行按序承接——**DEC-1…3 全采推荐项**。

---

## 0. 本波边界

**做**：
1. **eval-session-003 完整会话执行**：GT-001 L2 盲包（V1130 已生成）→ agent-mcp-client
   实调（盲观测探查 + 判读 + 封存提交）→ arena2-verify 落章归档——**GT-001 热力链盲判读
   首场**（eval-session-002 为 FL-001 电池链先例——盲包数据面从 FL 切换 GT 的 agent 适配
   面验证）；
2. **残留清算**：登记并处置跨波残留面——`--run-gt001` runner `--out` 补齐（与 `--run-fc001`
   对称——parity 脚本 stdout 解析先例对称化）；gt001_fmu_parity.py `import tempfile` 位域
   正常化；fc001_fmu_parity.py 同款——均为 additive 级，不触既有语义；
3. **v1.14.0 发布**：additive minor（+运营面归档 + 代码面 additive 清算——八面冻结维持）。

**不做**：TL-001 立项（R-TL-01..04 留用户）；linux64 平台矩阵（A-7 后补）；C3（挂起维持）；
v2.0.0 breaking 窗口（D-10 远期另行授权）。

**版本**：v1.14.0（MINOR——运营面归档 + additive 清算；零 breaking）。

## 1. 决策点（全采推荐项）

### DEC-1：eval-session-003 = GT-001 L2 盲判读首场
**采纳（推荐）**：eval-session-002 先例同构（MCP 客户端 + 盲观测 + verify 落章）；GT 热力链
盲包 3 局（11 通道/602 行/beacon 31 行——V1130 B-6 已生成）——agent 判读面从 FL 电池链
（8 通道）扩展到 GT 热力链（11 通道含热力 8 列）——盲包数据面适配验证。

### DEC-2：残留清算 = additive 级对称化 + 位域正常化
**采纳（推荐）**：`--run-gt001` `--out` 补齐（与 `--run-fc001` 对称——parity 脚本兼容两模式）
+ `import tempfile` 位域移至文件头（fc001/gt001 两 parity 脚本同步）——均 additive 零语义
变更（既有 parity 脚本步 36/37 行为逐字节不变）。

### DEC-3：版本面 + 三不承诺
**采纳（推荐）**：run-g2 37→37 零增步；既有 15 golden 字节零触碰；五类哈希既有输入零变化。

## 2. 波次派发

```text
S1 eval-session-003 完整会话（主线——盲包已生成，agent 脚本适配 GT 通道面）
S2 残留清算（主线——对称化 additive）
S3 门禁（build ×2 + run-g2 ×2 + copy-guard + verify_golden 全行）
S4 收口（v1140-release.md + V1_FACES §20 + roadmap v1.14.0 + CHG-20261119-06 + commit + push）
```

## 3. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | GT 热力链盲判读质量 | 盲包 27 列含 T3/T4/Q_fuel 热力信号——agent 变点检测天然覆盖频率+热力双面 |
| 2 | 残留清算触既有语义 | additive 零语义变更纪律 + parity 脚本 36/37 步回归兜底 |

**文件结束**。V1140_WAVE_DESIGN v1（2026-11-19，CHG-20261119-05 批准，按推荐执行）。
