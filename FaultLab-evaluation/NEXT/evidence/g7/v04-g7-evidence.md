# G7 实施证据（v0.4.0 六工作项，2026-10-31，CHG-20261031-01）

> **授权**：用户 2026-10-31 指令「批准」（v0.4.0 发布规划 + 六工作项全部授权）。
> **基线**：`node tools/run-g2.mjs` 24/24（本批完成后 25/25——增 bridge/fmu-runner 两步）。
> 性质：内部一致性证据；`not_performed` 三字段不变。

## 1. 工作项交付

| # | 工作项 | 交付物 | 状态 |
|---|---|---|---|
| W-1 | GT-001 UI 深化 | 首页系统卡三档标注（基准实验/已验收(1.1.0)/扩展预览(L0b)）；`sBaselineBadge` 三档函数；系统页 badge 同步 | ✅ |
| W-2 | FC-001 UI 升正式 | FC-001 首页标注「已验收（1.1.0）」（data-tone=warm）；scope=approved_fc 分类（SA-24 仍不含 FC） | ✅ |
| W-3 | FMU ctypes runner | `tools/backend/py/fmu_runner.py`（FMI 2.0 CS 骨架：load_fmu + _define_fmi2 + run_cs + cleanup；**ctypes doStep 待实际 FMU 样本——D-27**） | ✅ 骨架 |
| W-4 | 评测轨场次扩容 | `arena2-session.mjs` 增 `--agents all`（全 Agent 参赛）+ 参赛者接入指南（下方 §3） | ✅ |
| W-5 | 对比页后端面板深化 | run picker 标签增 `[后端:backend.id]` 后缀；renderBackendNotice（跨后端 incomparable 时提示 backend.id + golden 校验引导）；renderNotices 清理旧通知 | ✅ |
| W-6 | 文档发布同步 | 版本号三处 v0.3.1 → **V0.4.0**（index.html/shell.js×3/README）；README 发布段 v0.4.0 minor | ✅ |

## 2. 验证

| 验证 | 结果 |
|---|---|
| `node tests/core.test.js` | 10080/0 |
| `node tests/arena.test.js` | 155/0 |
| `node tests/engine-gt.test.js` | 90/0 |
| `node tests/engine-fc.test.js` | 109/0 |
| `node tests/scope-guard.test.js` | 24/0 |
| `node tests/backend-admission.test.js` | 66/0 |
| `node tests/backend-bridge.test.js` | 13/0 |
| `node tests/arena-protocol-negative.test.js` | 42/0 |
| `node tests/report.test.js` | 32/0 |
| `node tests/compare.test.js` | 27/0 |
| copy-guard | 33 模式 exit 0 |
| FMU runner 自检 | FR-1…3 pass |
| 全测试套件 | **全绿** |

## 3. 偏差登记（D-28…D-29）

| # | 偏差 | 理由 |
|---|---|---|
| D-28 | W-3 FMU runner 的 ctypes doStep 路径**未经实际 FMU 验证**（无 MATLAB 导出样本） | 骨架先行合入；fmu_admission.py 的 FS-1…3 准入/拒绝路径已验证；拿到样例 FMU 后 runner 集成验证 |
| D-29 | W-5 后端通知的 renderBackendNotice 不含 run-picker 后缀——后端标签已在 selector option 中可见 | 渲染层分离；避免重复标注 |

## 4. 评测轨参赛者接入指南

### 4.1 获取盲包

```bash
python tools/backend/py/bridge.py &   # 或
node tools/arena2-session.mjs --rounds 6 --seed 20261027 --out evidence/g8/eval-session-001
```

盲包 `bundle-match.json` 含 601 点 × 盲观测通道数据（无真值）。

### 4.2 诊断与提交

参赛 Agent 读取盲包中的 `observables`（通道白名单）与 `samples`（行数组），按协议 v2 格式
产出 `diagnosis`（faultDetected/faultType/component/magnitude/detectTime_s/confidence），
组装 `submission.json`。

### 4.3 评分与复核

```bash
node tools/arena2-verify.mjs --bundle bundle-match.json \
  --submission submission.json --reveal reveal.json
```

成绩单含 `score_hash`（SHA-256 canonical_json），第三方可离线复核。

**记录人**：实现 Agent（CHG-20261031-02）。
