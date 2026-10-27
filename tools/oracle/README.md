# tools/oracle — FL-001 独立解析 oracle（G2 四件套①）

> **独立性声明**（`MODEL_VALIDATION_SPEC.md` §6.3，违反即 golden 无效）：
> 1. `fl001_oracle.py` **不** import / 复制 `src/**` 任何模块或常量；方程与参数唯一权威文本是
>    `FaultLab-evaluation/NEXT/MODEL_VALIDATION_SPEC.md` §1.2/§1.3，在 oracle 内独立硬编码。
> 2. oracle **不**与产品 engine 共享公式常量模块（共享 ⇒ golden 变成 engine 自证）。
> 3. golden **只能**由 `emit_golden.py` 生成/批准；产品 engine 对 golden **只读比对**。
> 4. oracle 自带自检（SC-1…SC-6：Simpson / RK4 / 恒等式 / 细网格能量 / 事件相位 / 网格有限性），
>    自检失败 `exit 2`。

## 文件

| 文件 | 作用 |
|---|---|
| `fl001_oracle.py` | 从 §1.3 方程独立实现 3 组 Run × 601 点 + 事件 pre/post + 解析积分 + P0 指标 |
| `emit_golden.py` | 生成 `data/golden/fl001_v1.json`（唯一写 golden 的入口）+ `.sha256` |

## 命令

```powershell
python tools/oracle/fl001_oracle.py --self-check   # 仅自检（exit 0/2）
python tools/oracle/emit_golden.py                 # 生成 golden（自检失败 exit 2）
python tools/oracle/emit_golden.py --check         # 重算并与现有 golden 比对
python scripts/verify_golden.py                    # 一键：重跑 oracle → 容差比对 golden → exit 0/1/2
```

## 退出码（`scripts/verify_golden.py`）

- `0` = 全部通过；
- `1` = 数值/容差不通过（或 golden 缺失/损坏）；
- `2` = oracle 内部自检失败。

## provenance 链

- 旧独立证据脚本：`FaultLab-evaluation/tools/verify_fl001.py`
  （SHA-256 `B60C825C390C5098E27F84101673C64B55EDCC14468C52FF3A1CCFCAAA8CFA37`，G0 评审期 Lead 实跑 exit 0）。
- 新 golden 记录 `generated_by.oracle_source_sha256`（生成时 `fl001_oracle.py` 的 SHA-256）与
  `generated_at`；`verify_golden.py` 会复核当前 oracle 源码哈希与 golden 记录一致。
- `data/golden/fl001_v1.sha256` 保存 golden 文件自身校验和（内容校验和，非签名）。
