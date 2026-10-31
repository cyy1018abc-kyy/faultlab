# v0.5.0 发布证据（2026-10-31，CHG-20261031-04）

> **授权**：用户 2026-10-31 指令（V0.5.0 规划批准 + 全队列执行「T-1/T-2→F→S→L-1→M→G7→G8」）。
> **性质**：minor 版本——FC-001 首次进入 approved_fc 发布物、评测轨多场次/接入指南/rank 排序、
> L1 可行性 RFC（Q-4 三守卫）、GT-001 UI 正式化收尾（level=L0b）；无 breaking change。
> `not_performed` 三字段不变。

## 1. 发布内容（v0.4.0 → v0.5.0）

| 项 | 来源 | 摘要 |
|---|---|---|
| GT-001 UI 正式化收尾 | CHG-20261031-03（T-1/T-2） | level='L0b · 单机等效频率响应示意（G2b 已批准）'、summary 增 G2b 声明；bus inspector f_channel_diff ✓；UI walkthrough 无错 |
| FC-001 首次正式展示 | V3-04（CHG-20261030-12） | scope=approved_fc、compare 页 FC Run 可选择、EvidenceBundle round-trip、README 系统卡 |
| 评测轨多场次 | CHG-20261031-02→03（S-1） | arena2-session.mjs 增 `--sessions N`（独立 seed/testset_id，多场次并行） |
| 评测轨接入指南 | S-2 | `EVAL_TRACK_GUIDE.md`（参赛者完整文档） |
| L1 可行性 RFC | L-1 | `L1_FEASIBILITY_RFC.md`（GT-001 非线性惯量首选 M / PyBaMM 需 G2b XL / 热模型需 G2b XL；Q-4 三守卫适用） |
| FMU 路线 | M-1/M-2（D-27 现状确认） | 准入层已交付（FS-1…3）；ctypes doStep 待实际 FMU 样本（D-28） |

## 2. 验证摘要

| 门禁 | 结果 |
|---|---|
| `node tools/run-g2.mjs` | **24/24 PASS**（duration 17673 ms；含 verify_golden 三 golden + engine-gt 90 + engine-fc 109 + bridge 13 + 准入 66 + 协议负例 42 + perf 步 + E2E 40 断言） |
| copy-guard | 33 模式 exit 0 |
| 全测试套件 | 16 文件全绿 |
| 多场次 | 2 sessions × 3 rounds，独立 testset_id ✓ |
| E2E perf | 7280 ms ≤ 15000 ms |

## 3. 发布清单

- 版本号三处同步：**V0.5.0**。
- 标签 `v0.5.0`。
- README §1 范围行改 v0.5.0 minor。
- `evidence/g8/v050-release.md`（本文件）。

## 4. 范围外

- FC-001 load_step/actuator 扩展（G2b 未启动）。
- FL-001 actuator 升正式（G2b 未启动）。
- L1 数值模型实现（L-1 RFC 批准 + G2b 后）。
- PyBaMM import（许可证待核实——Q-4 守卫 2）。
- 服务端/云/账户/排行榜（永久不做）。

**记录人**：实现 Agent（CHG-20261031-04）。本文件为 minor 发布证据，不构成模型验证/硬件验证。
