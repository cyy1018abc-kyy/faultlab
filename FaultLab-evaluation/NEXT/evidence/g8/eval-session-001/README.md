# 评测场次 001（eval-session-001）— 评测轨首个端到端场次归档

> **生成**：`node tools/arena2-session.mjs --rounds 6 --seed 20261027 --noise
>   --out evidence/g8/eval-session-001`（2026-10-30，CHG-20261030-11）。
> **性质**：合成故障评测游戏场次的完整留痕（盲包 + reveal + 提交 + 成绩单）；
> 评分=游戏分，**非真实诊断性能**；reveal 含真值，仅赛后公布。

## 文件清单

| 文件 | 内容 |
|---|---|
| `bundle-match.json` | 盲包 v2（match.v2，6 轮，closed-world，零真值，零墙钟字段） |
| `reveal.json` | 组织方保管件（set_seed + match_id→truth 映射 + scoring_rules_spec） |
| `submission-*.json` | 3 份参赛提交（builtin/sensor-limit、builtin/residual、builtin/cusum） |
| `score-report-*.json` | 3 份成绩单（分项十进制串 + score_hash 落章） |

## 场次结论（游戏分）

| 参赛 | 场均 | 备注 |
|---|---|---|
| builtin/sensor-limit | 46 | 基于指令-测量差阈值的简单基线 |
| builtin/residual | 99.2 | 残差 EMA 主导——对 sensor_drift 高敏感 |
| builtin/cusum | 98.8 | CUSUM 变点检测——负载冲击场景下有误报扣分 |

## 复核方式

1. 读取本目录 `reveal.json`（赛后公布）+ `bundle-match.json`；
2. 对每份 `submission-*.json` 运行 `node tools/arena2-verify.mjs --bundle bundle-match.json
   --submission submission-XX.json --reveal reveal.json`；
3. 核对 score_hash 与 score-report-XX.json 一致。
